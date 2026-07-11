"""GET /v1/market/indices — dashboard top-row indices, multi-source.

The endpoint returns only observed market data:
  - Yahoo v7 for broad indices, FX, commodities, and volatility symbols.
  - KRX for Korean indices when an approved key is available.
  - Finnhub ETF/ETN proxies as a live fallback.
  - Supabase price_bars_daily proxy bars as a final DB-backed fallback.

It deliberately avoids hardcoded index baselines. If every real source is
unavailable for a symbol, the item is omitted instead of drawing a fake value.
Cached 60s in-process so a popular dashboard burst doesn't trigger rate limits.
"""

from __future__ import annotations

import asyncio
import math
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.settings import Settings, get_settings
from app.sources import alphavantage, finnhub, krx, yahoo


router = APIRouter(prefix="/market", tags=["market"])


# (display symbol, display name, market group)
_DISPLAY: List[Tuple[str, str, str]] = [
    ("KOSPI",   "코스피",         "KR"),
    ("KOSDAQ",  "코스닥",         "KR"),
    ("S&P 500", "S&P 500",        "US"),
    ("NASDAQ",  "나스닥",         "US"),
    ("DOW",     "다우",           "US"),
    ("USD/KRW", "원/달러",         "FX"),
    ("WTI",     "국제유가 (WTI)", "COMM"),
    ("GOLD",    "금",             "COMM"),
    ("VIX",     "공포지수 (VIX)", "VOL"),
]

# Display-symbol → tracked proxy. Used for Finnhub live fallbacks and DB
# price_bars_daily fallbacks when direct index quotes are unavailable.
_PROXY_SYMBOL: Dict[str, str] = {
    "S&P 500": "SPY",
    "NASDAQ":  "QQQ",
    "DOW":     "DIA",
    "WTI":     "USO",
    "GOLD":    "GLD",
    "VIX":     "VIXY",
}

# Display-symbol → Yahoo ticker. Yahoo covers direct index/FX/futures values.
_YAHOO_SYMBOL: Dict[str, str] = {
    "KOSPI":  "^KS11",
    "KOSDAQ": "^KQ11",
    "S&P 500": "^GSPC",
    "NASDAQ": "^IXIC",
    "DOW": "^DJI",
    "USD/KRW": "KRW=X",
    "WTI": "CL=F",
    "GOLD": "GC=F",
    "VIX": "^VIX",
}

_CACHE_TTL = 60.0
_cache: Dict[str, Tuple[float, "IndicesResponse"]] = {}

class IndexItem(BaseModel):
    symbol: str
    name: str
    value: float
    change: Optional[float] = None
    change_pct: Optional[float] = None
    market: str
    source: str  # "live" | "db"


class IndicesResponse(BaseModel):
    items: List[IndexItem]
    updated_at: str


def _finite_number(value: Any) -> Optional[float]:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if math.isfinite(result) else None


async def _fetch_finnhub(
    display: str, name: str, proxy: str, market_group: str,
    settings: Settings,
) -> Optional[IndexItem]:
    """Use a real ETF/proxy quote when direct index quotes are unavailable."""
    if not settings.finnhub_api_key:
        return None
    q = await finnhub.fetch_quote(proxy, settings.finnhub_api_key)
    if not q:
        return None
    value = _finite_number(q.get("c"))
    previous = _finite_number(q.get("pc"))
    if value is None or value <= 0:
        return None
    change = (
        value - previous
        if previous is not None and previous > 0
        else _finite_number(q.get("d"))
    )
    change_pct = (
        (change / previous) * 100.0
        if change is not None and previous is not None and previous > 0
        else _finite_number(q.get("dp"))
    )
    return IndexItem(
        symbol=display, name=f"{name} ({proxy})",
        value=value, change=change, change_pct=change_pct,
        market=market_group, source="live",
    )


async def _fetch_usdkrw(settings: Settings) -> Optional[IndexItem]:
    name, market_group = "원/달러", "FX"
    if not settings.alphavantage_api_key:
        return None
    r = await alphavantage.fetch_currency_rate(
        "USD", "KRW", settings.alphavantage_api_key,
    )
    if not r or not r.get("rate"):
        return None
    rate = r["rate"]
    return IndexItem(
        symbol="USD/KRW", name=name,
        value=rate, change=None, change_pct=None,
        market=market_group, source="live",
    )


async def _fetch_yahoo_batch(client: httpx.AsyncClient) -> Dict[str, Dict[str, float]]:
    """Yahoo v7 batch for direct index/FX/futures quotes.

    Returns empty dict on 429/network failure; callers then try KRX,
    provider proxy quotes, and DB proxy bars.
    """
    try:
        return await yahoo.fetch_quotes(list(_YAHOO_SYMBOL.values()), client=client)
    except yahoo.YahooError:
        return {}


async def _fetch_kr_index(
    display: str, name: str, market_group: str, settings: Settings,
    client: httpx.AsyncClient,
) -> Optional[IndexItem]:
    """KOSPI / KOSDAQ via KRX OpenAPI (EOD)."""
    if settings.krx_api_key:
        try:
            q = await krx.fetch_index_daily(display, settings.krx_api_key, client=client)
        except Exception:  # noqa: BLE001
            q = None
        if q is not None:
            return IndexItem(
                symbol=display, name=name,
                value=q["price"], change=q["change"], change_pct=q["change_pct"],
                market=market_group, source="live",
            )
    return None


