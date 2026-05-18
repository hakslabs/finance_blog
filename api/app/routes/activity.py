"""User activity log (owner-RLS).

Uses the user's JWT against PostgREST so RLS scopes rows.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from app.settings import Settings, get_settings


router = APIRouter(prefix="/activity", tags=["activity"])
bearer = HTTPBearer(auto_error=False)


class ActivityRow(BaseModel):
    id: str
    kind: str
    payload: Dict[str, Any] = {}
    created_at: str


class ActivityResponse(BaseModel):
    items: List[ActivityRow]


class ActivityCreate(BaseModel):
    kind: str = Field(..., min_length=1, max_length=64)
    payload: Optional[Dict[str, Any]] = None


def _require(c: HTTPAuthorizationCredentials | None = Depends(bearer)) -> str:
    if c is None or c.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="unauthenticated")
    return c.credentials


def _h(t: str, s: Settings) -> Dict[str, str]:
    return {
        "apikey": s.supabase_service_role_key or "",
        "Authorization": f"Bearer {t}",
        "Accept": "application/json",
    }


@router.get("", response_model=ActivityResponse)
async def list_activity(
    token: str = Depends(_require),
    settings: Settings = Depends(get_settings),
) -> ActivityResponse:
    if not settings.supabase_url:
        return ActivityResponse(items=[])
    base = settings.supabase_url.rstrip("/")
    async with httpx.AsyncClient(timeout=6.0, headers=_h(token, settings)) as client:
        resp = await client.get(
            f"{base}/rest/v1/activity_log",
            params={
                "select": "id,kind,payload,created_at",
                "order": "created_at.desc",
                "limit": "50",
            },
        )
        if resp.status_code >= 400:
            return ActivityResponse(items=[])
    return ActivityResponse(items=[ActivityRow(**r) for r in resp.json()])


@router.post("", response_model=ActivityRow)
async def create_activity(
    body: ActivityCreate,
    token: str = Depends(_require),
    settings: Settings = Depends(get_settings),
) -> ActivityRow:
    base = settings.supabase_url.rstrip("/") if settings.supabase_url else ""
    payload = {"kind": body.kind, "payload": body.payload or {}}
    headers = {**_h(token, settings), "Content-Type": "application/json", "Prefer": "return=representation"}
    async with httpx.AsyncClient(timeout=6.0, headers=headers) as client:
        resp = await client.post(f"{base}/rest/v1/activity_log", json=payload)
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.text[:200])
        rows = resp.json()
    return ActivityRow(**rows[0])
