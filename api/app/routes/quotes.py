"""GET /v1/quotes/{symbol} — first real market data path.

Caching: in-process TTL of 60s per (symbol, range) pair. On provider
failure, return the most recent cached payload with `stale=true`. When
there is no cache yet, return 503 `upstream_unavailable` per API.md.

Fallback: Polygon → Alpha Vantage. Single attempt each; no parallel
fan-out per data-sources.md (fallback is a circuit, not a race).
"""

from __future__ import annotations

import asyncio
import time
from typing import Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth import get_current_user_id
from app.models.quotes import Quote, Range
from app.settings import Settings, get_settings
from app.sources import alphavantage, polygon


router = APIRouter(prefix="/quotes", tags=["quotes"])

_CACHE_TTL_SECONDS = 60.0
_CACHE: dict[Tuple[str, Range], Tuple[float, Quote]] = {}
_LOCK = asyncio.Lock()


def _cache_get(symbol: str, range_: Range) -> Optional[Tuple[float, Quote]]:
    return _CACHE.get((symbol, range_))


def _cache_put(symbol: str, range_: Range, quote: Quote) -> None:
    _CACHE[(symbol, range_)] = (time.monotonic(), quote)


def _clear_cache() -> None:
    """Test-only helper. Not used at runtime."""
    _CACHE.clear()


async def _fetch_fresh(symbol: str, range_: Range, settings: Settings) -> Quote:
    """Try Polygon, fall back to Alpha Vantage once."""
    polygon_error: Exception | None = None
    if settings.polygon_api_key:
        try:
            return await polygon.fetch_daily_quote(
                symbol, range_, settings.polygon_api_key
            )
        except HTTPException:
            raise
        except polygon.PolygonError as exc:
            polygon_error = exc

    if settings.alphavantage_api_key:
        try:
            return await alphavantage.fetch_daily_quote(
                symbol, range_, settings.alphavantage_api_key
            )
        except HTTPException:
            raise
        except alphavantage.AlphaVantageError as exc:
            raise HTTPException(status_code=503, detail="upstream_unavailable") from exc

    if polygon_error is not None:
        raise HTTPException(status_code=503, detail="upstream_unavailable") from polygon_error
    raise HTTPException(status_code=503, detail="upstream_unavailable")


@router.get("/{symbol}", response_model=Quote)
async def get_quote(
    symbol: str,
    interval: str = Query("1d"),
    range_: Range = Query("6mo", alias="range"),
    _user_id=Depends(get_current_user_id),
    settings: Settings = Depends(get_settings),
) -> Quote:
    if interval != "1d":
        # PR-10 ships daily only; 1h lands when a provider for it is wired.
        raise HTTPException(status_code=400, detail="bad_request")
    symbol = symbol.upper()

    cached = _cache_get(symbol, range_)
    if cached is not None:
        cached_at, quote = cached
        if (time.monotonic() - cached_at) < _CACHE_TTL_SECONDS:
            return quote

    async with _LOCK:
        cached = _cache_get(symbol, range_)
        if cached is not None and (time.monotonic() - cached[0]) < _CACHE_TTL_SECONDS:
            return cached[1]

        try:
            fresh = await _fetch_fresh(symbol, range_, settings)
        except HTTPException as exc:
            if exc.status_code == 503 and cached is not None:
                _, stale_quote = cached
                return stale_quote.model_copy(update={"stale": True})
            raise

        _cache_put(symbol, range_, fresh)
        return fresh
