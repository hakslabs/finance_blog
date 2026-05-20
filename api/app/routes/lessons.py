"""Per-user lesson progress (owner-RLS)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Path
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from app.settings import Settings, get_settings


router = APIRouter(prefix="/me/lesson-progress", tags=["lessons"])
bearer = HTTPBearer(auto_error=False)


class LessonProgress(BaseModel):
    lesson_id: str
    completed: bool
    completed_at: Optional[str] = None
    updated_at: Optional[str] = None


class LessonProgressResponse(BaseModel):
    items: List[LessonProgress]


class LessonProgressUpsert(BaseModel):
    completed: bool = Field(...)


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


@router.get("", response_model=LessonProgressResponse)
async def list_progress(
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> LessonProgressResponse:
    base = await _sb_url(settings)
    async with httpx.AsyncClient(timeout=8.0, headers=_user_headers(token, settings)) as client:
        resp = await client.get(
            f"{base}/rest/v1/lesson_progress",
            params={
                "select": "lesson_id,completed,completed_at,updated_at",
                "order": "updated_at.desc",
                "limit": "1000",
            },
        )
        if resp.status_code >= 400:
            return LessonProgressResponse(items=[])
    return LessonProgressResponse(items=[LessonProgress(**r) for r in resp.json()])


@router.put("/{lesson_id}", response_model=LessonProgress)
async def upsert_progress(
    body: LessonProgressUpsert,
    lesson_id: str = Path(..., min_length=1),
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> LessonProgress:
    base = await _sb_url(settings)
    payload: dict = {
        "lesson_id": lesson_id,
        "completed": body.completed,
    }
    if body.completed:
        payload["completed_at"] = datetime.now(tz=timezone.utc).isoformat()
    else:
        payload["completed_at"] = None
    headers = {
        **_user_headers(token, settings),
        "Content-Type": "application/json",
        "Prefer": "return=representation,resolution=merge-duplicates",
    }
    async with httpx.AsyncClient(timeout=8.0, headers=headers) as client:
        resp = await client.post(f"{base}/rest/v1/lesson_progress", json=payload)
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.text[:200])
        rows = resp.json()
    if not rows:
        raise HTTPException(status_code=500, detail="no_row_returned")
    return LessonProgress(**rows[0])
