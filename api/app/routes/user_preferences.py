"""Per-user UI preferences (last market, indicators, macro overrides)."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.settings import Settings, get_settings


router = APIRouter(prefix="/me/preferences", tags=["preferences"])
bearer = HTTPBearer(auto_error=False)


class UserPreferences(BaseModel):
    last_market: Optional[str] = None
    preferred_indicators: Optional[List[str]] = None
    preferred_timeframe: Optional[str] = None
    dismissed_notice_ids: Optional[List[str]] = None
    macro_overrides: Optional[Dict[str, Any]] = None


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


@router.get("", response_model=UserPreferences)
async def get_preferences(
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> UserPreferences:
    base = settings.supabase_url.rstrip("/")
    async with httpx.AsyncClient(timeout=8.0, headers=_user_headers(token, settings)) as c:
        r = await c.get(f"{base}/rest/v1/user_preferences",
                        params={"select": "*", "limit": "1"})
        if r.status_code >= 400 or not r.json():
            return UserPreferences()
    row = r.json()[0]
    return UserPreferences(**{k: row.get(k) for k in UserPreferences.model_fields})


@router.patch("", response_model=UserPreferences)
async def update_preferences(
    body: UserPreferences,
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> UserPreferences:
    base = settings.supabase_url.rstrip("/")
    payload = body.model_dump(exclude_none=True)
    headers = {**_user_headers(token, settings),
               "Content-Type": "application/json",
               "Prefer": "return=representation,resolution=merge-duplicates"}
    async with httpx.AsyncClient(timeout=8.0, headers=headers) as c:
        r = await c.post(f"{base}/rest/v1/user_preferences", json=payload)
        if r.status_code >= 400:
            raise HTTPException(r.status_code, r.text[:200])
        rows = r.json()
    return UserPreferences(**rows[0]) if rows else UserPreferences()
