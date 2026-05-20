"""Polymorphic per-user bookmarks (owner-RLS).

Backed by public.saved_items(user_id, kind, target_id). Forwards the
caller's Supabase JWT to PostgREST so RLS scopes rows to the user.
"""

from __future__ import annotations

from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Path
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from app.settings import Settings, get_settings


router = APIRouter(prefix="/me/bookmarks", tags=["bookmarks"])
bearer = HTTPBearer(auto_error=False)

VALID_KINDS = {"report", "guide", "news", "stock", "master"}


class SavedItem(BaseModel):
    kind: str
    target_id: str
    note: Optional[str] = None
    saved_at: Optional[str] = None


class BookmarksResponse(BaseModel):
    items: List[SavedItem]


class BookmarkCreate(BaseModel):
    kind: str = Field(..., min_length=1)
    target_id: str = Field(..., min_length=1)
    note: Optional[str] = None


def _require_bearer(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> str:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="unauthenticated")
    return credentials.credentials


def _user_headers(token: str, settings: Settings) -> dict:
    return {
        "apikey": settings.supabase_service_role_key or "",
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }


async def _sb_url(settings: Settings) -> str:
    if not settings.supabase_url:
        raise HTTPException(status_code=503, detail="upstream_unavailable")
    return settings.supabase_url.rstrip("/")


def _validate_kind(kind: str) -> None:
    if kind not in VALID_KINDS:
        raise HTTPException(status_code=400, detail="invalid_kind")


@router.get("", response_model=BookmarksResponse)
async def list_bookmarks(
    kind: Optional[str] = None,
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> BookmarksResponse:
    base = await _sb_url(settings)
    params: dict = {
        "select": "kind,target_id,note,saved_at",
        "order": "saved_at.desc",
        "limit": "1000",
    }
    if kind is not None:
        _validate_kind(kind)
        params["kind"] = f"eq.{kind}"
    async with httpx.AsyncClient(timeout=8.0, headers=_user_headers(token, settings)) as client:
        resp = await client.get(f"{base}/rest/v1/saved_items", params=params)
        if resp.status_code >= 400:
            return BookmarksResponse(items=[])
    return BookmarksResponse(items=[SavedItem(**r) for r in resp.json()])


@router.post("", response_model=SavedItem)
async def add_bookmark(
    body: BookmarkCreate,
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> SavedItem:
    _validate_kind(body.kind)
    base = await _sb_url(settings)
    payload = {"kind": body.kind, "target_id": body.target_id}
    if body.note is not None:
        payload["note"] = body.note
    headers = {
        **_user_headers(token, settings),
        "Content-Type": "application/json",
        "Prefer": "return=representation,resolution=merge-duplicates",
    }
    async with httpx.AsyncClient(timeout=8.0, headers=headers) as client:
        resp = await client.post(f"{base}/rest/v1/saved_items", json=payload)
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.text[:200])
        rows = resp.json()
    if not rows:
        raise HTTPException(status_code=500, detail="no_row_returned")
    return SavedItem(**rows[0])


@router.delete("/{kind}/{target_id}")
async def remove_bookmark(
    kind: str = Path(..., min_length=1),
    target_id: str = Path(..., min_length=1),
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> dict:
    _validate_kind(kind)
    base = await _sb_url(settings)
    async with httpx.AsyncClient(timeout=8.0, headers=_user_headers(token, settings)) as client:
        resp = await client.delete(
            f"{base}/rest/v1/saved_items",
            params={"kind": f"eq.{kind}", "target_id": f"eq.{target_id}"},
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.text[:200])
    return {"removed": {"kind": kind, "target_id": target_id}}
