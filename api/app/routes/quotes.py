"""GET /v1/quotes/{symbol} — DB-backed market data path.

PR-13 makes the DB (`price_bars_daily`) the primary cache. The flow:

1. Try the price_bars_daily repo. If it returns a Quote, that's the
   answer, with `last_refreshed_at` from the most recent succeeded
   `ingestion_runs` row.
2. If the symbol is not in `instruments` or no bars exist yet (first
   deploy, or a brand-new symbol), fall back to the live provider path
   (Polygon → Alpha Vantage), gated by an in-process 60s TTL so a burst
   of cold-start requests doesn't fan out to Polygon's 5/min ceiling.
3. If both fail, return the most recent in-process cache with
   `stale=true`, or 503 if there is nothing to fall back to.

Vercel Functions are stateless across requests, so the in-process TTL
is best-effort. The DB-backed path is the load-bearing cache; the TTL
just absorbs concurrent retries inside one warm function.
"""

from __future__ import annotations

import asyncio
import time
from typing import Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, Query

from app.models.quotes import Quote, Range
from app.repos.prices import PriceRepo, get_price_repo
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


async def _fetch_provider(symbol: str, range_: Range, settings: Settings) -> Quote:
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
    settings: Settings = Depends(get_settings),
    price_repo: Optional[PriceRepo] = Depends(get_price_repo),
) -> Quote:
    if interval != "1d":
        raise HTTPException(status_code=400, detail="bad_request")
    symbol = symbol.upper()

    if price_repo is not None:
        db_quote = await price_repo.fetch_quote(symbol, range_)
        if db_quote is not None:
            return db_quote

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
            fresh = await _fetch_provider(symbol, range_, settings)
        except HTTPException as exc:
            if exc.status_code == 503 and cached is not None:
                _, stale_quote = cached
                return stale_quote.model_copy(update={"stale": True})
            raise

        _cache_put(symbol, range_, fresh)
        return fresh
