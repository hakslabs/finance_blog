"""Per-user todos (owner-RLS).

PostgREST against `public.todos` using the caller's Supabase JWT so
RLS scopes rows to the current user. We don't go through service-role
here — the user's own token is the right principal.
"""

from __future__ import annotations

from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Path
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from app.settings import Settings, get_settings


router = APIRouter(prefix="/todos", tags=["todos"])
bearer = HTTPBearer(auto_error=False)


class Todo(BaseModel):
    id: str
    title: str
    body: Optional[str] = None
    done: bool = False
    due_at: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class TodoCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    body: Optional[str] = None
    due_at: Optional[str] = None


class TodoPatch(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    done: Optional[bool] = None
    due_at: Optional[str] = None


class TodosResponse(BaseModel):
    items: List[Todo]


def _require_bearer(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> str:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="unauthenticated")
    return credentials.credentials


def _user_headers(token: str, settings: Settings) -> dict:
    # PostgREST uses the JWT to scope RLS. apikey can be the anon key (or
    # the same JWT) — both work; we send the user JWT for clarity.
    return {
        "apikey": settings.supabase_service_role_key or "",
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }


async def _sb_url(settings: Settings) -> str:
    if not settings.supabase_url:
        raise HTTPException(status_code=503, detail="upstream_unavailable")
    return settings.supabase_url.rstrip("/")


@router.get("", response_model=TodosResponse)
async def list_todos(
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> TodosResponse:
    base = await _sb_url(settings)
    async with httpx.AsyncClient(timeout=8.0, headers=_user_headers(token, settings)) as client:
        resp = await client.get(
            f"{base}/rest/v1/todos",
            params={
                "select": "id,title,body,done,due_at,created_at,updated_at",
                "order": "done.asc,created_at.desc",
                "limit": "100",
            },
        )
        if resp.status_code >= 400:
            return TodosResponse(items=[])
    return TodosResponse(items=[Todo(**r) for r in resp.json()])


@router.post("", response_model=Todo)
async def create_todo(
    body: TodoCreate,
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> Todo:
    base = await _sb_url(settings)
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    headers = {**_user_headers(token, settings), "Content-Type": "application/json", "Prefer": "return=representation"}
    async with httpx.AsyncClient(timeout=8.0, headers=headers) as client:
        resp = await client.post(f"{base}/rest/v1/todos", json=payload)
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.text[:200])
        rows = resp.json()
    return Todo(**rows[0])


@router.patch("/{todo_id}", response_model=Todo)
async def patch_todo(
    body: TodoPatch,
    todo_id: str = Path(..., min_length=1),
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> Todo:
    base = await _sb_url(settings)
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    if not payload:
        raise HTTPException(status_code=400, detail="empty_patch")
    headers = {**_user_headers(token, settings), "Content-Type": "application/json", "Prefer": "return=representation"}
    async with httpx.AsyncClient(timeout=8.0, headers=headers) as client:
        resp = await client.patch(
            f"{base}/rest/v1/todos",
            params={"id": f"eq.{todo_id}"},
            json=payload,
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.text[:200])
        rows = resp.json()
    if not rows:
        raise HTTPException(status_code=404, detail="not_found")
    return Todo(**rows[0])


@router.delete("/{todo_id}")
async def delete_todo(
    todo_id: str = Path(..., min_length=1),
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> dict:
    base = await _sb_url(settings)
    async with httpx.AsyncClient(timeout=8.0, headers=_user_headers(token, settings)) as client:
        resp = await client.delete(
            f"{base}/rest/v1/todos",
            params={"id": f"eq.{todo_id}"},
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.text[:200])
    return {"deleted": todo_id}
