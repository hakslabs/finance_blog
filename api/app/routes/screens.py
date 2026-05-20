"""Per-user saved screens (owner-RLS). Filters stored as opaque JSON."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Path
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from app.settings import Settings, get_settings


router = APIRouter(prefix="/me/screens", tags=["screens"])
bearer = HTTPBearer(auto_error=False)


class Screen(BaseModel):
    id: str
    name: str
    filters: Dict[str, Any]
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class ScreensResponse(BaseModel):
    items: List[Screen]


class ScreenCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    filters: Dict[str, Any] = Field(default_factory=dict)


class ScreenPatch(BaseModel):
    name: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None


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


@router.get("", response_model=ScreensResponse)
async def list_screens(
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> ScreensResponse:
    base = await _sb_url(settings)
    async with httpx.AsyncClient(timeout=8.0, headers=_user_headers(token, settings)) as client:
        resp = await client.get(
            f"{base}/rest/v1/screens",
            params={
                "select": "id,name,filters,created_at,updated_at",
                "order": "updated_at.desc",
                "limit": "200",
            },
        )
        if resp.status_code >= 400:
            return ScreensResponse(items=[])
    return ScreensResponse(items=[Screen(**r) for r in resp.json()])


@router.post("", response_model=Screen)
async def create_screen(
    body: ScreenCreate,
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> Screen:
    base = await _sb_url(settings)
    headers = {
        **_user_headers(token, settings),
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    async with httpx.AsyncClient(timeout=8.0, headers=headers) as client:
        resp = await client.post(
            f"{base}/rest/v1/screens",
            json={"name": body.name, "filters": body.filters},
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.text[:200])
        rows = resp.json()
    if not rows:
        raise HTTPException(status_code=500, detail="no_row_returned")
    return Screen(**rows[0])


@router.patch("/{screen_id}", response_model=Screen)
async def patch_screen(
    body: ScreenPatch,
    screen_id: str = Path(..., min_length=1),
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> Screen:
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
            f"{base}/rest/v1/screens",
            params={"id": f"eq.{screen_id}"},
            json=payload,
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.text[:200])
        rows = resp.json()
    if not rows:
        raise HTTPException(status_code=404, detail="not_found")
    return Screen(**rows[0])


@router.delete("/{screen_id}")
async def delete_screen(
    screen_id: str = Path(..., min_length=1),
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> dict:
    base = await _sb_url(settings)
    async with httpx.AsyncClient(timeout=8.0, headers=_user_headers(token, settings)) as client:
        resp = await client.delete(
            f"{base}/rest/v1/screens",
            params={"id": f"eq.{screen_id}"},
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.text[:200])
    return {"deleted": screen_id}
