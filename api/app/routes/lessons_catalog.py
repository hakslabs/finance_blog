"""Public learn content (chapters + lessons) + quiz attempt recording."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Path
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.settings import Settings, get_settings


router = APIRouter(tags=["learn"])
bearer = HTTPBearer(auto_error=False)


class LessonSummary(BaseModel):
    id: str
    chapter_id: str
    title: str
    description: Optional[str] = None
    level: str
    read_time: int
    tags: Optional[List[str]] = None
    position: int
    is_popular: bool
    is_locked: bool


class LessonFull(LessonSummary):
    content: Optional[str] = None
    quiz: Optional[List[Dict[str, Any]]] = None


class Chapter(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    category: str
    position: int


class ChaptersResponse(BaseModel):
    items: List[Chapter]


class LessonsResponse(BaseModel):
    items: List[LessonSummary]


class QuizAttemptIn(BaseModel):
    score: int
    total_questions: int
    correct_count: int
    answers: Optional[List[int]] = None


class QuizAttemptOut(BaseModel):
    id: str
    score: int


def _service_headers(settings: Settings) -> Dict[str, str]:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(503, "upstream_unavailable")
    key = settings.supabase_service_role_key
    return {"apikey": key, "Authorization": f"Bearer {key}", "Accept": "application/json"}


def _require_bearer(creds: HTTPAuthorizationCredentials | None = Depends(bearer)) -> str:
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(401, "unauthenticated")
    return creds.credentials


def _user_headers(token: str, settings: Settings) -> Dict[str, str]:
    if not settings.supabase_url:
        raise HTTPException(503, "upstream_unavailable")
    return {
        "apikey": settings.supabase_service_role_key or "",
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }


@router.get("/lessons/chapters", response_model=ChaptersResponse)
async def list_chapters(settings: Settings = Depends(get_settings)) -> ChaptersResponse:
    base = settings.supabase_url.rstrip("/")
    async with httpx.AsyncClient(timeout=8.0, headers=_service_headers(settings)) as c:
        r = await c.get(f"{base}/rest/v1/learn_chapters",
                        params={"select": "id,title,description,category,position", "order": "position.asc"})
        if r.status_code >= 400:
            return ChaptersResponse(items=[])
    return ChaptersResponse(items=[Chapter(**row) for row in r.json()])


@router.get("/lessons", response_model=LessonsResponse)
async def list_lessons(
    chapter_id: Optional[str] = None,
    settings: Settings = Depends(get_settings),
) -> LessonsResponse:
    base = settings.supabase_url.rstrip("/")
    params: Dict[str, str] = {
        "select": "id,chapter_id,title,description,level,read_time,tags,position,is_popular,is_locked",
        "order": "chapter_id.asc,position.asc",
        "limit": "1000",
    }
    if chapter_id:
        params["chapter_id"] = f"eq.{chapter_id}"
    async with httpx.AsyncClient(timeout=8.0, headers=_service_headers(settings)) as c:
        r = await c.get(f"{base}/rest/v1/learn_lessons", params=params)
        if r.status_code >= 400:
            return LessonsResponse(items=[])
    return LessonsResponse(items=[LessonSummary(**row) for row in r.json()])


@router.get("/lessons/{lesson_id}", response_model=LessonFull)
async def get_lesson(
    lesson_id: str = Path(..., min_length=1),
    settings: Settings = Depends(get_settings),
) -> LessonFull:
    base = settings.supabase_url.rstrip("/")
    async with httpx.AsyncClient(timeout=8.0, headers=_service_headers(settings)) as c:
        r = await c.get(f"{base}/rest/v1/learn_lessons",
                        params={"select": "*", "id": f"eq.{lesson_id}", "limit": "1"})
        if r.status_code >= 400 or not r.json():
            raise HTTPException(404, "lesson_not_found")
    return LessonFull(**r.json()[0])


@router.post("/me/lessons/{lesson_id}/quiz", response_model=QuizAttemptOut)
async def submit_quiz_attempt(
    body: QuizAttemptIn,
    lesson_id: str = Path(..., min_length=1),
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> QuizAttemptOut:
    base = settings.supabase_url.rstrip("/")
    payload = {"lesson_id": lesson_id, **body.model_dump(exclude_none=True)}
    headers = {**_user_headers(token, settings),
               "Content-Type": "application/json",
               "Prefer": "return=representation"}
    async with httpx.AsyncClient(timeout=8.0, headers=headers) as c:
        r = await c.post(f"{base}/rest/v1/learn_quiz_attempts", json=payload)
        if r.status_code >= 400:
            raise HTTPException(r.status_code, r.text[:200])
        row = r.json()[0]
    return QuizAttemptOut(id=row["id"], score=row["score"])
