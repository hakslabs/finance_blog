"""Daily US EOD ingestion job.

Pulls Polygon's grouped-daily endpoint (1 call covers all US-listed
symbols), filters to instruments tracked in `public.instruments`, and
upserts into `price_bars_daily`. Writes `ingestion_runs` rows around
the work so the dashboard can show last_refreshed_at and surface
failures without crashing.

Designed to fit inside a Vercel Cron Job (≤10s on hobby tier): one HTTP
fetch + one batched PostgREST upsert. Idempotent via the composite PK.
"""

from __future__ import annotations

import asyncio
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

import httpx

from app.settings import Settings


POLYGON_GROUPED_URL = (
    "https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/{date}"
)


class IngestionError(Exception):
    """Job-level failure. The caller writes a `failed` ingestion_runs row."""


def _yesterday_us() -> date:
    """Most recent trading session is at most yesterday (US/Eastern).

    We don't try to be clever about market holidays here; Polygon's
    grouped-daily endpoint returns 200 with an empty `results` array on
    non-trading days. The job records that as `succeeded` with
    rows_written=0 — the next day's run picks up the missing bars.
    """
    now = datetime.now(tz=timezone.utc)
    return (now - timedelta(days=1)).date()


async def run(
    settings: Settings,
    *,
    target: Optional[date] = None,
    client: Optional[httpx.AsyncClient] = None,
) -> Dict[str, Any]:
    if not settings.polygon_api_key:
        raise IngestionError("POLYGON_API_KEY missing")
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise IngestionError("supabase config missing")

    target_date = target or _yesterday_us()
    job_name = "us_grouped_daily"
    source = "polygon"

    run_id = await _start_run(settings, job_name, source)

    try:
        instruments_by_symbol = await _fetch_us_instruments(settings)
        own_client = client is None
        http = client or httpx.AsyncClient(timeout=15.0)
        try:
            bars = await _fetch_grouped_daily(http, target_date, settings.polygon_api_key)
        finally:
            if own_client:
                await http.aclose()

        rows = _build_rows(bars, instruments_by_symbol, source)
        await _upsert_bars(settings, rows)

        await _finish_run(
            settings,
            run_id,
            status="succeeded",
            symbols_seen=len(bars),
            rows_written=len(rows),
        )
        return {
            "run_id": str(run_id),
            "target_date": target_date.isoformat(),
            "symbols_seen": len(bars),
            "rows_written": len(rows),
        }
    except Exception as exc:  # noqa: BLE001 — we want any failure logged
        await _finish_run(
            settings,
            run_id,
            status="failed",
            error=str(exc)[:500],
        )
        raise


async def _fetch_us_instruments(settings: Settings) -> Dict[str, str]:
    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/instruments"
    params = {
        "select": "id,symbol",
        "country_code": "eq.US",
        "is_active": "eq.true",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url, params=params, headers=_supabase_headers(settings))
        response.raise_for_status()
    rows = response.json()
    return {row["symbol"]: row["id"] for row in rows}


async def _fetch_grouped_daily(
    http: httpx.AsyncClient, target: date, api_key: str
) -> List[Dict[str, Any]]:
    url = POLYGON_GROUPED_URL.format(date=target.isoformat())
    response = await http.get(url, params={"adjusted": "true", "apiKey": api_key})
    if response.status_code == 429:
        raise IngestionError("polygon rate_limited")
    response.raise_for_status()
    payload = response.json()
    return payload.get("results") or []


def _build_rows(
    bars: List[Dict[str, Any]],
    instruments_by_symbol: Dict[str, str],
    source: str,
) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for bar in bars:
        symbol = bar.get("T")
        instrument_id = instruments_by_symbol.get(symbol)
        if not instrument_id:
            continue
        t_ms = bar.get("t")
        if t_ms is None:
            continue
        t = datetime.fromtimestamp(t_ms / 1000, tz=timezone.utc).date()
        rows.append(
            {
                "instrument_id": instrument_id,
                "t": t.isoformat(),
                "o": bar["o"],
                "h": bar["h"],
                "l": bar["l"],
                "c": bar["c"],
                "v": int(bar["v"]),
                "source": source,
            }
        )
    return rows


async def _upsert_bars(settings: Settings, rows: List[Dict[str, Any]]) -> None:
    if not rows:
        return
    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/price_bars_daily"
    headers = {
        **_supabase_headers(settings),
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(url, json=rows, headers=headers)
        if response.status_code >= 400:
            raise IngestionError(f"upsert failed: {response.status_code} {response.text[:200]}")


async def _start_run(settings: Settings, job_name: str, source: str) -> str:
    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/ingestion_runs"
    payload = [{"job_name": job_name, "source": source, "status": "running"}]
    headers = {
        **_supabase_headers(settings),
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
    return response.json()[0]["id"]


async def _finish_run(
    settings: Settings,
    run_id: str,
    *,
    status: str,
    symbols_seen: Optional[int] = None,
    rows_written: Optional[int] = None,
    error: Optional[str] = None,
) -> None:
    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/ingestion_runs"
    patch: Dict[str, Any] = {
        "status": status,
        "finished_at": datetime.now(tz=timezone.utc).isoformat(),
    }
    if symbols_seen is not None:
        patch["symbols_seen"] = symbols_seen
    if rows_written is not None:
        patch["rows_written"] = rows_written
    if error is not None:
        patch["error"] = error
    headers = {
        **_supabase_headers(settings),
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        await client.patch(
            url, params={"id": f"eq.{run_id}"}, json=patch, headers=headers
        )


def _supabase_headers(settings: Settings) -> Dict[str, str]:
    return {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
    }


def main() -> Tuple[int, Dict[str, Any]]:
    """CLI entrypoint for ad-hoc runs: `uv run python -m app.jobs.refresh_us_daily`."""
    from app.settings import get_settings

    result = asyncio.run(run(get_settings()))
    print(result)
    return 0, result


if __name__ == "__main__":
    main()
