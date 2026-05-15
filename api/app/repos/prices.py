"""Price-bar repository for the DB-backed quote cache (PR-13).

Reads `price_bars_daily` for a symbol-and-range pair. The route layer
falls back to the live Polygon/Alpha Vantage path only when this repo
returns no rows (i.e. before the first cron run for a symbol).
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import List, Optional, Tuple

import httpx
from fastapi import Depends, HTTPException

from app.models.quotes import Bar, Quote, Range
from app.settings import Settings, get_settings


_RANGE_DAYS: dict[Range, int] = {
    "1mo": 31,
    "3mo": 93,
    "6mo": 186,
    "1y": 366,
    "5y": 5 * 366,
}


class PriceRepo:
    def __init__(self, supabase_url: str, service_role_key: str) -> None:
        self._base_url = supabase_url.rstrip("/")
        self._headers = {
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Accept": "application/json",
        }

    async def fetch_quote(self, symbol: str, range_: Range) -> Optional[Quote]:
        instrument = await self._lookup_instrument(symbol)
        if instrument is None:
            return None
        instrument_id, currency = instrument

        bars = await self._fetch_bars(instrument_id, range_)
        if len(bars) < 1:
            return None

        latest = bars[-1]
        prev_close = bars[-2].c if len(bars) >= 2 else latest.o
        change = latest.c - prev_close
        change_pct = (change / prev_close * 100.0) if prev_close else 0.0
        last_refreshed_at = await self._last_run_finished_at() or datetime.now(
            tz=timezone.utc
        )

        return Quote(
            symbol=symbol,
            currency=currency,
            last=latest.c,
            change=change,
            change_pct=change_pct,
            as_of=latest.t,
            bars=bars,
            last_refreshed_at=last_refreshed_at,
            stale=False,
        )

    async def _lookup_instrument(self, symbol: str) -> Optional[Tuple[str, str]]:
        url = f"{self._base_url}/rest/v1/instruments"
        params = {
            "select": "id,currency",
            "symbol": f"eq.{symbol}",
            "limit": "1",
        }
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(url, params=params, headers=self._headers)
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=503, detail="upstream_unavailable") from exc
        if response.status_code >= 400:
            raise HTTPException(status_code=503, detail="upstream_unavailable")
        rows = response.json()
        if not rows:
            return None
        return rows[0]["id"], rows[0]["currency"]

    async def _fetch_bars(self, instrument_id: str, range_: Range) -> List[Bar]:
        cutoff = (datetime.now(tz=timezone.utc) - timedelta(days=_RANGE_DAYS[range_])).date()
        url = f"{self._base_url}/rest/v1/price_bars_daily"
        params = {
            "instrument_id": f"eq.{instrument_id}",
            "t": f"gte.{cutoff.isoformat()}",
            "select": "t,o,h,l,c,v",
            "order": "t.asc",
        }
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(url, params=params, headers=self._headers)
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=503, detail="upstream_unavailable") from exc
        if response.status_code >= 400:
            raise HTTPException(status_code=503, detail="upstream_unavailable")
        bars: List[Bar] = []
        for row in response.json():
            d = date.fromisoformat(row["t"])
            t = datetime.combine(d, datetime.min.time(), tzinfo=timezone.utc)
            bars.append(
                Bar(t=t, o=float(row["o"]), h=float(row["h"]), l=float(row["l"]),
                    c=float(row["c"]), v=int(row["v"]))
            )
        return bars

    async def _last_run_finished_at(self) -> Optional[datetime]:
        url = f"{self._base_url}/rest/v1/ingestion_runs"
        params = {
            "select": "finished_at",
            "status": "eq.succeeded",
            "order": "finished_at.desc",
            "limit": "1",
        }
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(url, params=params, headers=self._headers)
        except httpx.HTTPError:
            return None
        if response.status_code >= 400:
            return None
        rows = response.json()
        if not rows or not rows[0].get("finished_at"):
            return None
        normalized = rows[0]["finished_at"].replace("Z", "+00:00")
        dt = datetime.fromisoformat(normalized)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt


def get_price_repo(settings: Settings = Depends(get_settings)) -> Optional[PriceRepo]:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return None
    return PriceRepo(settings.supabase_url, settings.supabase_service_role_key)
