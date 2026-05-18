"""Public read of site_notices."""

from __future__ import annotations

from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel

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
