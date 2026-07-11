"""Yahoo Finance quote source (unauthenticated v7 endpoint).

Used by the dashboard indices endpoint because:
  - Yahoo covers global indices Polygon's free tier doesn't (^KS11 /
    ^KQ11 / ^GSPC / ^DJI / KRW=X / CL=F / GC=F / ^VIX).
  - One request returns up to ~50 symbols, so the dashboard row 1 is a
    single round-trip instead of N parallel proxy quotes.
  - It returns `regularMarketPrice` which is intraday during market
    hours (≈15-min delayed), an upgrade over Polygon free-tier EOD.

Risk: it's an undocumented endpoint. Yahoo can change/break it without
notice. We always send a desktop User-Agent (anonymous calls 401 with
default httpx UA). When every source fails, the indices route omits the
affected item so the UI can render an explicit unavailable state.
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional

import httpx


YAHOO_QUOTE_URL = "https://query1.finance.yahoo.com/v7/finance/quote"

# Yahoo blocks the default httpx UA. A vanilla desktop string is fine.
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/130.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json",
}


class YahooError(Exception):
    """Raised when the v7 endpoint refuses the request or returns
    malformed JSON. Callers handle this by falling back to mock values."""


def _finite_number(value: Any) -> Optional[float]:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if math.isfinite(result) else None


async def fetch_quotes(
    symbols: List[str], client: Optional[httpx.AsyncClient] = None,
) -> Dict[str, Dict[str, Optional[float]]]:
    """Fetch latest quotes for `symbols` in one call.

    Returns a {symbol → {price, change, change_pct, time}} dict.
    Symbols missing from the response are simply absent in the result.
    """
    if not symbols:
        return {}

    own_client = client is None
    http = client or httpx.AsyncClient(timeout=10.0, headers=_HEADERS)
    try:
        try:
            resp = await http.get(
                YAHOO_QUOTE_URL,
                params={"symbols": ",".join(symbols), "lang": "en-US", "region": "US"},
                headers=_HEADERS,
            )
        except httpx.HTTPError as exc:
            raise YahooError(f"network: {exc}") from exc
        if resp.status_code != 200:
            raise YahooError(f"http {resp.status_code}")
        try:
            payload = resp.json()
        except ValueError as exc:
            raise YahooError("non-json body") from exc
    finally:
        if own_client:
            await http.aclose()

    result = (payload.get("quoteResponse") or {}).get("result") or []
    out: Dict[str, Dict[str, Optional[float]]] = {}
    for row in result:
        sym = row.get("symbol")
        price = _finite_number(row.get("regularMarketPrice"))
        if not sym or price is None:
            continue
        out[sym] = {
            "price": price,
            "change": _finite_number(row.get("regularMarketChange")),
            "change_pct": _finite_number(row.get("regularMarketChangePercent")),
            "time": _finite_number(row.get("regularMarketTime")),
        }
    return out
