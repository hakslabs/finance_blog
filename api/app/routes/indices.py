"""GET /v1/market/indices — dashboard top-row indices in one shot.

The Home page Row 1 shows 6 cards: KOSPI / KOSDAQ / S&P 500 / NASDAQ /
DOW / USD-KRW (with WTI / GOLD / BTC / VIX behind further scroll).
Each card needs name, current value, change, change_pct. Six round-trip
calls to /v1/quotes would work but be wasteful — we'd hit Polygon's
rate ceiling on cold starts and the front-end would render in pieces.

This endpoint fans out in parallel inside one request, caches the
combined response in-memory for 60s (Vercel Fluid Compute keeps warm
instances long enough for this to matter), and falls back to mock
values when an upstream call fails so the dashboard never shows blanks
during a Polygon outage.

Each index is mapped to a Polygon-friendly proxy (ETF or index ticker)
since Polygon doesn't expose all global indices directly on the free
tier. KOSPI / KOSDAQ / USD-KRW have no proxy with reliable free-tier
coverage; they return as `stale=true` with the last cached value so the
dashboard still shows a card.
"""

from __future__ import annotations

import asyncio
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.settings import Settings, get_settings
from app.sources import polygon


router = APIRouter(prefix="/market", tags=["market"])


# (symbol shown to user, display name, polygon proxy ticker, market group)
# Symbol is the user-facing label; the proxy is what Polygon understands.
# `market` group is used by the front-end to colour the card and decide
# whether to badge it as 시뮬레이션 when the proxy isn't live.
INDICES: List[Tuple[str, str, Optional[str], str]] = [
    ("KOSPI",   "코스피",       None,    "KR"),
    ("KOSDAQ",  "코스닥",       None,    "KR"),
    ("S&P 500", "S&P 500",      "SPY",   "US"),
    ("NASDAQ",  "나스닥",       "QQQ",   "US"),
    ("DOW",     "다우",         "DIA",   "US"),
    ("USD/KRW", "원/달러",       None,   "FX"),
    ("WTI",     "국제유가 (WTI)", "USO",  "COMM"),
    ("GOLD",    "금",           "GLD",   "COMM"),
    ("VIX",     "공포지수 (VIX)", "VIXY", "VOL"),
]

# In-process cache. Keyed by () (whole response). Vercel Functions are
# stateless across requests but warm instances reuse the dict.
_CACHE_TTL = 60.0
_cache: Dict[str, Tuple[float, "IndicesResponse"]] = {}

# Mock fallback values keep the cards visible during an upstream outage
# (matches the previous mock numbers on the dashboard).
_MOCK_VALUES: Dict[str, Tuple[float, float, float]] = {
    # (value, change, change_pct)
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
    market: str  # KR | US | FX | COMM | VOL
    source: str  # "live" | "mock"


class IndicesResponse(BaseModel):
    items: List[IndexItem]
    # Server-side timestamp when this payload was assembled. Frontend
    # renders a small "업데이트: HH:MM" hint per widget so users can tell
    # when data is fresh vs minutes/hours stale.
    updated_at: str


async def _quote_one(
    symbol: str,
    name: str,
    proxy: Optional[str],
    market_group: str,
    settings: Settings,
    client: httpx.AsyncClient,
) -> IndexItem:
    """Fetch a single index via its Polygon proxy. Falls back to mock."""
    fallback_value, fallback_change, fallback_pct = _MOCK_VALUES.get(symbol, (0.0, 0.0, 0.0))
    if not proxy or not settings.polygon_api_key:
        return IndexItem(
            symbol=symbol, name=name,
            value=fallback_value, change=fallback_change, change_pct=fallback_pct,
            market=market_group, source="mock",
        )
    try:
        quote = await polygon.fetch_daily_quote(
            proxy, "1mo", settings.polygon_api_key, client=client
        )
        return IndexItem(
            symbol=symbol, name=name,
            value=quote.last, change=quote.change, change_pct=quote.change_pct,
            market=market_group, source="live",
        )
    except HTTPException:
        # 404 (unknown) / 429 (rate-limited) / 503 — show mock so the
        # card still renders.
        return IndexItem(
            symbol=symbol, name=name,
            value=fallback_value, change=fallback_change, change_pct=fallback_pct,
            market=market_group, source="mock",
        )
    except Exception:  # noqa: BLE001
        return IndexItem(
            symbol=symbol, name=name,
            value=fallback_value, change=fallback_change, change_pct=fallback_pct,
            market=market_group, source="mock",
        )


@router.get("/indices", response_model=IndicesResponse)
async def get_indices(
    settings: Settings = Depends(get_settings),
) -> IndicesResponse:
    now = time.monotonic()
    cached = _cache.get("all")
    if cached and (now - cached[0]) < _CACHE_TTL:
        return cached[1]

    async with httpx.AsyncClient(timeout=10.0) as client:
        tasks = [
            _quote_one(symbol, name, proxy, market, settings, client)
            for symbol, name, proxy, market in INDICES
        ]
        items = await asyncio.gather(*tasks)

    response = IndicesResponse(
        items=list(items),
        updated_at=datetime.now(tz=timezone.utc).isoformat(),
    )
    _cache["all"] = (now, response)
    return response
