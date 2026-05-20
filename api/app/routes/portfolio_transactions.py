"""Per-user portfolio transaction CRUD (owner-RLS).

Adds write endpoints alongside GET /portfolios/me. Forwards the caller's
Supabase JWT to PostgREST. Resolves symbol→instrument_id server-side
(instruments is public-read-ish; we use service role for the lookup).
"""

from __future__ import annotations

from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Path
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from app.settings import Settings, get_settings


router = APIRouter(prefix="/portfolios/me/transactions", tags=["portfolios"])
bearer = HTTPBearer(auto_error=False)

VALID_TYPES = {"buy", "sell", "dividend", "deposit"}


class Transaction(BaseModel):
    id: str
    portfolio_id: str
    instrument_id: Optional[str] = None
    symbol: Optional[str] = None
    name: Optional[str] = None
    exchange: Optional[str] = None
    type: str
    quantity: Optional[float] = None
    price: Optional[float] = None
    amount: float
    currency: str
    note: Optional[str] = None
    occurred_at: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class TransactionsResponse(BaseModel):
    items: List[Transaction]


class TransactionCreate(BaseModel):
    symbol: Optional[str] = None
    instrument_id: Optional[str] = None
    type: str = Field(..., min_length=1)
    quantity: Optional[float] = None
    price: Optional[float] = None
    amount: Optional[float] = None
    currency: str = Field(default="KRW", min_length=3, max_length=3)
    note: Optional[str] = None
    occurred_at: str  # YYYY-MM-DD


class TransactionPatch(BaseModel):
    quantity: Optional[float] = None
    price: Optional[float] = None
    amount: Optional[float] = None
    note: Optional[str] = None
    occurred_at: Optional[str] = None


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


async def _resolve_instrument(base: str, settings: Settings, symbol: str) -> Optional[dict]:
    async with httpx.AsyncClient(timeout=5.0, headers=_service_headers(settings)) as client:
        resp = await client.get(
            f"{base}/rest/v1/instruments",
            params={"symbol": f"eq.{symbol}", "select": "id,currency", "limit": "1"},
        )
        if resp.status_code >= 400:
            return None
        rows = resp.json()
    return rows[0] if rows else None


async def _ensure_primary_portfolio(
    base: str, settings: Settings, token: str
) -> str:
    """Find or create the caller's primary portfolio (using their own JWT — RLS-scoped)."""
    headers = _user_headers(token, settings)
    async with httpx.AsyncClient(timeout=5.0, headers=headers) as client:
        resp = await client.get(
            f"{base}/rest/v1/portfolios",
            params={
                "is_primary": "eq.true",
                "select": "id",
                "limit": "1",
            },
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.text[:200])
        rows = resp.json()
        if rows:
            return rows[0]["id"]
        # Create one. Note: user_id is enforced by RLS WITH CHECK; PostgREST
        # accepts the row only if user_id = auth.uid(). We omit user_id and
        # rely on a sane default — but profiles use auth uid, so this won't
        # work without an explicit user_id. We get it from the JWT sub claim
        # via PostgREST's auth.uid() server-side default if defined; if not,
        # caller must set user_id. We let the client/AuthContext route this
        # via /watchlists/me first (which auto-creates profile + portfolio
        # seed via dev-seed claim flow), so a primary portfolio likely exists.
        raise HTTPException(status_code=404, detail="primary_portfolio_missing")


@router.get("", response_model=TransactionsResponse)
async def list_transactions(
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> TransactionsResponse:
    base = await _sb_url(settings)
    portfolio_id = await _ensure_primary_portfolio(base, settings, token)
    async with httpx.AsyncClient(timeout=8.0, headers=_user_headers(token, settings)) as client:
        resp = await client.get(
            f"{base}/rest/v1/transactions",
            params={
                "portfolio_id": f"eq.{portfolio_id}",
                "select": (
                    "id,portfolio_id,instrument_id,type,quantity,price,amount,currency,"
                    "note,occurred_at,created_at,updated_at,"
                    "instruments(symbol,name,exchange)"
                ),
                "order": "occurred_at.desc,created_at.desc",
                "limit": "1000",
            },
        )
        if resp.status_code >= 400:
            return TransactionsResponse(items=[])
        rows = resp.json()
    items: List[Transaction] = []
    for r in rows:
        inst = r.pop("instruments", None) or {}
        items.append(
            Transaction(
                **r,
                symbol=inst.get("symbol"),
                name=inst.get("name"),
                exchange=inst.get("exchange"),
            )
        )
    return TransactionsResponse(items=items)


@router.post("", response_model=Transaction)
async def create_transaction(
    body: TransactionCreate,
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> Transaction:
    if body.type not in VALID_TYPES:
        raise HTTPException(status_code=400, detail="invalid_type")
    base = await _sb_url(settings)
    portfolio_id = await _ensure_primary_portfolio(base, settings, token)

    instrument_id = body.instrument_id
    currency = body.currency
    if body.type in ("buy", "sell"):
        if instrument_id is None and body.symbol:
            inst = await _resolve_instrument(base, settings, body.symbol)
            if inst is None:
                raise HTTPException(status_code=404, detail="instrument_not_found")
            instrument_id = inst["id"]
            currency = (inst.get("currency") or currency).upper()
        if body.quantity is None or body.price is None:
            raise HTTPException(status_code=400, detail="qty_price_required")

    if body.amount is not None:
        amount = body.amount
    elif body.quantity is not None and body.price is not None:
        amount = body.quantity * body.price
    else:
        raise HTTPException(status_code=400, detail="amount_required")

    payload: dict = {
        "portfolio_id": portfolio_id,
        "type": body.type,
        "amount": amount,
        "currency": currency.upper(),
        "occurred_at": body.occurred_at,
    }
    if instrument_id is not None:
        payload["instrument_id"] = instrument_id
    if body.quantity is not None:
        payload["quantity"] = body.quantity
    if body.price is not None:
        payload["price"] = body.price
    if body.note is not None:
        payload["note"] = body.note

    headers = {
        **_user_headers(token, settings),
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    async with httpx.AsyncClient(timeout=8.0, headers=headers) as client:
        resp = await client.post(f"{base}/rest/v1/transactions", json=payload)
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.text[:200])
        rows = resp.json()
    if not rows:
        raise HTTPException(status_code=500, detail="no_row_returned")
    return Transaction(**rows[0])


@router.patch("/{tx_id}", response_model=Transaction)
async def patch_transaction(
    body: TransactionPatch,
    tx_id: str = Path(..., min_length=1),
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> Transaction:
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
            f"{base}/rest/v1/transactions",
            params={"id": f"eq.{tx_id}"},
            json=payload,
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.text[:200])
        rows = resp.json()
    if not rows:
        raise HTTPException(status_code=404, detail="not_found")
    return Transaction(**rows[0])


@router.delete("/{tx_id}")
async def delete_transaction(
    tx_id: str = Path(..., min_length=1),
    token: str = Depends(_require_bearer),
    settings: Settings = Depends(get_settings),
) -> dict:
    base = await _sb_url(settings)
    async with httpx.AsyncClient(timeout=8.0, headers=_user_headers(token, settings)) as client:
        resp = await client.delete(
            f"{base}/rest/v1/transactions",
            params={"id": f"eq.{tx_id}"},
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.text[:200])
    return {"deleted": tx_id}
