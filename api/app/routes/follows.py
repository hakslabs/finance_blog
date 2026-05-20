"""Per-user master follows (owner-RLS).

Pattern mirrors routes/todos.py: forward the caller's Supabase JWT to
PostgREST so RLS scopes rows to the current user.
"""

from __future__ import annotations

from typing import List

import httpx
from fastapi import APIRouter, Depends, HTTPException, Path
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from app.settings import Settings, get_settings


router = APIRouter(prefix="/me/follows", tags=["follows"])
bearer = HTTPBearer(auto_error=False)


class FollowedMaster(BaseModel):
    master_id: str
    followed_at: str


class FollowedMastersResponse(BaseModel):
    items: List[FollowedMaster]


class FollowCreate(BaseModel):
    master_id: str = Field(..., min_length=1)


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


@router.get("/masters", response_model=FollowedMastersResponse)
async def list_followed_masters(
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> FollowedMastersResponse:
    base = await _sb_url(settings)
    async with httpx.AsyncClient(timeout=8.0, headers=_user_headers(token, settings)) as client:
        resp = await client.get(
            f"{base}/rest/v1/followed_masters",
            params={
                "select": "master_id,followed_at",
                "order": "followed_at.desc",
                "limit": "500",
            },
        )
        if resp.status_code >= 400:
            return FollowedMastersResponse(items=[])
    return FollowedMastersResponse(items=[FollowedMaster(**r) for r in resp.json()])


@router.post("/masters", response_model=FollowedMaster)
async def follow_master(
    body: FollowCreate,
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> FollowedMaster:
    base = await _sb_url(settings)
    headers = {
        **_user_headers(token, settings),
        "Content-Type": "application/json",
        "Prefer": "return=representation,resolution=merge-duplicates",
    }
    async with httpx.AsyncClient(timeout=8.0, headers=headers) as client:
        resp = await client.post(
            f"{base}/rest/v1/followed_masters",
            json={"master_id": body.master_id},
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.text[:200])
        rows = resp.json()
    if not rows:
        raise HTTPException(status_code=500, detail="no_row_returned")
    return FollowedMaster(**rows[0])


@router.delete("/masters/{master_id}")
async def unfollow_master(
    master_id: str = Path(..., min_length=1),
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> dict:
    base = await _sb_url(settings)
    async with httpx.AsyncClient(timeout=8.0, headers=_user_headers(token, settings)) as client:
        resp = await client.delete(
            f"{base}/rest/v1/followed_masters",
            params={"master_id": f"eq.{master_id}"},
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.text[:200])
    return {"unfollowed": master_id}


# ── feed reads (per-user, per master_update composite key) ─────────
class FeedReadCreate(BaseModel):
    master_id: str = Field(..., min_length=1)
    update_key: str = Field(..., min_length=1)


@router.post("/feed-reads", status_code=204)
async def mark_feed_read(
    body: FeedReadCreate,
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> None:
    """Mark a master-update as read by the current user.

    Idempotent (resolution=merge-duplicates). Backed by master_feed_reads
    (mig 0024) with composite PK (user_id, master_id, update_key).
    """
    base = await _sb_url(settings)
    headers = {
        **_user_headers(token, settings),
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    async with httpx.AsyncClient(timeout=8.0, headers=headers) as client:
        resp = await client.post(
            f"{base}/rest/v1/master_feed_reads",
            json={"master_id": body.master_id, "update_key": body.update_key},
        )
        if resp.status_code >= 400 and resp.status_code != 409:
            raise HTTPException(status_code=resp.status_code, detail=resp.text[:200])
