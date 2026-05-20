"""GET /v1/market/indices — dashboard top-row indices, multi-source.

Sourcing strategy (free-tier compatible):
  - US ETF proxies (SPY/QQQ/DIA/USO/GLD/VIXY) → Finnhub /quote
    (intraday, fresh during market hours)
  - USD/KRW → Alpha Vantage CURRENCY_EXCHANGE_RATE (intraday FX)
  - KOSPI / KOSDAQ → Yahoo v7 /quote (intraday; mock fallback on 429)
  - Everything else → mock value with source='mock'

Why not a single source: Polygon free tier is EOD daily-bar only, so
the old proxy-everything approach always showed yesterday's close.
Yahoo's batch endpoint is the cleanest one-shot but their free
endpoints throttle cloud IPs aggressively. Finnhub + AV are stable on
free tier; we keep them for what they're best at and use Yahoo only as
a side-channel for indices the others can't reach.

Cached 60s in-process so a popular dashboard burst doesn't trigger
rate limits.
"""

from __future__ import annotations

import asyncio
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.settings import Settings, get_settings
from app.sources import alphavantage, finnhub, yahoo


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

# US display-symbol → Finnhub ETF proxy (intraday on free tier).
_FINNHUB_PROXY: Dict[str, str] = {
    "S&P 500": "SPY",
    "NASDAQ":  "QQQ",
    "DOW":     "DIA",
    "WTI":     "USO",
    "GOLD":    "GLD",
    "VIX":     "VIXY",
}

# KR display-symbol → Yahoo index ticker (Yahoo is free for indices).
_YAHOO_SYMBOL: Dict[str, str] = {
    "KOSPI":  "^KS11",
    "KOSDAQ": "^KQ11",
}

_CACHE_TTL = 60.0
_cache: Dict[str, Tuple[float, "IndicesResponse"]] = {}

_MOCK_VALUES: Dict[str, Tuple[float, float, float]] = {
    "KOSPI":   (2684.32, 18.42, 0.69),
    "KOSDAQ":  (872.14, 4.21, 0.49),
    "S&P 500": (5812.44, 21.82, 0.38),
    "NASDAQ":  (18024.1, 128.6, 0.72),
    "DOW":     (39142.2, -84.3, -0.22),
    "USD/KRW": (1387.20, -3.10, -0.22),
    "WTI":     (71.84, 0.42, 0.59),
    "GOLD":    (2318.4, 9.4, 0.41),
    "VIX":     (14.2, -0.4, -2.74),
}


class IndexItem(BaseModel):
    symbol: str
    name: str
    value: float
    change: float
    change_pct: float
    market: str
    source: str  # "live" | "mock"


class IndicesResponse(BaseModel):
    items: List[IndexItem]
    updated_at: str


def _mock_item(symbol: str, name: str, market_group: str) -> IndexItem:
    fv, fc, fp = _MOCK_VALUES.get(symbol, (0.0, 0.0, 0.0))
    return IndexItem(
        symbol=symbol, name=name,
        value=fv, change=fc, change_pct=fp,
        market=market_group, source="mock",
    )


async def _fetch_finnhub(
    display: str, name: str, proxy: str, market_group: str,
    settings: Settings,
) -> IndexItem:
    """Use a Finnhub ETF/proxy quote for the *change* signal, but
    project it onto the actual index level. Showing the bare SPY price
    (737) where the dashboard used to show 5,800-ish would confuse
    users — the proxy and the index it tracks are not the same number.
    So we keep the live `change_pct` from the proxy and rebuild
    `value` and `change` on top of the mock baseline.

    The mock baseline drifts over days (it's static), so the absolute
    value will slowly skew until we get a real index-level source
    online (Yahoo when it's not 429'd, or a paid Polygon tier). The
    *direction and percent* stays accurate.
    """
    if not settings.finnhub_api_key:
        return _mock_item(display, name, market_group)
    q = await finnhub.fetch_quote(proxy, settings.finnhub_api_key)
    if not q:
        return _mock_item(display, name, market_group)
    dp = float(q.get("dp") or 0.0)
    baseline, _, _ = _MOCK_VALUES.get(display, (0.0, 0.0, 0.0))
    value = baseline * (1 + dp / 100.0)
    change = value - baseline
    return IndexItem(
        symbol=display, name=name,
        value=value, change=change, change_pct=dp,
        market=market_group, source="live",
    )


async def _fetch_usdkrw(settings: Settings) -> IndexItem:
    name, market_group = "원/달러", "FX"
    if not settings.alphavantage_api_key:
        return _mock_item("USD/KRW", name, market_group)
    r = await alphavantage.fetch_currency_rate(
        "USD", "KRW", settings.alphavantage_api_key,
    )
    if not r or not r.get("rate"):
        return _mock_item("USD/KRW", name, market_group)
    rate = r["rate"]
    # Alpha Vantage doesn't return previous close on this endpoint —
    # compute change/pct against the mock baseline. Better than blank.
    base = _MOCK_VALUES["USD/KRW"][0]
    change = rate - base
    change_pct = (change / base) * 100.0 if base else 0.0
    return IndexItem(
        symbol="USD/KRW", name=name,
        value=rate, change=change, change_pct=change_pct,
        market=market_group, source="live",
    )


async def _fetch_yahoo_batch(client: httpx.AsyncClient) -> Dict[str, Dict[str, float]]:
    """Pull KOSPI + KOSDAQ in one Yahoo call. Returns empty dict on
    429/network failure — caller falls back to mock for those rows."""
    try:
        return await yahoo.fetch_quotes(list(_YAHOO_SYMBOL.values()), client=client)
    except yahoo.YahooError:
        return {}


@router.get("/indices", response_model=IndicesResponse)
async def get_indices(
    settings: Settings = Depends(get_settings),
) -> IndicesResponse:
    now = time.monotonic()
    cached = _cache.get("all")
    if cached and (now - cached[0]) < _CACHE_TTL:
        return cached[1]

    async with httpx.AsyncClient(timeout=10.0) as client:
        # Kick off all three streams in parallel.
        finnhub_tasks = [
            _fetch_finnhub(display, name, _FINNHUB_PROXY[display], market_group, settings)
            for display, name, market_group in _DISPLAY
            if display in _FINNHUB_PROXY
        ]
        usdkrw_task = _fetch_usdkrw(settings)
        yahoo_task = _fetch_yahoo_batch(client)
        finnhub_items, usdkrw_item, yahoo_quotes = await asyncio.gather(
            asyncio.gather(*finnhub_tasks),
            usdkrw_task,
            yahoo_task,
        )

    by_symbol: Dict[str, IndexItem] = {it.symbol: it for it in finnhub_items}
    by_symbol[usdkrw_item.symbol] = usdkrw_item

    # Fill KR rows from the Yahoo batch (or mock if Yahoo returned nothing).
    for display, yahoo_sym in _YAHOO_SYMBOL.items():
        name = next(n for s, n, _m in _DISPLAY if s == display)
        group = next(m for s, _n, m in _DISPLAY if s == display)
        q = yahoo_quotes.get(yahoo_sym)
        if q is not None:
            by_symbol[display] = IndexItem(
                symbol=display, name=name,
                value=q["price"], change=q["change"], change_pct=q["change_pct"],
                market=group, source="live",
            )
        else:
            by_symbol[display] = _mock_item(display, name, group)

    items = [by_symbol[s] for s, _n, _m in _DISPLAY if s in by_symbol]
    response = IndicesResponse(
        items=items,
        updated_at=datetime.now(tz=timezone.utc).isoformat(),
    )
    _cache["all"] = (now, response)
    return response
