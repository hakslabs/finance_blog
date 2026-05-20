"""Per-user notifications (owner-RLS).

Backed by public.notifications. Read-mostly: list + mark-read endpoints.
Writes (creating notifications) come from server-side jobs (alerts firing,
follow-feed updates, etc.) using service-role — not exposed to clients.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Path
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.settings import Settings, get_settings


router = APIRouter(prefix="/me/notifications", tags=["notifications"])
bearer = HTTPBearer(auto_error=False)


class Notification(BaseModel):
    id: str
    kind: str
    title: str
    body: Optional[str] = None
    link: Optional[str] = None
    read_at: Optional[str] = None
    created_at: str


class NotificationsResponse(BaseModel):
    items: List[Notification]
    unread_count: int


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


@router.get("", response_model=NotificationsResponse)
async def list_notifications(
    limit: int = 50,
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> NotificationsResponse:
    base = await _sb_url(settings)
    async with httpx.AsyncClient(timeout=8.0, headers=_user_headers(token, settings)) as client:
        resp = await client.get(
            f"{base}/rest/v1/notifications",
            params={
                "select": "id,kind,title,body,link,read_at,created_at",
                "order": "created_at.desc",
                "limit": str(max(1, min(limit, 200))),
            },
        )
        if resp.status_code >= 400:
            return NotificationsResponse(items=[], unread_count=0)
        items = [Notification(**r) for r in resp.json()]
    unread = sum(1 for n in items if n.read_at is None)
    return NotificationsResponse(items=items, unread_count=unread)


@router.patch("/{notification_id}/read", response_model=Notification)
async def mark_read(
    notification_id: str = Path(..., min_length=1),
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> Notification:
    base = await _sb_url(settings)
    payload = {"read_at": datetime.now(tz=timezone.utc).isoformat()}
    headers = {
        **_user_headers(token, settings),
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    async with httpx.AsyncClient(timeout=8.0, headers=headers) as client:
        resp = await client.patch(
            f"{base}/rest/v1/notifications",
            params={"id": f"eq.{notification_id}"},
            json=payload,
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.text[:200])
        rows = resp.json()
    if not rows:
        raise HTTPException(status_code=404, detail="not_found")
    return Notification(**rows[0])


@router.patch("/read-all")
async def mark_all_read(
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> dict:
    base = await _sb_url(settings)
    payload = {"read_at": datetime.now(tz=timezone.utc).isoformat()}
    headers = {
        **_user_headers(token, settings),
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    async with httpx.AsyncClient(timeout=8.0, headers=headers) as client:
        resp = await client.patch(
            f"{base}/rest/v1/notifications",
            params={"read_at": "is.null"},
            json=payload,
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.text[:200])
    return {"marked_read": True}
