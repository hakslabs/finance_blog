"""Public read + admin write of site_notices."""

from __future__ import annotations

from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth import CurrentUser, get_current_user_id
from app.settings import Settings, get_settings


router = APIRouter(prefix="/notices", tags=["notices"])


class Notice(BaseModel):
    id: str
    tag: str
    title: str
    description: Optional[str] = None
    published_at: str


class NoticesResponse(BaseModel):
    items: List[Notice]


class NoticeCreate(BaseModel):
    tag: str = Field("공지사항", min_length=1, max_length=40)
    title: str = Field(..., min_length=1, max_length=240)
    description: Optional[str] = Field(None, max_length=2000)


def _require_admin(
    user: CurrentUser = Depends(get_current_user_id),
    settings: Settings = Depends(get_settings),
) -> CurrentUser:
    email = (user.email or "").lower()
    if not email or email not in [a.lower() for a in settings.admin_emails]:
        raise HTTPException(status_code=403, detail="forbidden")
    return user


@router.post("", response_model=Notice)
async def create_notice(
    body: NoticeCreate,
    _admin: CurrentUser = Depends(_require_admin),
    settings: Settings = Depends(get_settings),
) -> Notice:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(status_code=503, detail="upstream_unavailable")
    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    async with httpx.AsyncClient(timeout=8.0, headers=headers) as client:
        resp = await client.post(f"{settings.supabase_url.rstrip('/')}/rest/v1/site_notices", json=payload)
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.text[:200])
        rows = resp.json()
    if not rows:
        raise HTTPException(status_code=500, detail="empty_insert")
    return Notice(**rows[0])


@router.get("", response_model=NoticesResponse)
async def list_notices(settings: Settings = Depends(get_settings)) -> NoticesResponse:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return NoticesResponse(items=[])
    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Accept": "application/json",
    }
    async with httpx.AsyncClient(timeout=6.0, headers=headers) as client:
        resp = await client.get(
            f"{settings.supabase_url.rstrip('/')}/rest/v1/site_notices",
            params={
                "select": "id,tag,title,description,published_at",
                "is_active": "eq.true",
                "order": "published_at.desc",
                "limit": "5",
            },
        )
        if resp.status_code >= 400:
            return NoticesResponse(items=[])
    return NoticesResponse(items=[Notice(**r) for r in resp.json()])
