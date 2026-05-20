"""Per-user alerts (owner-RLS).

Backed by public.alerts. Kind ∈ {price, rsi, ma_cross, volume, macro, custom}.
Operator ∈ {lt, lte, gt, gte, eq, cross_up, cross_down}.
"""

from __future__ import annotations

from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Path
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from app.settings import Settings, get_settings


router = APIRouter(prefix="/me/alerts", tags=["alerts"])
bearer = HTTPBearer(auto_error=False)


class Alert(BaseModel):
    id: str
    instrument_id: Optional[str] = None
    kind: str
    operator: str
    threshold: float
    enabled: bool
    triggered_at: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class AlertsResponse(BaseModel):
    items: List[Alert]


class AlertCreate(BaseModel):
    symbol: Optional[str] = None
    instrument_id: Optional[str] = None
    kind: str = Field(..., min_length=1)
    operator: str = Field(..., min_length=1)
    threshold: float
    enabled: bool = True


class AlertPatch(BaseModel):
    operator: Optional[str] = None
    threshold: Optional[float] = None
    enabled: Optional[bool] = None


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
    """Symbol → instrument_id lookup using service role (instruments is public-ish)."""
    async with httpx.AsyncClient(timeout=5.0, headers=_service_headers(settings)) as client:
        resp = await client.get(
            f"{base}/rest/v1/instruments",
            params={"symbol": f"eq.{symbol}", "select": "id", "limit": "1"},
        )
        if resp.status_code >= 400:
            return None
        rows = resp.json()
    return rows[0]["id"] if rows else None


@router.get("", response_model=AlertsResponse)
async def list_alerts(
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> AlertsResponse:
    base = await _sb_url(settings)
    async with httpx.AsyncClient(timeout=8.0, headers=_user_headers(token, settings)) as client:
        resp = await client.get(
            f"{base}/rest/v1/alerts",
            params={
                "select": "id,instrument_id,kind,operator,threshold,enabled,triggered_at,created_at,updated_at",
                "order": "created_at.desc",
                "limit": "500",
            },
        )
        if resp.status_code >= 400:
            return AlertsResponse(items=[])
    return AlertsResponse(items=[Alert(**r) for r in resp.json()])


@router.post("", response_model=Alert)
async def create_alert(
    body: AlertCreate,
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> Alert:
    base = await _sb_url(settings)
    instrument_id = body.instrument_id
    if instrument_id is None and body.symbol:
        instrument_id = await _resolve_instrument_id(base, settings, body.symbol)
        if instrument_id is None:
            raise HTTPException(status_code=404, detail="instrument_not_found")

    payload: dict = {
        "kind": body.kind,
        "operator": body.operator,
        "threshold": body.threshold,
        "enabled": body.enabled,
    }
    if instrument_id is not None:
        payload["instrument_id"] = instrument_id

    headers = {
        **_user_headers(token, settings),
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    async with httpx.AsyncClient(timeout=8.0, headers=headers) as client:
        resp = await client.post(f"{base}/rest/v1/alerts", json=payload)
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.text[:200])
        rows = resp.json()
    if not rows:
        raise HTTPException(status_code=500, detail="no_row_returned")
    return Alert(**rows[0])


@router.patch("/{alert_id}", response_model=Alert)
async def patch_alert(
    body: AlertPatch,
    alert_id: str = Path(..., min_length=1),
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> Alert:
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
            f"{base}/rest/v1/alerts",
            params={"id": f"eq.{alert_id}"},
            json=payload,
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.text[:200])
        rows = resp.json()
    if not rows:
        raise HTTPException(status_code=404, detail="not_found")
    return Alert(**rows[0])


@router.delete("/{alert_id}")
async def delete_alert(
    alert_id: str = Path(..., min_length=1),
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> dict:
    base = await _sb_url(settings)
    async with httpx.AsyncClient(timeout=8.0, headers=_user_headers(token, settings)) as client:
        resp = await client.delete(
            f"{base}/rest/v1/alerts",
            params={"id": f"eq.{alert_id}"},
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.text[:200])
    return {"deleted": alert_id}
