"""Per-user price/volume/news/earnings alerts (owner-RLS).

Backed by `price_alerts` (mig 0024). Uses ticker strings (not instrument UUIDs)
to match the frontend Alert type (web/client/src/types/index.ts).
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from app.settings import Settings, get_settings


router = APIRouter(prefix="/me/alerts", tags=["alerts"])
bearer = HTTPBearer(auto_error=False)

VALID_TYPES = {"target", "stoploss", "volume", "news", "earnings"}


class Alert(BaseModel):
    id: str
    symbol: str
    alert_type: str
    condition: str
    target_value: float
    current_value: Optional[float] = None
    is_active: bool = True
    triggered_at: Optional[str] = None
    created_at: Optional[str] = None


class AlertsResponse(BaseModel):
    items: List[Alert]


class AlertCreate(BaseModel):
    symbol: str = Field(..., min_length=1)
    alert_type: str
    condition: str
    target_value: float
    current_value: Optional[float] = None
    is_active: bool = True


class AlertUpdate(BaseModel):
    condition: Optional[str] = None
    target_value: Optional[float] = None
    is_active: Optional[bool] = None
    triggered_at: Optional[str] = None


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


@router.get("", response_model=AlertsResponse)
async def list_alerts(
    symbol: Optional[str] = Query(None),
    only_active: bool = Query(False),
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> AlertsResponse:
    params: Dict[str, str] = {
        "select": "id,symbol,alert_type,condition,target_value,current_value,is_active,triggered_at,created_at",
        "order": "created_at.desc",
        "limit": "500",
    }
    if symbol:
        params["symbol"] = f"eq.{symbol.upper()}"
    if only_active:
        params["is_active"] = "is.true"
    base = settings.supabase_url.rstrip("/")
    async with httpx.AsyncClient(timeout=8.0, headers=_user_headers(token, settings)) as c:
        r = await c.get(f"{base}/rest/v1/price_alerts", params=params)
        if r.status_code >= 400:
            return AlertsResponse(items=[])
    return AlertsResponse(items=[Alert(**row) for row in r.json()])


@router.post("", response_model=Alert, status_code=201)
async def create_alert(
    body: AlertCreate,
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> Alert:
    if body.alert_type not in VALID_TYPES:
        raise HTTPException(400, "invalid_alert_type")
    base = settings.supabase_url.rstrip("/")
    payload: Dict[str, Any] = body.model_dump()
    payload["symbol"] = payload["symbol"].upper()
    headers = {**_user_headers(token, settings),
               "Content-Type": "application/json",
               "Prefer": "return=representation"}
    async with httpx.AsyncClient(timeout=8.0, headers=headers) as c:
        r = await c.post(f"{base}/rest/v1/price_alerts", json=payload)
        if r.status_code >= 400:
            raise HTTPException(r.status_code, r.text[:200])
        rows = r.json()
    return Alert(**rows[0])


@router.patch("/{alert_id}", response_model=Alert)
async def update_alert(
    body: AlertUpdate,
    alert_id: str = Path(...),
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> Alert:
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(400, "nothing_to_update")
    base = settings.supabase_url.rstrip("/")
    headers = {**_user_headers(token, settings),
               "Content-Type": "application/json",
               "Prefer": "return=representation"}
    async with httpx.AsyncClient(timeout=8.0, headers=headers) as c:
        r = await c.patch(f"{base}/rest/v1/price_alerts",
                          params={"id": f"eq.{alert_id}"}, json=payload)
        if r.status_code >= 400:
            raise HTTPException(r.status_code, r.text[:200])
        rows = r.json()
    if not rows:
        raise HTTPException(404, "alert_not_found")
    return Alert(**rows[0])


@router.delete("/{alert_id}", status_code=204)
async def delete_alert(
    alert_id: str = Path(...),
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> None:
    base = settings.supabase_url.rstrip("/")
    headers = {**_user_headers(token, settings), "Prefer": "return=minimal"}
    async with httpx.AsyncClient(timeout=8.0, headers=headers) as c:
        r = await c.delete(f"{base}/rest/v1/price_alerts", params={"id": f"eq.{alert_id}"})
        if r.status_code >= 400 and r.status_code != 404:
            raise HTTPException(r.status_code, r.text[:200])
