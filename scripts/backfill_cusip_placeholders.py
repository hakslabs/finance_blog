"""Backfill 13F-ingest CUSIP-* placeholder instruments with real tickers.

`ingest_13f` creates `instruments` rows like `CUSIP-037833100` whenever a
CUSIP has no `instrument_aliases` entry yet. This script resolves those
CUSIPs to real tickers via OpenFIGI (free, unauthenticated; 25 req/min,
100 CUSIPs/request), then:

  1. Upserts a real instrument row (symbol = ticker, country/exchange
     from OpenFIGI).
  2. Adds `instrument_aliases(cusip → real_id)`.
  3. Rewrites `filing_holdings` rows that point at the placeholder so
     they point at the real instrument; on `(filing_id, real_id)` PK
     collision, sums shares + market_value into the existing row and
     drops the placeholder row.
  4. Deletes the placeholder's alias rows and the placeholder
     `instruments` row.

Unresolved placeholders (no OpenFIGI match, or non-equity) are left in
place with a final report.

Run:
    cd <repo>
    PYTHONPATH=api python scripts/backfill_cusip_placeholders.py
"""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx


ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = ROOT / ".env"
if ENV_FILE.exists():
    for raw in ENV_FILE.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        value = value.strip()
        if value and not value.startswith(("'", '"')):
            hash_idx = value.find(" #")
            if hash_idx >= 0:
                value = value[:hash_idx].rstrip()
        value = value.strip('"').strip("'")
        os.environ.setdefault(key.strip(), value)


SBURL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SRK = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
OPENFIGI_KEY = os.environ.get("OPENFIGI_API_KEY") or None
OPENFIGI_URL = "https://api.openfigi.com/v3/mapping"

