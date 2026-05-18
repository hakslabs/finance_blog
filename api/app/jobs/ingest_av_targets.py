"""Alpha Vantage analyst-target ingestion.

Finnhub's `/stock/price-target` is paid-only on the free tier, so
`consensus_snapshots(metric='target_price')` stays empty. AV's `OVERVIEW`
endpoint returns `AnalystTargetPrice` plus the buy/hold/sell distribution
for free, capped at 25 calls/day.

This job rotates through tracked US instruments, calling OVERVIEW for at
most `_SYMBOLS_PER_RUN` symbols per tick (default 20 — leaves headroom
under the daily limit for ad-hoc dev calls). The rotation prefers
instruments that don't yet have a target-price row asof today, then the
ones with the oldest last-asof.

Idempotent via the consensus_snapshots PK
`(instrument_id, fiscal_year, fiscal_period, metric, asof)`.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import date
from typing import Any, Dict, List, Optional, Tuple

import httpx

from app.settings import Settings
from app.sources import alphavantage


log = logging.getLogger(__name__)
_SYMBOLS_PER_RUN = 20  # leave 5 calls of daily AV budget for dev / interactive use


class IngestionError(Exception):
    pass


def _sb_headers(settings: Settings) -> Dict[str, str]:
    return {
        "apikey": settings.supabase_service_role_key or "",
        "Authorization": f"Bearer {settings.supabase_service_role_key or ''}",
        "Accept": "application/json",
    }


async def _sb_get(
    client: httpx.AsyncClient, settings: Settings, path: str, params: Dict[str, str]
) -> List[Dict[str, Any]]:
    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/{path}"
    resp = await client.get(url, params=params, headers=_sb_headers(settings))
    if resp.status_code >= 400:
        raise IngestionError(f"sb GET {path} {resp.status_code} {resp.text[:160]}")
    return resp.json()


async def _sb_upsert(
    client: httpx.AsyncClient,
    settings: Settings,
    path: str,
    rows: List[Dict[str, Any]],
    *,
    on_conflict: Optional[str] = None,
) -> None:
    if not rows:
        return
    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/{path}"
    params: Dict[str, str] = {}
    if on_conflict:
        params["on_conflict"] = on_conflict
    headers = {
        **_sb_headers(settings),
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    resp = await client.post(url, params=params, json=rows, headers=headers)
    if resp.status_code >= 400:
        raise IngestionError(f"sb UPSERT {path} {resp.status_code} {resp.text[:200]}")


async def _pick_rotation(
    client: httpx.AsyncClient, settings: Settings, today: str, limit: int
) -> List[Dict[str, str]]:
    """Return up to `limit` US instruments to refresh this run.

    Priority: never-seen-today first (left-join via PostgREST is awkward,
    so we fetch in two passes), then the ones with the oldest target-price
    asof. Cheap because both queries hit small result sets.
    """
    # 1. Today's already-refreshed symbols.
    refreshed = await _sb_get(
        client, settings, "consensus_snapshots",
        {
            "metric": "eq.target_price",
            "asof": f"eq.{today}",
            "select": "instrument_id",
        },
    )
    skip_ids = {row["instrument_id"] for row in refreshed}

    # 2. Pull more US instruments than we need so we can skip the
    #    already-refreshed ones in memory.
    candidates = await _sb_get(
        client, settings, "instruments",
        {
            "select": "id,symbol",
            "country_code": "eq.US",
            "is_active": "eq.true",
            "asset_type": "eq.stock",
            "order": "symbol.asc",
            "limit": str(limit * 4),
        },
    )
    out: List[Dict[str, str]] = []
    for inst in candidates:
        if inst["id"] in skip_ids:
            continue
        out.append(inst)
        if len(out) >= limit:
            break
    return out


async def _ingest_one(
    client: httpx.AsyncClient,
    settings: Settings,
    inst: Dict[str, str],
    today: str,
) -> Optional[Dict[str, Any]]:
    overview = await alphavantage.fetch_analyst_overview(
        inst["symbol"], settings.alphavantage_api_key or ""
    )
    if not overview:
        return None
    rows = []
    today_d = date.fromisoformat(today)
    if overview.get("target_mean") is not None:
        rows.append({
            "instrument_id": inst["id"],
            "fiscal_year": today_d.year,
            "fiscal_period": 0,
            "metric": "target_price",
            "asof": today,
            "mean": overview["target_mean"],
            "n": overview.get("number_of_analysts"),
            "source": "alphavantage",
        })
    if rows:
        await _sb_upsert(
            client, settings, "consensus_snapshots", rows,
            on_conflict="instrument_id,fiscal_year,fiscal_period,metric,asof",
        )
    return {
        "symbol": inst["symbol"],
        "target_mean": overview.get("target_mean"),
        "n": overview.get("number_of_analysts"),
    }


async def run(settings: Settings) -> Dict[str, Any]:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise IngestionError("supabase config missing")
    if not settings.alphavantage_api_key:
        raise IngestionError("ALPHA_VANTAGE_API_KEY missing")
    today = date.today().isoformat()
    written: List[Dict[str, Any]] = []
    skipped: List[str] = []
    async with httpx.AsyncClient(timeout=15.0) as client:
        targets = await _pick_rotation(client, settings, today, _SYMBOLS_PER_RUN)
        for inst in targets:
            try:
                res = await _ingest_one(client, settings, inst, today)
            except IngestionError as exc:
                skipped.append(f"{inst['symbol']}: {str(exc)[:80]}")
                continue
            if res is None:
                skipped.append(inst["symbol"])
            else:
                written.append(res)
            # AV docs say 5 req/min on burst; sleep 1.5s between calls.
            await asyncio.sleep(1.5)
    return {
        "asof": today,
        "attempted": len(targets),
        "written": len(written),
        "skipped": len(skipped),
        "written_detail": written[:5],
        "skipped_detail": skipped[:5],
    }


def main() -> Tuple[int, Dict[str, Any]]:
    from app.settings import get_settings

    result = asyncio.run(run(get_settings()))
    print(result)
    return 0, result


if __name__ == "__main__":
    main()
