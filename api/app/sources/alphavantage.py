"""Alpha Vantage fallback for US daily OHLCV.

Per docs/design-docs/data-sources.md: per-symbol top-up when Polygon is
unreachable. Single retry path; not the daily-cron source.

Also exposes `fetch_analyst_overview` for the consensus-target backfill
(Finnhub free tier doesn't include analyst targets; AV's OVERVIEW does,
within a 25 calls/day quota).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx
from fastapi import HTTPException

from app.models.quotes import Bar, Quote, Range


BASE_URL = "https://www.alphavantage.co/query"

_RANGE_DAYS: dict[Range, int] = {
    "1mo": 31,
    "3mo": 93,
    "6mo": 186,
    "1y": 366,
    "5y": 5 * 366,
}


class AlphaVantageError(Exception):
    """Provider-level failure. Caller surfaces stale cache or 503."""


async def fetch_currency_rate(
    from_currency: str, to_currency: str, api_key: str,
    *, client: httpx.AsyncClient | None = None,
) -> Optional[dict]:
    """`CURRENCY_EXCHANGE_RATE` — near-realtime FX. Returns None on
    failure / throttling so the caller falls back to mock."""
    own_client = client is None
    http = client or httpx.AsyncClient(timeout=10.0)
    try:
        try:
            r = await http.get(BASE_URL, params={
                "function": "CURRENCY_EXCHANGE_RATE",
                "from_currency": from_currency,
                "to_currency": to_currency,
                "apikey": api_key,
            })
        except httpx.HTTPError:
            return None
        if r.status_code >= 400:
            return None
        try:
            body = r.json()
        except ValueError:
            return None
    finally:
        if own_client:
            await http.aclose()
    block = body.get("Realtime Currency Exchange Rate") or {}
    if not block:
        return None
    try:
        rate = float(block.get("5. Exchange Rate") or 0.0)
        bid = float(block.get("8. Bid Price") or rate)
        ask = float(block.get("9. Ask Price") or rate)
    except (TypeError, ValueError):
        return None
    return {"rate": rate, "bid": bid, "ask": ask, "ts": block.get("6. Last Refreshed")}


async def fetch_daily_quote(
    symbol: str,
    range_: Range,
    api_key: str,
    *,
    client: httpx.AsyncClient | None = None,
) -> Quote:
    own_client = client is None
    http = client or httpx.AsyncClient(timeout=10.0)
    params = {
        "function": "TIME_SERIES_DAILY",
        "symbol": symbol,
        "outputsize": "full" if range_ in ("1y", "5y") else "compact",
        "apikey": api_key,
    }
    try:
        try:
            response = await http.get(BASE_URL, params=params)
        except httpx.HTTPError as exc:
            raise AlphaVantageError(str(exc)) from exc
    finally:
        if own_client:
            await http.aclose()

    if response.status_code == 429:
        raise HTTPException(status_code=429, detail="rate_limited")
    if response.status_code >= 400:
        raise AlphaVantageError(f"alphavantage http {response.status_code}")

    payload = response.json()
    if "Error Message" in payload:
        raise HTTPException(status_code=404, detail="not_found")
    series = payload.get("Time Series (Daily)")
    if not series:
        # Note / Information keys signal throttling on the free tier.
        raise AlphaVantageError("alphavantage empty series")

    cutoff = (datetime.now(tz=timezone.utc) - timedelta(days=_RANGE_DAYS[range_])).date()
    bars: List[Bar] = []
    for day, ohlcv in series.items():
        d = datetime.fromisoformat(day).date()
        if d < cutoff:
            continue
        t = datetime.combine(d, datetime.min.time(), tzinfo=timezone.utc)
        bars.append(
            Bar(
                t=t,
                o=float(ohlcv["1. open"]),
                h=float(ohlcv["2. high"]),
                l=float(ohlcv["3. low"]),
                c=float(ohlcv["4. close"]),
                v=int(ohlcv["5. volume"]),
            )
        )
    bars.sort(key=lambda b: b.t)
    if not bars:
        raise HTTPException(status_code=404, detail="not_found")

    latest = bars[-1]
    prev_close = bars[-2].c if len(bars) >= 2 else latest.o
    change = latest.c - prev_close
    change_pct = (change / prev_close * 100.0) if prev_close else 0.0
    return Quote(
        symbol=symbol,
        currency="USD",
        last=latest.c,
        change=change,
        change_pct=change_pct,
        as_of=latest.t,
        bars=bars,
        last_refreshed_at=datetime.now(tz=timezone.utc),
        stale=False,
    )


def _to_float(value: Any) -> Optional[float]:
    if value in (None, "", "None", "-"):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _to_int(value: Any) -> Optional[int]:
    f = _to_float(value)
    return int(f) if f is not None else None


async def fetch_analyst_overview(
    symbol: str,
    api_key: str,
    *,
    client: Optional[httpx.AsyncClient] = None,
) -> Optional[Dict[str, Any]]:
    """Return analyst consensus fields from AV `OVERVIEW`.

    Free-tier note: OVERVIEW costs 1 of the daily 25-call budget. Returns
    None on rate limit / missing-key style responses so the caller can
    fall through to whatever data path it already has.
    """
    own_client = client is None
    http = client or httpx.AsyncClient(timeout=10.0)
    params = {"function": "OVERVIEW", "symbol": symbol, "apikey": api_key}
    try:
        try:
            response = await http.get(BASE_URL, params=params)
        except httpx.HTTPError:
            return None
    finally:
        if own_client:
            await http.aclose()
    if response.status_code >= 400:
        return None
    body = response.json() if response.content else {}
    if not isinstance(body, dict) or not body:
        return None
    # AV responds with `{ "Information": "..." }` on quota exhaustion and
    # `{ "Note": "..." }` on burst throttling. Neither is an error code.
    if "Information" in body or "Note" in body:
        return None
    if not body.get("Symbol"):
        return None
    target = _to_float(body.get("AnalystTargetPrice"))
    strong_buy = _to_int(body.get("AnalystRatingStrongBuy")) or 0
    buy = _to_int(body.get("AnalystRatingBuy")) or 0
    hold = _to_int(body.get("AnalystRatingHold")) or 0
    sell = _to_int(body.get("AnalystRatingSell")) or 0
    strong_sell = _to_int(body.get("AnalystRatingStrongSell")) or 0
    total = strong_buy + buy + hold + sell + strong_sell
    if target is None and total == 0:
        return None
    return {
        "target_mean": target,
        "strong_buy": strong_buy,
        "buy": buy,
        "hold": hold,
        "sell": sell,
        "strong_sell": strong_sell,
        "number_of_analysts": total or None,
        "latest_quarter": body.get("LatestQuarter"),
    }
