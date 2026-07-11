"""KRX OpenAPI provider — KOSPI/KOSDAQ daily OHLCV.

Endpoint: https://data-dbg.krx.co.kr/svc/apis/sto/stk_bydd_trd
Returns: { "OutBlock_1": [ { ISU_CD, ISU_SRT_CD, ISU_ABBRV,
                             TDD_OPNPRC, TDD_HGPRC, TDD_LWPRC,
                             TDD_CLSPRC, ACC_TRDVOL, ... }, ... ] }

Header: AUTH_KEY. Use the KRX_API_KEY env value.
"""

from __future__ import annotations

import asyncio
from datetime import date, timedelta
from typing import Any, Dict, List, Optional

import httpx
from fastapi import HTTPException


BASE_URL = "https://data-dbg.krx.co.kr/svc/apis/sto"
ETP_BASE_URL = "https://data-dbg.krx.co.kr/svc/apis/etp"
INDEX_BASE_URL = "https://data-dbg.krx.co.kr/svc/apis/idx"
_RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}


class KrxError(Exception):
    """Network or shape failure from the official KRX OpenAPI."""


def _to_float(s: Optional[str]) -> Optional[float]:
    if not s:
        return None
    try:
        return float(str(s).replace(",", ""))
    except ValueError:
        return None


async def fetch_index_daily(
    market: str, api_key: str, *,
    lookback_days: int = 7,
    client: Optional[httpx.AsyncClient] = None,
) -> Optional[Dict[str, Any]]:
    """Latest trading-day quote for the KOSPI / KOSDAQ headline index.

    Walks back from today up to `lookback_days` weekdays until KRX
    returns a non-empty row matching the headline index name. Used by
    /v1/market/indices to fill the two KR cards on the dashboard with
    real data instead of mock — KRX has EOD daily aggregates only, so
    during market hours we're showing the previous session's close.

    Returns {price, change, change_pct, date} or None on failure.
    """
    market = market.upper()
    if market == "KOSPI":
        path, headline = "/kospi_dd_trd", "코스피"
    elif market == "KOSDAQ":
        path, headline = "/kosdaq_dd_trd", "코스닥"
    else:
        return None

    own_client = client is None
    http = client or httpx.AsyncClient(timeout=10.0)
    try:
        today = date.today()
        for offset in range(0, lookback_days * 2):
            d = today - timedelta(days=offset)
            if d.weekday() >= 5:
                continue
            try:
                r = await http.get(
                    f"{INDEX_BASE_URL}{path}",
                    params={"basDd": d.strftime("%Y%m%d")},
                    headers={"AUTH_KEY": api_key.strip()},
                )
            except httpx.HTTPError:
                return None
            if r.status_code >= 400:
                return None
            try:
                body = r.json()
            except ValueError:
                return None
            rows = body.get("OutBlock_1") or []
            for row in rows:
                # The headline index has IDX_NM exactly "코스피" / "코스닥"
                # — other rows are sectoral / foreign-included variants.
                if (row.get("IDX_NM") or "").strip() != headline:
                    continue
                price = _to_float(row.get("CLSPRC_IDX"))
                if price is None:
                    continue
                return {
                    "price": price,
                    "change": _to_float(row.get("CMPPREVDD_IDX")) or 0.0,
                    "change_pct": _to_float(row.get("FLUC_RT")) or 0.0,
                    "date": row.get("BAS_DD") or d.strftime("%Y%m%d"),
                }
        return None
    finally:
        if own_client:
            await http.aclose()


def _last_weekday(d: date) -> date:
    """Return the most recent weekday on or before `d`."""
    while d.weekday() >= 5:
        d -= timedelta(days=1)
    return d


async def fetch_kospi_daily(
    api_key: str,
    target: Optional[date] = None,
    *,
    client: Optional[httpx.AsyncClient] = None,
) -> List[Dict[str, Any]]:
    """Return daily bars for the KOSPI universe on `target` (defaults to
    the most recent settled trading day, which is D-2 from today —
    KRX publishes EOD after the 3:30 PM KST close, so D-1 may be
    partial). Empty list on holidays / weekends.
    """
    target_date = _last_weekday(target or date.today() - timedelta(days=2))
    rows = await _fetch_daily_rows(
        f"{BASE_URL}/stk_bydd_trd", api_key, target_date, client=client
    )
    return _parse_ohlcv_rows(rows, target_date, allowed_markets={"KOSPI", "KOSDAQ"})


