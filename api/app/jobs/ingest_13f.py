"""13F-HR holdings ingestion.

For each `masters` row with `filer_cik`, fetch the most recent 13F-HR
from SEC EDGAR, parse the InformationTable XML, and upsert into
`filings` + `filing_holdings`. The `master_filings` view (PR-24) then
returns the joined rows for /v1/masters/{slug}/holdings.

Instrument resolution: holdings reference `instruments(id)` via FK. We
look up by CUSIP in `instrument_aliases`. When unknown, we create a
placeholder instrument (symbol = `CUSIP-<first 9>`, exchange = `UNKNOWN`)
plus an alias row so the FK is satisfied; a later enrichment job can
rewrite the placeholder to the real ticker.

This job is heavy by Finnhub/Vercel-cron standards but acceptable as a
weekly run: 8 masters × 1 filing × ~50 holdings = ~400 inserts.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import httpx

from app.settings import Settings
from app.sources import sec


log = logging.getLogger(__name__)


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
        raise IngestionError(f"sb GET {path} {resp.status_code} {resp.text[:200]}")
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


async def _resolve_or_create_instrument(
    client: httpx.AsyncClient,
    settings: Settings,
    cusip: str,
    name: str,
) -> Optional[str]:
    if not cusip:
        return None
    # Try alias lookup first.
    rows = await _sb_get(
        client, settings, "instrument_aliases",
        {
            "alias_kind": "eq.cusip",
            "alias_value": f"eq.{cusip}",
            "select": "instrument_id",
            "limit": "1",
        },
    )
    if rows:
        return rows[0]["instrument_id"]
    # Create placeholder instrument.
    placeholder_symbol = f"CUSIP-{cusip[:9]}"
    safe_name = (name or placeholder_symbol)[:120]
    created = await _sb_upsert(
        client, settings, "instruments",
        [
            {
                "symbol": placeholder_symbol,
                "name": safe_name,
                "exchange": "UNKNOWN",
                "asset_type": "stock",
                "country_code": "US",
                "currency": "USD",
            }
        ],
        on_conflict="symbol,exchange",
        return_repr=True,
    )
    if not created:
        # Fetch back.
        again = await _sb_get(
            client, settings, "instruments",
            {
                "symbol": f"eq.{placeholder_symbol}",
                "exchange": "eq.UNKNOWN",
                "select": "id",
                "limit": "1",
            },
        )
        if not again:
            return None
        instrument_id = again[0]["id"]
    else:
        instrument_id = created[0]["id"]
    # Insert alias (ignore conflicts).
    await _sb_upsert(
        client, settings, "instrument_aliases",
        [{"instrument_id": instrument_id, "alias_kind": "cusip", "alias_value": cusip, "source": "sec_13f"}],
        on_conflict="alias_kind,alias_value",
    )
    return instrument_id


async def _ingest_one_master(
    client: httpx.AsyncClient,
    settings: Settings,
    master: Dict[str, Any],
) -> Dict[str, Any]:
    cik = master.get("filer_cik")
    if not cik:
        return {"slug": master["slug"], "status": "skip", "reason": "no_cik"}
    user_agent = settings.sec_user_agent or "finance-lab/1.0 dev@example.com"

    accessions = await sec.list_filings_by_form(cik, "13F-HR", user_agent, limit=1)
    if not accessions:
        return {"slug": master["slug"], "status": "skip", "reason": "no_13f"}
    acc = accessions[0]
    holdings = await sec.fetch_information_table(cik, acc["accession"], user_agent)
    if not holdings:
        return {"slug": master["slug"], "status": "skip", "reason": "empty_table"}

    # Upsert filing row.
    filed_at = acc.get("filed_at")
    filed_at_iso = (
        datetime.strptime(filed_at, "%Y-%m-%d").replace(tzinfo=timezone.utc).isoformat()
        if filed_at
        else datetime.now(tz=timezone.utc).isoformat()
    )
    filing_payload = [
        {
            "filer_kind": "institution",
            "filer_name": master["name"],
            "filer_cik": cik,
            "form_kind": "13F",
            "accession_no": acc["accession"],
            "filed_at": filed_at_iso,
            "source": "sec",
            "url": acc.get("url"),
            "summary": f"13F-HR · {len(holdings)} positions",
        }
    ]
    rep = await _sb_upsert(
        client, settings, "filings", filing_payload,
        on_conflict="source,accession_no", return_repr=True,
    )
    filing_id = rep[0]["id"] if rep else None
    if not filing_id:
        again = await _sb_get(
            client, settings, "filings",
            {
                "source": "eq.sec",
                "accession_no": f"eq.{acc['accession']}",
                "select": "id",
                "limit": "1",
            },
        )
        if not again:
            raise IngestionError(f"filing upsert returned nothing for {acc['accession']}")
        filing_id = again[0]["id"]

    # Aggregate by (cusip, put_call) — a single filer often reports the same
    # CUSIP across multiple managers; one filing_holdings row per
    # (filing, instrument, position_kind).
    bucket: Dict[Tuple[str, str], Dict[str, Any]] = {}
    for h in holdings:
        pc = (h.get("put_call") or "").upper()
        position_kind = "put" if pc == "PUT" else "call" if pc == "CALL" else "long"
        key = (h["cusip"], position_kind)
        if key not in bucket:
            bucket[key] = {
                "cusip": h["cusip"],
                "name": h["name"],
                "shares": 0.0,
                "value_usd": 0,
                "position_kind": position_kind,
            }
        bucket[key]["shares"] += h["shares"]
        bucket[key]["value_usd"] += h["value_usd"]

    total_value = sum(b["value_usd"] for b in bucket.values()) or 1
    holding_rows: List[Dict[str, Any]] = []
    skipped = 0
    seen_inst: set[Tuple[str, str]] = set()
    for b in bucket.values():
        instrument_id = await _resolve_or_create_instrument(
            client, settings, b["cusip"], b["name"]
        )
        if not instrument_id:
            skipped += 1
            continue
        inst_key = (instrument_id, b["position_kind"])
        if inst_key in seen_inst:
            # Two CUSIPs map to the same instrument (e.g. cross-listings) —
            # collapse into the earlier row to keep the PK unique.
            for existing in holding_rows:
                if existing["instrument_id"] == instrument_id and existing["position_kind"] == b["position_kind"]:
                    existing["shares"] += b["shares"]
                    existing["market_value"] = (existing.get("market_value") or 0) + b["value_usd"]
                    break
            continue
        seen_inst.add(inst_key)
        weight = (b["value_usd"] / total_value) * 100 if total_value else 0
        weight = round(min(max(weight, 0), 100), 6)
        holding_rows.append(
            {
                "filing_id": filing_id,
                "instrument_id": instrument_id,
                "shares": b["shares"],
                "market_value": b["value_usd"],
                "currency": "USD",
                "weight_pct": weight,
                "position_kind": b["position_kind"],
            }
        )

    # Replace existing holdings for this filing to avoid stale rows.
    await client.delete(
        f"{settings.supabase_url.rstrip('/')}/rest/v1/filing_holdings",
        params={"filing_id": f"eq.{filing_id}"},
        headers=_sb_headers(settings),
    )
    await _sb_upsert(
        client, settings, "filing_holdings", holding_rows,
        on_conflict="filing_id,instrument_id",
    )

    return {
        "slug": master["slug"],
        "status": "ok",
        "accession": acc["accession"],
        "holdings_written": len(holding_rows),
        "holdings_skipped": skipped,
    }


async def run(settings: Settings) -> Dict[str, Any]:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise IngestionError("supabase config missing")
    async with httpx.AsyncClient(timeout=30.0) as client:
        masters = await _sb_get(
            client, settings, "masters",
            {
                "select": "slug,name,filer_cik",
                "filer_cik": "not.is.null",
                "order": "name.asc",
            },
        )
        results: List[Dict[str, Any]] = []
        for m in masters:
            try:
                results.append(await _ingest_one_master(client, settings, m))
            except IngestionError as exc:
                results.append({"slug": m["slug"], "status": "error", "error": str(exc)[:200]})
            await asyncio.sleep(0.5)  # be kind to SEC (10 req/s policy)
    return {"masters": len(results), "results": results}


def main() -> Tuple[int, Dict[str, Any]]:
    from app.settings import get_settings

    result = asyncio.run(run(get_settings()))
    print(result)
    return 0, result


if __name__ == "__main__":
    main()
