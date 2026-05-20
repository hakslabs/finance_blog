"""GET /v1/calendar — unified macro + earnings + dividend calendar.

Pulls from two tables:
  - economic_events            (mig 0009)   — FRED / Finnhub ingest
  - stock_calendar_events      (mig 0025)   — Polygon ingest

Filtering:
  from, to         ISO-date range, inclusive (default: today .. +30d)
  types            csv subset of {macro, earnings, dividend}; default all
  symbols          csv ticker list — restricts the stock event sections
                   (macro is unaffected because it's not symbol-scoped)
  min_importance   1..3, filters macro by importance. default 1.
  recommended      1 → server picks importance>=2 macro; client passes
                   its watchlist+holdings via `symbols` to layer in.

Returns a flat list sorted by `scheduled_at` so the frontend doesn't
have to merge multiple lists.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

from app.settings import Settings, get_settings


router = APIRouter(prefix="/calendar", tags=["calendar"])


class CalendarItem(BaseModel):
    id: str
    kind: str  # 'macro' | 'earnings' | 'dividend'
    title: str
    scheduled_at: str
    country_code: Optional[str] = None
    symbol: Optional[str] = None
    # Company name for stock events, resolved server-side via the
    # blog_index_universe table. Tickers alone aren't recognizable in
    # calendar / summary contexts.
    symbol_name: Optional[str] = None
    importance: Optional[int] = None
    detail: Optional[str] = None
    actual_value: Optional[str] = None
    forecast_value: Optional[str] = None
    previous_value: Optional[str] = None
    cash_amount: Optional[float] = None
    eps_estimate: Optional[float] = None
    revenue_estimate: Optional[float] = None


class CalendarResponse(BaseModel):
    # `from` is a Python keyword — use Field alias so JSON stays "from".
    model_config = ConfigDict(populate_by_name=True)

    from_: str = Field(alias="from")
    to: str
    items: List[CalendarItem]


async def _pg_get(
    settings: Settings,
    path: str,
    params: Dict[str, str],
) -> List[Dict[str, Any]]:
    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Accept": "application/json",
    }
    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/{path}"
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            response = await client.get(url, params=params, headers=headers)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="upstream_unavailable") from exc
    if response.status_code >= 400:
        raise HTTPException(status_code=503, detail="upstream_unavailable")
    return response.json()


def _parse_csv(value: Optional[str]) -> List[str]:
    if not value:
        return []
    return [v.strip() for v in value.split(",") if v.strip()]


@router.get("", response_model=CalendarResponse, response_model_by_alias=True)
async def get_calendar(
    from_: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = Query(None),
    types: Optional[str] = Query(None, description="csv of macro,earnings,dividend"),
    symbols: Optional[str] = Query(None, description="csv of tickers"),
    min_importance: int = Query(1, ge=1, le=3),
    recommended: int = Query(0, ge=0, le=1),
    settings: Settings = Depends(get_settings),
) -> CalendarResponse:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(status_code=503, detail="upstream_unavailable")

    # Default window: today .. +30d
    today = date.today()
    try:
        start = date.fromisoformat(from_) if from_ else today
        end = date.fromisoformat(to) if to else today + timedelta(days=30)
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid_date")
    if end < start:
        raise HTTPException(status_code=400, detail="invalid_range")

    type_set = set(_parse_csv(types)) or {"macro", "earnings", "dividend"}
    # Three-state symbol gate:
    #   symbols is None         → param not supplied at all → no filter
    #   symbols == ""           → param supplied but empty → match NOTHING
    #                              (empty-watchlist case: don't dump the
    #                               full universe of earnings into the cal)
    #   symbols == "AAPL,..."   → restrict stock events to those tickers
    symbol_list: Optional[List[str]] = None if symbols is None else _parse_csv(symbols)
    effective_min_importance = max(min_importance, 2) if recommended else min_importance

    items: List[CalendarItem] = []
    start_ts = f"{start.isoformat()}T00:00:00Z"
    end_ts = f"{end.isoformat()}T23:59:59Z"

    # ── Macro (economic_events) ──────────────────────────────
    if "macro" in type_set:
        macro_params = {
            "select": "id,title,country_code,importance,scheduled_at,actual_value,forecast_value,previous_value,unit",
            "scheduled_at": f"gte.{start_ts}",
            "and": f"(scheduled_at.lte.{end_ts})",
            "order": "scheduled_at.asc",
            "limit": "200",
        }
        if effective_min_importance > 1:
            macro_params["importance"] = f"gte.{effective_min_importance}"
        macro_rows = await _pg_get(settings, "economic_events", macro_params)
        for r in macro_rows:
            items.append(CalendarItem(
                id=r["id"],
                kind="macro",
                title=r["title"],
                scheduled_at=r["scheduled_at"],
                country_code=r.get("country_code"),
                importance=r.get("importance"),
                actual_value=r.get("actual_value"),
                forecast_value=r.get("forecast_value"),
                previous_value=r.get("previous_value"),
            ))

    # ── Stock events (earnings + dividends) ──────────────────
    stock_types = [t for t in ("earnings", "dividend") if t in type_set]
    # Short-circuit when the caller passed an explicitly empty symbol
    # list — that means "the user has no watchlist", and we shouldn't
    # silently fall back to the full universe.
    skip_stocks = symbol_list is not None and len(symbol_list) == 0
    if stock_types and not skip_stocks:
        stock_params: Dict[str, str] = {
            "select": "id,symbol,event_type,scheduled_at,importance,eps_estimate,revenue_estimate,cash_amount,currency,fiscal_period",
            "scheduled_at": f"gte.{start_ts}",
            "and": f"(scheduled_at.lte.{end_ts})",
            "order": "scheduled_at.asc",
            "limit": "500",
        }
        if len(stock_types) == 1:
            stock_params["event_type"] = f"eq.{stock_types[0]}"
        else:
            quoted = ",".join(f'"{t}"' for t in stock_types)
            stock_params["event_type"] = f"in.({quoted})"
        if symbol_list:
            quoted_syms = ",".join(f'"{s.upper()}"' for s in symbol_list)
            stock_params["symbol"] = f"in.({quoted_syms})"
        stock_rows = await _pg_get(settings, "stock_calendar_events", stock_params)
    else:
        stock_rows = []

    if stock_rows:
        # Resolve symbol → name in one fan-out call against the blog
        # universe so the calendar shows "엔비디아 실적" instead of
        # "NVDA 실적". Falls back to the ticker when the symbol isn't
        # in the universe (shouldn't happen post-ingest filtering, but
        # be defensive).
        symbol_to_name: Dict[str, str] = {}
        unique_symbols = sorted({r["symbol"] for r in stock_rows if r.get("symbol")})
        if unique_symbols:
            quoted = ",".join(f'"{s}"' for s in unique_symbols)
            name_rows = await _pg_get(
                settings,
                "blog_index_universe",
                {"select": "symbol,name", "symbol": f"in.({quoted})", "limit": "5000"},
            )
            for nr in name_rows:
                sym = (nr.get("symbol") or "").upper()
                if sym and nr.get("name"):
                    symbol_to_name.setdefault(sym, nr["name"])

        for r in stock_rows:
            kind = r["event_type"]
            symbol = r["symbol"]
            name = symbol_to_name.get(symbol.upper(), symbol)
            if kind == "earnings":
                title = f"{name} 실적발표"
                if r.get("fiscal_period"):
                    title = f"{name} {r['fiscal_period']} 실적"
            else:
                title = f"{name} 배당락"
            items.append(CalendarItem(
                id=r["id"],
                kind=kind,
                title=title,
                scheduled_at=r["scheduled_at"],
                symbol=symbol,
                symbol_name=name if name != symbol else None,
                importance=r.get("importance"),
                eps_estimate=r.get("eps_estimate"),
                revenue_estimate=r.get("revenue_estimate"),
                cash_amount=r.get("cash_amount"),
            ))

    items.sort(key=lambda i: i.scheduled_at)
    return CalendarResponse(
        **{
            "from": start.isoformat(),
            "to": end.isoformat(),
            "items": items,
        }
    )