async def fetch_etf_daily(
    api_key: str,
    target: Optional[date] = None,
    *,
    client: Optional[httpx.AsyncClient] = None,
) -> List[Dict[str, Any]]:
    """Return KRX-listed ETF daily OHLCV for ``target``.

    The stock endpoint does not include ETFs, but dashboard market comparison
    uses KODEX 200 (069500.KS). Keep it in the same EOD ingest path so its
    comparison series cannot silently become older than the stock universe.
    """
    target_date = _last_weekday(target or date.today() - timedelta(days=2))
    rows = await _fetch_daily_rows(
        f"{ETP_BASE_URL}/etf_bydd_trd", api_key, target_date, client=client
    )
    return _parse_ohlcv_rows(rows, target_date)


async def fetch_kr_daily(
    api_key: str,
    target: Optional[date] = None,
) -> List[Dict[str, Any]]:
    """Return all tracked KRX stocks plus ETFs for one trading day."""
    stocks, etfs = await asyncio.gather(
        fetch_kospi_daily(api_key, target=target),
        fetch_etf_daily(api_key, target=target),
    )
    return [*stocks, *etfs]


async def _fetch_daily_rows(
    url: str,
    api_key: str,
    target_date: date,
    *,
    client: Optional[httpx.AsyncClient] = None,
) -> List[Dict[str, Any]]:
    headers = {"AUTH_KEY": api_key.strip()}
    params = {"basDd": target_date.strftime("%Y%m%d")}
    own_client = client is None
    http = client or httpx.AsyncClient(timeout=15.0, headers=headers)
    try:
        for attempt in range(3):
            try:
                response = await http.get(url, params=params, headers=headers)
            except httpx.HTTPError as exc:
                if attempt < 2:
                    await asyncio.sleep(attempt + 1)
                    continue
                raise KrxError(f"KRX network error for {url}: {exc}") from exc
            if response.status_code == 200:
                try:
                    body = response.json()
                except ValueError as exc:
                    raise KrxError(f"KRX invalid JSON for {url}") from exc
                return body.get("OutBlock_1") or []
            if response.status_code in _RETRYABLE_STATUS_CODES and attempt < 2:
                await asyncio.sleep(attempt + 1)
                continue
            raise KrxError(f"KRX HTTP {response.status_code} for {url}")
    finally:
        if own_client:
            await http.aclose()
    raise AssertionError("unreachable")


def _parse_ohlcv_rows(
    rows: List[Dict[str, Any]],
    target_date: date,
    *,
    allowed_markets: Optional[set[str]] = None,
) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for r in rows:
        if allowed_markets is not None and r.get("MKT_NM") not in allowed_markets:
            continue
        code = str(r.get("ISU_CD") or "").strip()
        if not code:
            continue
        if code.isdigit():
            code = code.zfill(6)
        try:
            o = float((r.get("TDD_OPNPRC") or "0").replace(",", ""))
            h = float((r.get("TDD_HGPRC") or "0").replace(",", ""))
            low = float((r.get("TDD_LWPRC") or "0").replace(",", ""))
            c = float((r.get("TDD_CLSPRC") or "0").replace(",", ""))
            v = int((r.get("ACC_TRDVOL") or "0").replace(",", ""))
        except (TypeError, ValueError):
            continue
        if c <= 0 or o <= 0:
            continue
        # KRX ETF and KOSPI codes use the .KS suffix. KOSDAQ uses .KQ.
        suffix = ".KQ" if r.get("MKT_NM") == "KOSDAQ" else ".KS"
        out.append(
            {
                "symbol": f"{code}{suffix}",
                "name": r.get("ISU_NM", "").strip(),
                "exchange": "KRX",
                "date": target_date.isoformat(),
                "o": o, "h": h, "l": low, "c": c, "v": v,
                "market": r.get("MKT_NM"),
            }
        )
    return out