if not (SBURL and SRK):
    print("missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
    sys.exit(2)


HEADERS = {"apikey": SRK, "Authorization": f"Bearer {SRK}"}
JSON_HEADERS = {**HEADERS, "Content-Type": "application/json"}


# OpenFIGI exchCode → our (exchange, country) mapping. Conservative; we
# only auto-create instruments for clearly-US listings. Anything else
# leaves the placeholder in place for manual review.
US_EXCH = {
    "UN": "NYSE",   # NYSE
    "UQ": "NASDAQ", # Nasdaq Global Select
    "UR": "NASDAQ", # Nasdaq Global Market
    "UW": "NASDAQ", # Nasdaq Capital Market
    "UA": "NYSE",   # NYSE American
    "UP": "NYSEARCA", # NYSE Arca
    "PK": "OTC",
    "UV": "OTC",
}


def _pick_best(data: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Pick the most useful OpenFIGI record for our needs."""
    if not data:
        return None
    equity = [d for d in data if d.get("marketSector") == "Equity"]
    pool = equity or data
    # Prefer Common Stock / ADR / ETP composite listings on a US exchange.
    PREFERRED_TYPES = {"Common Stock", "Depositary Receipt", "ADR", "ETP",
                       "Open-End Fund", "Closed-End Fund", "REIT"}
    for d in pool:
        if d.get("securityType2") in PREFERRED_TYPES and d.get("exchCode") in US_EXCH:
            return d
    for d in pool:
        if d.get("exchCode") in US_EXCH:
            return d
    for d in pool:
        if d.get("securityType2") in PREFERRED_TYPES:
            return d
    return pool[0]


async def _sb_get(client: httpx.AsyncClient, path: str, params: Dict[str, str]) -> List[Dict[str, Any]]:
    r = await client.get(f"{SBURL}/rest/v1/{path}", params=params, headers=HEADERS)
    r.raise_for_status()
    return r.json()


async def _sb_post(client: httpx.AsyncClient, path: str, body: Any, *, prefer: str = "return=representation", params: Optional[Dict[str, str]] = None) -> Any:
    h = {**JSON_HEADERS, "Prefer": prefer}
    r = await client.post(f"{SBURL}/rest/v1/{path}", json=body, headers=h, params=params or {})
    if r.status_code >= 400:
        raise RuntimeError(f"POST {path} {r.status_code} {r.text[:200]}")
    return r.json() if "representation" in prefer else None


async def _sb_patch(client: httpx.AsyncClient, path: str, body: Dict[str, Any], params: Dict[str, str]) -> int:
    h = {**JSON_HEADERS, "Prefer": "return=minimal"}
    r = await client.patch(f"{SBURL}/rest/v1/{path}", json=body, headers=h, params=params)
    if r.status_code >= 400:
        return r.status_code
    return 0


async def _sb_delete(client: httpx.AsyncClient, path: str, params: Dict[str, str]) -> None:
    r = await client.delete(f"{SBURL}/rest/v1/{path}", params=params, headers=HEADERS)
    if r.status_code >= 400:
        raise RuntimeError(f"DELETE {path} {r.status_code} {r.text[:200]}")


async def resolve_openfigi(client: httpx.AsyncClient, cusips: List[str]) -> Dict[str, Dict[str, Any]]:
    out: Dict[str, Dict[str, Any]] = {}
    headers = {"Content-Type": "application/json"}
    if OPENFIGI_KEY:
        headers["X-OPENFIGI-APIKEY"] = OPENFIGI_KEY
    batch_size = 100 if OPENFIGI_KEY else 10  # unauth limit is 10/req
    sleep_s = 0.3 if OPENFIGI_KEY else 6.5     # 25 req/min unauth
    for i in range(0, len(cusips), batch_size):
        batch = cusips[i:i + batch_size]
        payload = [{"idType": "ID_CUSIP", "idValue": c} for c in batch]
        for attempt in range(3):
            r = await client.post(OPENFIGI_URL, json=payload, headers=headers, timeout=30.0)
            if r.status_code == 429:
                await asyncio.sleep(15)
                continue
            if r.status_code >= 400:
                print(f"  openfigi {r.status_code}: {r.text[:120]}", file=sys.stderr)
                break
            results = r.json()
            for cusip, rec in zip(batch, results):
                pick = _pick_best(rec.get("data") or [])
                if pick:
                    out[cusip] = pick
            break
        await asyncio.sleep(sleep_s)
        if (i // batch_size) % 10 == 0:
            print(f"  openfigi: {i + len(batch)}/{len(cusips)} resolved={len(out)}")
    return out


async def get_or_create_instrument(
    client: httpx.AsyncClient, ticker: str, exchange: str, name: str
) -> Optional[str]:
    # Try existing rows first (US instrument with this symbol on any
    # exchange — we don't want duplicates if 0017's seed put it on a
    # slightly different exchange).
    rows = await _sb_get(
        client, "instruments",
        {"symbol": f"eq.{ticker}", "country_code": "eq.US", "select": "id,exchange", "limit": "5"},
    )
    if rows:
        return rows[0]["id"]
    # Create.
    body = [{
        "symbol": ticker,
        "name": name[:120],
        "exchange": exchange,
        "asset_type": "stock",
        "country_code": "US",
        "currency": "USD",
    }]
    try:
        rep = await _sb_post(
            client, "instruments", body,
            params={"on_conflict": "symbol,exchange"},
            prefer="resolution=merge-duplicates,return=representation",
        )
    except RuntimeError as exc:
        print(f"  create instrument {ticker}/{exchange} failed: {exc}", file=sys.stderr)
        return None
    if rep:
        return rep[0]["id"]
    again = await _sb_get(
        client, "instruments",
        {"symbol": f"eq.{ticker}", "exchange": f"eq.{exchange}", "select": "id", "limit": "1"},
    )
    return again[0]["id"] if again else None


async def rewrite_holdings(
    client: httpx.AsyncClient, placeholder_id: str, real_id: str
) -> Dict[str, int]:
    """Move filing_holdings rows from placeholder_id → real_id, merging
    on (filing_id, real_id) collisions."""
    rows = await _sb_get(
        client, "filing_holdings",
        {
            "instrument_id": f"eq.{placeholder_id}",
            "select": "filing_id,instrument_id,shares,market_value,currency,weight_pct,position_kind,reported_at",
        },
    )
    moved = 0
    merged = 0
    for row in rows:
        existing = await _sb_get(
            client, "filing_holdings",
            {
                "filing_id": f"eq.{row['filing_id']}",
                "instrument_id": f"eq.{real_id}",
                "select": "shares,market_value",
                "limit": "1",
            },
        )
        if existing:
            # Merge: drop placeholder row, add its values to the existing row.
            new_shares = float(existing[0]["shares"] or 0) + float(row["shares"] or 0)
            new_mv = float(existing[0].get("market_value") or 0) + float(row.get("market_value") or 0)
            await _sb_patch(
                client, "filing_holdings",
                {"shares": new_shares, "market_value": new_mv},
                {"filing_id": f"eq.{row['filing_id']}", "instrument_id": f"eq.{real_id}"},
            )
            await _sb_delete(
                client, "filing_holdings",
                {"filing_id": f"eq.{row['filing_id']}", "instrument_id": f"eq.{placeholder_id}"},
            )
            merged += 1
        else:
            await _sb_patch(
                client, "filing_holdings",
                {"instrument_id": real_id},
                {"filing_id": f"eq.{row['filing_id']}", "instrument_id": f"eq.{placeholder_id}"},
            )
            moved += 1
    return {"moved": moved, "merged": merged}


async def main() -> None:
    async with httpx.AsyncClient(timeout=30.0) as client:
        print("loading placeholder instruments…")
        placeholders = await _sb_get(
            client, "instruments",
            {"symbol": "like.CUSIP-*", "select": "id,symbol,name"},
        )
        print(f"  found {len(placeholders)} CUSIP-* placeholders")

        cusip_to_ph: Dict[str, Dict[str, Any]] = {}
        for p in placeholders:
            sym = p.get("symbol") or ""
            if sym.startswith("CUSIP-"):
                cusip_to_ph[sym[len("CUSIP-"):]] = p
        cusips = list(cusip_to_ph.keys())

        print(f"resolving {len(cusips)} CUSIPs via OpenFIGI ({'authed' if OPENFIGI_KEY else 'unauth'})…")
        figi = await resolve_openfigi(client, cusips)
        print(f"  resolved {len(figi)}/{len(cusips)} ({100*len(figi)/max(len(cusips),1):.1f}%)")

        moved_total = 0
        merged_total = 0
        retired = 0
        skipped_non_us = 0
        skipped_no_ticker = 0
        for cusip, rec in figi.items():
            ph = cusip_to_ph[cusip]
            ticker = (rec.get("ticker") or "").strip()
            exch_code = rec.get("exchCode") or ""
            exchange = US_EXCH.get(exch_code)
            if not ticker:
                skipped_no_ticker += 1
                continue
            if not exchange:
                skipped_non_us += 1
                continue
            name = rec.get("name") or ph.get("name") or ticker
            real_id = await get_or_create_instrument(client, ticker, exchange, name)
            if not real_id:
                continue
            # Add alias (placeholder may have had one with this CUSIP from
            # an old sec_13f source — replace it via PK on (alias_kind,
            # alias_value) by deleting old then inserting).
            await _sb_delete(
                client, "instrument_aliases",
                {"alias_kind": "eq.cusip", "alias_value": f"eq.{cusip}"},
            )
            try:
                await _sb_post(
                    client, "instrument_aliases",
                    [{"instrument_id": real_id, "alias_kind": "cusip",
                      "alias_value": cusip, "source": "openfigi_backfill"}],
                    prefer="return=minimal",
                )
            except RuntimeError as exc:
                print(f"  alias {cusip}: {exc}", file=sys.stderr)

            res = await rewrite_holdings(client, ph["id"], real_id)
            moved_total += res["moved"]
            merged_total += res["merged"]

            # Drop placeholder instrument now that nothing references it.
            try:
                await _sb_delete(client, "instruments", {"id": f"eq.{ph['id']}"})
                retired += 1
            except RuntimeError as exc:
                print(f"  drop {ph['symbol']}: {exc}", file=sys.stderr)

        print()
        print(f"retired placeholders: {retired}")
        print(f"  holdings moved:  {moved_total}")
        print(f"  holdings merged: {merged_total}")
        print(f"  skipped (no ticker):  {skipped_no_ticker}")
        print(f"  skipped (non-US exch): {skipped_non_us}")
        print(f"  unresolved (no OpenFIGI match): {len(cusips) - len(figi)}")


if __name__ == "__main__":
    asyncio.run(main())
