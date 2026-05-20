"""Per-user position theses (owner-RLS).

Bound to an instrument (resolved server-side from symbol when needed).
Conviction range 1..5. Conditions (trigger/invalidate) come via a separate
nested endpoint in a future PR — for now we expose the thesis row only.
"""

from __future__ import annotations

from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Path
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from app.settings import Settings, get_settings


router = APIRouter(prefix="/me/theses", tags=["theses"])
bearer = HTTPBearer(auto_error=False)


class Thesis(BaseModel):
    id: str
    instrument_id: str
    thesis: str
    conviction: Optional[int] = None
    target_price: Optional[float] = None
    stop_price: Optional[float] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class ThesesResponse(BaseModel):
    items: List[Thesis]


class ThesisCreate(BaseModel):
    symbol: Optional[str] = None
    instrument_id: Optional[str] = None
    thesis: str = Field(..., min_length=1)
    conviction: Optional[int] = Field(default=None, ge=1, le=5)
    target_price: Optional[float] = None
    stop_price: Optional[float] = None


class ThesisPatch(BaseModel):
    thesis: Optional[str] = None
    conviction: Optional[int] = Field(default=None, ge=1, le=5)
    target_price: Optional[float] = None
    stop_price: Optional[float] = None


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


def _service_headers(settings: Settings) -> dict:
    return {
        "apikey": settings.supabase_service_role_key or "",
        "Authorization": f"Bearer {settings.supabase_service_role_key or ''}",
        "Accept": "application/json",
    }


async def _sb_url(settings: Settings) -> str:
    if not settings.supabase_url:
        raise HTTPException(status_code=503, detail="upstream_unavailable")
    return settings.supabase_url.rstrip("/")


async def _resolve_instrument_id(base: str, settings: Settings, symbol: str) -> Optional[str]:
    async with httpx.AsyncClient(timeout=5.0, headers=_service_headers(settings)) as client:
        resp = await client.get(
            f"{base}/rest/v1/instruments",
            params={"symbol": f"eq.{symbol}", "select": "id", "limit": "1"},
        )
        if resp.status_code >= 400:
            return None
        rows = resp.json()
    return rows[0]["id"] if rows else None


@router.get("", response_model=ThesesResponse)
async def list_theses(
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> ThesesResponse:
    base = await _sb_url(settings)
    async with httpx.AsyncClient(timeout=8.0, headers=_user_headers(token, settings)) as client:
        resp = await client.get(
            f"{base}/rest/v1/position_theses",
            params={
                "select": "id,instrument_id,thesis,conviction,target_price,stop_price,created_at,updated_at",
                "order": "updated_at.desc",
                "limit": "200",
            },
        )
        if resp.status_code >= 400:
            return ThesesResponse(items=[])
    return ThesesResponse(items=[Thesis(**r) for r in resp.json()])


@router.post("", response_model=Thesis)
async def create_thesis(
    body: ThesisCreate,
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> Thesis:
    base = await _sb_url(settings)
    instrument_id = body.instrument_id
    if instrument_id is None:
        if not body.symbol:
            raise HTTPException(status_code=400, detail="symbol_or_instrument_required")
        instrument_id = await _resolve_instrument_id(base, settings, body.symbol)
        if instrument_id is None:
            raise HTTPException(status_code=404, detail="instrument_not_found")

    payload: dict = {"instrument_id": instrument_id, "thesis": body.thesis}
    if body.conviction is not None:
        payload["conviction"] = body.conviction
    if body.target_price is not None:
        payload["target_price"] = body.target_price
    if body.stop_price is not None:
        payload["stop_price"] = body.stop_price

    headers = {
        **_user_headers(token, settings),
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    async with httpx.AsyncClient(timeout=8.0, headers=headers) as client:
        resp = await client.post(f"{base}/rest/v1/position_theses", json=payload)
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.text[:200])
        rows = resp.json()
    if not rows:
        raise HTTPException(status_code=500, detail="no_row_returned")
    return Thesis(**rows[0])


@router.patch("/{thesis_id}", response_model=Thesis)
async def patch_thesis(
    body: ThesisPatch,
    thesis_id: str = Path(..., min_length=1),
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> Thesis:
    base = await _sb_url(settings)
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    if not payload:
        raise HTTPException(status_code=400, detail="empty_patch")
    headers = {
        **_user_headers(token, settings),
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    async with httpx.AsyncClient(timeout=8.0, headers=headers) as client:
        resp = await client.patch(
            f"{base}/rest/v1/position_theses",
            params={"id": f"eq.{thesis_id}"},
            json=payload,
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.text[:200])
        rows = resp.json()
    if not rows:
        raise HTTPException(status_code=404, detail="not_found")
    return Thesis(**rows[0])


@router.delete("/{thesis_id}")
async def delete_thesis(
    thesis_id: str = Path(..., min_length=1),
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> dict:
    base = await _sb_url(settings)
    async with httpx.AsyncClient(timeout=8.0, headers=_user_headers(token, settings)) as client:
        resp = await client.delete(
            f"{base}/rest/v1/position_theses",
            params={"id": f"eq.{thesis_id}"},
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.text[:200])
    return {"deleted": thesis_id}
