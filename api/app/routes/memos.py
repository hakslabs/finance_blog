"""Per-user memos (owner-RLS).

Polymorphic via target_kind ∈ {instrument, transaction, report, master, news, filing}.
Used for trade journals, position notes, and free-form annotations.
"""

from __future__ import annotations

from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from app.settings import Settings, get_settings


router = APIRouter(prefix="/me/memos", tags=["memos"])
bearer = HTTPBearer(auto_error=False)

VALID_KINDS = {"instrument", "transaction", "report", "master", "news", "filing"}


class Memo(BaseModel):
    id: str
    target_kind: str
    target_id: Optional[str] = None
    body: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class MemosResponse(BaseModel):
    items: List[Memo]


class MemoCreate(BaseModel):
    target_kind: str = Field(..., min_length=1)
    target_id: Optional[str] = None
    body: str = Field(..., min_length=1)


class MemoPatch(BaseModel):
    body: Optional[str] = None


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
        raise HTTPException(status_code=400, detail="invalid_target_kind")


@router.get("", response_model=MemosResponse)
async def list_memos(
    target_kind: Optional[str] = Query(default=None),
    target_id: Optional[str] = Query(default=None),
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> MemosResponse:
    base = await _sb_url(settings)
    params: dict = {
        "select": "id,target_kind,target_id,body,created_at,updated_at",
        "order": "created_at.desc",
        "limit": "1000",
    }
    if target_kind is not None:
        _validate_kind(target_kind)
        params["target_kind"] = f"eq.{target_kind}"
    if target_id is not None:
        params["target_id"] = f"eq.{target_id}"
    async with httpx.AsyncClient(timeout=8.0, headers=_user_headers(token, settings)) as client:
        resp = await client.get(f"{base}/rest/v1/memos", params=params)
        if resp.status_code >= 400:
            return MemosResponse(items=[])
    return MemosResponse(items=[Memo(**r) for r in resp.json()])


@router.post("", response_model=Memo)
async def create_memo(
    body: MemoCreate,
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> Memo:
    _validate_kind(body.target_kind)
    base = await _sb_url(settings)
    payload: dict = {"target_kind": body.target_kind, "body": body.body}
    if body.target_id is not None:
        payload["target_id"] = body.target_id
    headers = {
        **_user_headers(token, settings),
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    async with httpx.AsyncClient(timeout=8.0, headers=headers) as client:
        resp = await client.post(f"{base}/rest/v1/memos", json=payload)
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.text[:200])
        rows = resp.json()
    if not rows:
        raise HTTPException(status_code=500, detail="no_row_returned")
    return Memo(**rows[0])


@router.patch("/{memo_id}", response_model=Memo)
async def patch_memo(
    body: MemoPatch,
    memo_id: str = Path(..., min_length=1),
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> Memo:
    base = await _sb_url(settings)
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    if not payload:
        raise HTTPException(status_code=400, detail="empty_patch")
    headers = {
        **_user_headers(token, settings),
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    async with httpx.AsyncClient(timeout=8.0, headers=headers) as client:
        resp = await client.patch(
            f"{base}/rest/v1/memos",
            params={"id": f"eq.{memo_id}"},
            json=payload,
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.text[:200])
        rows = resp.json()
    if not rows:
        raise HTTPException(status_code=404, detail="not_found")
    return Memo(**rows[0])


@router.delete("/{memo_id}")
async def delete_memo(
    memo_id: str = Path(..., min_length=1),
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> dict:
    base = await _sb_url(settings)
    async with httpx.AsyncClient(timeout=8.0, headers=_user_headers(token, settings)) as client:
        resp = await client.delete(
            f"{base}/rest/v1/memos",
            params={"id": f"eq.{memo_id}"},
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.text[:200])
    return {"deleted": memo_id}
