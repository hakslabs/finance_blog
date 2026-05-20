"""Admin-gated endpoints: user management + broadcast notifications.

Admin gating is enforced by RLS (profiles.role in ('admin','superadmin')) when
operating via user JWT. These endpoints proxy to Supabase REST using the
caller's bearer token so RLS does the policy check.
"""
from __future__ import annotations

from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Path
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.settings import Settings, get_settings


router = APIRouter(prefix="/admin", tags=["admin"])
bearer = HTTPBearer(auto_error=False)


def _require_bearer(creds: HTTPAuthorizationCredentials | None = Depends(bearer)) -> str:
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(401, "unauthenticated")
    return creds.credentials


def _user_headers(token: str, settings: Settings):
    if not settings.supabase_url:
        raise HTTPException(503, "upstream_unavailable")
    return {
        "apikey": settings.supabase_service_role_key or "",
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }


# ── users ──────────────────────────────────────────────────────────
class AdminUser(BaseModel):
    id: str
    email: Optional[str] = None
    display_name: str
    role: str
    plan: Optional[str] = None
    created_at: Optional[str] = None


class UsersResponse(BaseModel):
    items: List[AdminUser]


class UserPatch(BaseModel):
    role: Optional[str] = None


@router.get("/users", response_model=UsersResponse)
async def list_users(
    limit: int = 200,
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> UsersResponse:
    base = settings.supabase_url.rstrip("/")
    async with httpx.AsyncClient(timeout=8.0, headers=_user_headers(token, settings)) as c:
        r = await c.get(f"{base}/rest/v1/profiles",
                        params={"select": "id,email,display_name,role,preferences,created_at",
                                "order": "created_at.desc",
                                "limit": str(limit)})
        if r.status_code == 401 or r.status_code == 403:
            raise HTTPException(403, "forbidden")
        if r.status_code >= 400:
            raise HTTPException(r.status_code, r.text[:200])
    return UsersResponse(items=[
        AdminUser(
            id=row["id"], email=row.get("email"),
            display_name=row.get("display_name", ""),
            role=row.get("role", "user"),
            plan=(row.get("preferences") or {}).get("plan"),
            created_at=row.get("created_at"),
        )
        for row in r.json()
    ])


@router.patch("/users/{user_id}", response_model=AdminUser)
async def update_user(
    body: UserPatch,
    user_id: str = Path(...),
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> AdminUser:
    if not body.role:
        raise HTTPException(400, "nothing_to_update")
    base = settings.supabase_url.rstrip("/")
    headers = {**_user_headers(token, settings),
               "Content-Type": "application/json",
               "Prefer": "return=representation"}
    async with httpx.AsyncClient(timeout=8.0, headers=headers) as c:
        r = await c.patch(f"{base}/rest/v1/profiles",
                          params={"id": f"eq.{user_id}"},
                          json={"role": body.role})
        if r.status_code in (401, 403):
            raise HTTPException(403, "forbidden")
        if r.status_code >= 400:
            raise HTTPException(r.status_code, r.text[:200])
        rows = r.json()
    if not rows:
        raise HTTPException(404, "user_not_found")
    row = rows[0]
    return AdminUser(
        id=row["id"], email=row.get("email"),
        display_name=row.get("display_name", ""),
        role=row.get("role", "user"),
        plan=(row.get("preferences") or {}).get("plan"),
        created_at=row.get("created_at"),
    )


# ── broadcasts ─────────────────────────────────────────────────────
class Broadcast(BaseModel):
    id: str
    title: str
    body: str
    audience: str
    scheduled_at: Optional[str] = None
    sent_at: Optional[str] = None
    created_at: str


class BroadcastsResponse(BaseModel):
    items: List[Broadcast]


class BroadcastIn(BaseModel):
    title: str
    body: str
    audience: str = "all"
    scheduled_at: Optional[str] = None


@router.get("/broadcasts", response_model=BroadcastsResponse)
async def list_broadcasts(
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> BroadcastsResponse:
    base = settings.supabase_url.rstrip("/")
    async with httpx.AsyncClient(timeout=8.0, headers=_user_headers(token, settings)) as c:
        r = await c.get(f"{base}/rest/v1/admin_broadcasts",
                        params={"select": "*", "order": "created_at.desc", "limit": "100"})
        if r.status_code in (401, 403):
            raise HTTPException(403, "forbidden")
        if r.status_code >= 400:
            return BroadcastsResponse(items=[])
    return BroadcastsResponse(items=[Broadcast(**row) for row in r.json()])


@router.post("/broadcasts", response_model=Broadcast, status_code=201)
async def create_broadcast(
    body: BroadcastIn,
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> Broadcast:
    base = settings.supabase_url.rstrip("/")
    headers = {**_user_headers(token, settings),
               "Content-Type": "application/json",
               "Prefer": "return=representation"}
    async with httpx.AsyncClient(timeout=8.0, headers=headers) as c:
        r = await c.post(f"{base}/rest/v1/admin_broadcasts", json=body.model_dump(exclude_none=True))
        if r.status_code in (401, 403):
            raise HTTPException(403, "forbidden")
        if r.status_code >= 400:
            raise HTTPException(r.status_code, r.text[:200])
        rows = r.json()
    return Broadcast(**rows[0])
