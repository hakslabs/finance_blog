"""Daily KR EOD ingestion job.

Mirrors refresh_us_daily for the Korean market: one KRX API call covers
the full KOSPI+KOSDAQ universe, we filter to instruments tracked in
`public.instruments` (country_code='KR'), and upsert into
`price_bars_daily`.
"""

from __future__ import annotations

import asyncio
from datetime import date
from typing import Any, Dict, List, Optional, Tuple

import httpx

from app.settings import Settings
from app.sources import krx


class IngestionError(Exception):
    pass


def _sb_headers(settings: Settings) -> Dict[str, str]:
    return {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
    }


async def _fetch_kr_instruments(settings: Settings) -> Dict[str, str]:
    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/instruments"
    params = {
        "select": "id,symbol",
        "country_code": "eq.KR",
        "is_active": "eq.true",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, params=params, headers=_sb_headers(settings))
        resp.raise_for_status()
    return {row["symbol"]: row["id"] for row in resp.json()}


async def _upsert_bars(settings: Settings, rows: List[Dict[str, Any]]) -> None:
    if not rows:
        return
    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/price_bars_daily"
    headers = {
        **_sb_headers(settings),
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(url, json=rows, headers=headers)
        if resp.status_code >= 400:
            raise IngestionError(
                f"upsert failed: {resp.status_code} {resp.text[:200]}"
            )


async def run(
    settings: Settings, *, target: Optional[date] = None
) -> Dict[str, Any]:
    if not settings.krx_api_key:
        raise IngestionError("KRX_API_KEY missing")
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise IngestionError("supabase config missing")

    instruments = await _fetch_kr_instruments(settings)
    bars = await krx.fetch_kospi_daily(settings.krx_api_key, target=target)

    rows: List[Dict[str, Any]] = []
    for bar in bars:
        instrument_id = instruments.get(bar["symbol"])
        if not instrument_id:
            continue
        rows.append(
            {
                "instrument_id": instrument_id,
                "t": bar["date"],
                "o": bar["o"], "h": bar["h"], "l": bar["l"], "c": bar["c"],
                "v": bar["v"],
                "source": "krx",
            }
        )
    await _upsert_bars(settings, rows)
    return {
        "target_date": bars[0]["date"] if bars else None,
        "universe_size": len(bars),
        "rows_written": len(rows),
    }


def main() -> Tuple[int, Dict[str, Any]]:
    from app.settings import get_settings

    result = asyncio.run(run(get_settings()))
    print(result)
    return 0, result


if __name__ == "__main__":
    main()