async def _fetch_db_proxy(
    display: str,
    name: str,
    proxy: str,
    market_group: str,
    settings: Settings,
    client: httpx.AsyncClient,
) -> Optional[IndexItem]:
    """Read the latest two daily proxy bars from Supabase/PostgREST."""
    if not (settings.supabase_url and settings.supabase_service_role_key):
        return None
    base = settings.supabase_url.rstrip("/")
    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Accept": "application/json",
    }
    candidates = [proxy.upper()]
    if proxy.isdigit() and len(proxy) == 6:
        candidates += [f"{proxy}.KS", f"{proxy}.KQ"]
    elif proxy.endswith((".KS", ".KQ")):
        candidates.insert(0, proxy[:-3])

    inst_ids: List[str] = []
    for cand in candidates:
        resp = await client.get(
            f"{base}/rest/v1/instruments",
            params={
                "symbol": f"eq.{cand}",
                "select": "id",
                "is_active": "eq.true",
                "limit": "5",
            },
            headers=headers,
        )
        if resp.status_code >= 400:
            continue
        for row in resp.json():
            iid = str(row.get("id") or "")
            if iid and iid not in inst_ids:
                inst_ids.append(iid)

    latest_by_date: Dict[str, Dict[str, Any]] = {}
    for iid in inst_ids:
        resp = await client.get(
            f"{base}/rest/v1/price_bars_daily",
            params={
                "instrument_id": f"eq.{iid}",
                "select": "t,c",
                "order": "t.desc",
                "limit": "2",
            },
            headers=headers,
        )
        if resp.status_code >= 400:
            continue
        for row in resp.json():
            d = str(row.get("t", ""))[:10]
            c = row.get("c")
            if d and c is not None:
                latest_by_date.setdefault(d, row)

    rows = [latest_by_date[d] for d in sorted(latest_by_date.keys(), reverse=True)[:2]]
    if not rows:
        return None
    latest = _finite_number(rows[0].get("c"))
    previous = _finite_number(rows[1].get("c")) if len(rows) > 1 else None
    if latest is None or latest <= 0:
        return None
    change = latest - previous if previous is not None and previous > 0 else None
    change_pct = (
        (change / previous) * 100.0
        if change is not None and previous is not None and previous > 0
        else None
    )
    return IndexItem(
        symbol=display,
        name=f"{name} ({proxy})",
        value=latest,
        change=change,
        change_pct=change_pct,
        market=market_group,
        source="db",
    )


@router.get("/indices", response_model=IndicesResponse)
async def get_indices(
    settings: Settings = Depends(get_settings),
) -> IndicesResponse:
    now = time.monotonic()
    cached = _cache.get("all")
    if cached and (now - cached[0]) < _CACHE_TTL:
        return cached[1]

    by_symbol: Dict[str, IndexItem] = {}

    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1) Yahoo (free, unmetered) covers every display symbol in one batch.
        yahoo_quotes = await _fetch_yahoo_batch(client)
        for display, name, market_group in _DISPLAY:
            yahoo_sym = _YAHOO_SYMBOL.get(display)
            q = yahoo_quotes.get(yahoo_sym) if yahoo_sym else None
            if q is not None:
                by_symbol[display] = IndexItem(
                    symbol=display,
                    name=name,
                    value=q["price"],
                    change=q.get("change"),
                    change_pct=q.get("change_pct"),
                    market=market_group,
                    source="live",
                )

        # 2) Only call metered/fallback providers for symbols Yahoo missed.
        #    On the healthy path this is empty, so AlphaVantage (25/day),
        #    Finnhub, and KRX quotas stay untouched and the dashboard can
        #    poll on the free tier without exhausting them.
        missing = [(d, n, m) for d, n, m in _DISPLAY if d not in by_symbol]
        if missing:
            fallback_tasks = []
            for display, name, market_group in missing:
                if display in ("KOSPI", "KOSDAQ"):
                    fallback_tasks.append(
                        _fetch_kr_index(display, name, market_group, settings, client)
                    )
                elif display == "USD/KRW":
                    fallback_tasks.append(_fetch_usdkrw(settings))
                elif display in _PROXY_SYMBOL:
                    fallback_tasks.append(
                        _fetch_finnhub(
                            display, name, _PROXY_SYMBOL[display], market_group, settings
                        )
                    )
            for item in await asyncio.gather(*fallback_tasks):
                if item is not None and item.symbol not in by_symbol:
                    by_symbol[item.symbol] = item

            # 3) Supabase DB proxy bars as the final fallback for the rest.
            still_missing = [
                (d, n, m)
                for d, n, m in missing
                if d not in by_symbol and d in _PROXY_SYMBOL
            ]
            if still_missing:
                db_items = await asyncio.gather(
                    *(
                        _fetch_db_proxy(
                            d, n, _PROXY_SYMBOL[d], m, settings, client
                        )
                        for d, n, m in still_missing
                    )
                )
                for item in db_items:
                    if item is not None and item.symbol not in by_symbol:
                        by_symbol[item.symbol] = item

    items = [by_symbol[s] for s, _n, _m in _DISPLAY if s in by_symbol]
    response = IndicesResponse(
        items=items,
        updated_at=datetime.now(tz=timezone.utc).isoformat(),
    )
    _cache["all"] = (now, response)
    return response
