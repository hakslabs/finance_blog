"""Finnhub persistence ingestion.

Two pulls per run, kept small so a single cron tick stays under Vercel
hobby-tier timeouts (~10s) and Finnhub free-tier rate-limits (60/min):

- For each tracked US instrument, fetch the last 7 days of
  /company-news and upsert into news_items + news_instruments.
- For each tracked US instrument, fetch /stock/price-target and
  upsert into consensus_snapshots as a `target_price` row asof today.

Idempotent via unique constraints (news_items.unique_external,
consensus_snapshots PK). Limits to 25 symbols per run; rotate via
order=updated_at to cover the full set over multiple runs.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import httpx
from fastapi import HTTPException

from app.settings import Settings
from app.sources import finnhub


log = logging.getLogger(__name__)
_SYMBOLS_PER_RUN = 25


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
        raise IngestionError(f"sb GET {path} {resp.status_code}")
    return resp.json()


async def _sb_upsert(
    client: httpx.AsyncClient,
    settings: Settings,
    path: str,
    rows: List[Dict[str, Any]],
    *,
    on_conflict: Optional[str] = None,
    return_repr: bool = False,
) -> List[Dict[str, Any]]:
    if not rows:
        return []
    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/{path}"
    params: Dict[str, str] = {}
    if on_conflict:
        params["on_conflict"] = on_conflict
    headers = {
        **_sb_headers(settings),
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return="
        + ("representation" if return_repr else "minimal"),
    }
    resp = await client.post(url, params=params, json=rows, headers=headers)
    if resp.status_code >= 400:
        raise IngestionError(f"sb UPSERT {path} {resp.status_code} {resp.text[:200]}")
    return resp.json() if return_repr else []


async def _list_us_instruments(
    client: httpx.AsyncClient, settings: Settings, limit: int
) -> List[Dict[str, str]]:
    return await _sb_get(
        client, settings, "instruments",
        {
            "select": "id,symbol",
            "country_code": "eq.US",
            "exchange": "neq.UNKNOWN",
            "is_active": "eq.true",
            "asset_type": "eq.stock",
            "order": "symbol.asc",
            "limit": str(limit),
        },
    )


async def _ingest_news_for(
    client: httpx.AsyncClient,
    settings: Settings,
    inst: Dict[str, str],
) -> int:
    try:
        raw = await finnhub.fetch_company_news(inst["symbol"], settings.finnhub_api_key, days=7)
    except HTTPException:
        return 0
    if not raw:
        return 0
    news_rows: List[Dict[str, Any]] = []
    for n in raw:
        if not n.get("headline"):
            continue
        news_rows.append(
            {
                "source": "finnhub",
                "external_id": n["id"],
                "title": n["headline"][:1000],
                "url": n.get("url"),
                "summary": (n.get("summary") or "")[:4000] or None,
                "language": "en",
                "published_at": n.get("datetime") or datetime.now(tz=timezone.utc).isoformat(),
            }
        )
    inserted = await _sb_upsert(
        client, settings, "news_items", news_rows,
        on_conflict="source,external_id", return_repr=True,
    )
    if inserted:
        link_rows = [
            {"news_id": row["id"], "instrument_id": inst["id"]}
            for row in inserted
        ]
        await _sb_upsert(
            client, settings, "news_instruments", link_rows,
            on_conflict="news_id,instrument_id",
        )
    return len(inserted)


async def _ingest_consensus_for(
    client: httpx.AsyncClient,
    settings: Settings,
    inst: Dict[str, str],
) -> int:
    try:
        target = await finnhub.fetch_price_target(inst["symbol"], settings.finnhub_api_key)
    except HTTPException:
        return 0
    if not target or target.get("target_mean") is None:
        return 0
    today = date.today()
    row = {
        "instrument_id": inst["id"],
        "fiscal_year": today.year,
        "fiscal_period": 0,
        "metric": "target_price",
        "asof": today.isoformat(),
        "mean": target.get("target_mean"),
        "median": target.get("target_median"),
        "n": target.get("number_of_analysts"),
        "source": "finnhub",
    }
    await _sb_upsert(
        client, settings, "consensus_snapshots", [row],
        on_conflict="instrument_id,fiscal_year,fiscal_period,metric,asof",
    )
    return 1


async def run(settings: Settings) -> Dict[str, Any]:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise IngestionError("supabase config missing")
    if not settings.finnhub_api_key:
        raise IngestionError("FINNHUB_API_KEY missing")
    async with httpx.AsyncClient(timeout=20.0) as client:
        instruments = await _list_us_instruments(client, settings, _SYMBOLS_PER_RUN)
        news_total = 0
        consensus_total = 0
        per_symbol: List[Dict[str, Any]] = []
        for inst in instruments:
            try:
                n = await _ingest_news_for(client, settings, inst)
                c = await _ingest_consensus_for(client, settings, inst)
                news_total += n
                consensus_total += c
                per_symbol.append({"symbol": inst["symbol"], "news": n, "consensus": c})
            except IngestionError as exc:
                per_symbol.append({"symbol": inst["symbol"], "error": str(exc)[:120]})
            await asyncio.sleep(1.1)  # ~55 req/min ceiling
        return {
            "symbols": len(instruments),
            "news_written": news_total,
            "consensus_written": consensus_total,
            "per_symbol": per_symbol,
        }


def main() -> Tuple[int, Dict[str, Any]]:
    from app.settings import get_settings

    result = asyncio.run(run(get_settings()))
    print(result)
    return 0, result


if __name__ == "__main__":
    main()
