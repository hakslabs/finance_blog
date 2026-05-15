"""Polygon.io provider for US daily OHLCV.

See docs/design-docs/first-real-data.md. PR-10 uses the aggregate
endpoint and derives last/change/change_pct from the last two bars in
the returned series. Caching, fallback, and stale handling live in
`routes/quotes.py`; this module only translates the provider payload.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import List

import httpx
from fastapi import HTTPException

from app.models.quotes import Bar, Quote, Range


BASE_URL = "https://api.polygon.io"

_RANGE_DAYS: dict[Range, int] = {
    "1mo": 31,
    "3mo": 93,
    "6mo": 186,
    "1y": 366,
    "5y": 5 * 366,
}


class PolygonError(Exception):
    """Provider-level failure. Caller may fall back or serve stale cache."""


def _from_to_for_range(range_: Range, today: date | None = None) -> tuple[date, date]:
    today = today or datetime.now(tz=timezone.utc).date()
    return today - timedelta(days=_RANGE_DAYS[range_]), today


async def fetch_daily_quote(
    symbol: str,
    range_: Range,
    api_key: str,
    *,
    client: httpx.AsyncClient | None = None,
) -> Quote:
    """Return a populated Quote for `symbol` over `range_`.

    Raises HTTPException(404) for unknown symbol, HTTPException(429) when
    rate-limited, PolygonError otherwise.
    """

    own_client = client is None
    http = client or httpx.AsyncClient(timeout=10.0)
    try:
        bars = await _fetch_bars(http, symbol, range_, api_key)
    finally:
        if own_client:
            await http.aclose()

    if not bars:
        raise HTTPException(status_code=404, detail="not_found")

    return _build_quote(symbol, bars)


def _build_quote(symbol: str, bars: List[Bar]) -> Quote:
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


async def _fetch_bars(
    http: httpx.AsyncClient, symbol: str, range_: Range, api_key: str
) -> List[Bar]:
    start, end = _from_to_for_range(range_)
    url = (
        f"{BASE_URL}/v2/aggs/ticker/{symbol}/range/1/day/"
        f"{start.isoformat()}/{end.isoformat()}"
    )
    params = {"adjusted": "true", "sort": "asc", "apiKey": api_key}
    try:
        response = await http.get(url, params=params)
    except httpx.HTTPError as exc:
        raise PolygonError(str(exc)) from exc

    if response.status_code == 404:
        raise HTTPException(status_code=404, detail="not_found")
    if response.status_code == 429:
        raise HTTPException(status_code=429, detail="rate_limited")
    if response.status_code >= 400:
        raise PolygonError(f"polygon http {response.status_code}")

    payload = response.json()
    if payload.get("status") == "NOT_FOUND":
        raise HTTPException(status_code=404, detail="not_found")

    bars: List[Bar] = []
    for row in payload.get("results") or []:
        bars.append(
            Bar(
                t=datetime.fromtimestamp(row["t"] / 1000, tz=timezone.utc),
                o=row["o"],
                h=row["h"],
                l=row["l"],
                c=row["c"],
                v=int(row["v"]),
            )
        )
    return bars
