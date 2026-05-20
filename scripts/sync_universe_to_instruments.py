"""Promote every member of blog_index_universe into `instruments`.

Background: the `refresh_kr_daily` / `refresh_us_daily` jobs only write
bars for symbols that already exist in `public.instruments`. The
universe table (`blog_index_universe`) holds 199 KOSPI200 + 101
NASDAQ100 + 503 S&P500 members but the instruments table is missing
most of the KOSPI200 ones, so KR daily refreshes dropped almost
every row on the floor.

This script reads blog_index_universe and upserts missing rows into
instruments with the minimum-required columns. Symbol case is
preserved as KRX expects 6-digit numeric codes (no upper-case
transform needed; the table only enforces uppercase on alphabetics).

Run once before the next backfill:
    PYTHONPATH=api python scripts/sync_universe_to_instruments.py
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Dict, List

import httpx


# ── Repo-root .env loader ─────────────────────────────────────────────
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


def _sb(service_key: str):
    return {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def main() -> int:
    base = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not base or not key:
        print("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        return 1
    headers = _sb(key)

    with httpx.Client(timeout=20.0, headers=headers) as client:
        # 1. Load blog universe
        r = client.get(f"{base}/rest/v1/blog_index_universe",
                       params={"select": "index_code,symbol,name", "limit": "5000"})
        if r.status_code >= 400:
            print(f"failed to load universe: {r.status_code} {r.text[:200]}", file=sys.stderr)
            return 1
        universe = r.json() or []
        print(f"Universe rows: {len(universe)}")

        # 2. Load existing instruments to skip dupes by (symbol, exchange).
        r = client.get(f"{base}/rest/v1/instruments",
                       params={"select": "symbol,exchange", "limit": "10000"})
        if r.status_code >= 400:
            print(f"failed to load instruments: {r.status_code}", file=sys.stderr)
            return 1
        existing = {(row["symbol"], row["exchange"]) for row in r.json() or []}
        print(f"Existing instruments: {len(existing)}")

        # 3. Build rows to upsert.
        to_upsert: List[Dict] = []
        for u in universe:
            idx = u["index_code"]
            sym = (u.get("symbol") or "").strip()
            name = (u.get("name") or sym).strip()
            if not sym:
                continue
            if idx == "KOSPI200":
                exchange, country, currency = "KOSPI", "KR", "KRW"
                # KRX ingest writes bars under "<code>.KS" / "<code>.KQ",
                # so instruments.symbol must carry the suffix or the
                # refresh job's lookup misses every row.
                symbol = sym if "." in sym else f"{sym}.KS"
            else:
                # SP500 / NDX → NYSE/NASDAQ. We don't know which per row;
                # default to NASDAQ since that's where most of the
                # high-volume members trade, and it doesn't affect the
                # price ingest path (Polygon grouped-daily ignores it).
                exchange, country, currency = "NASDAQ", "US", "USD"
                symbol = sym.upper()
            if (symbol, exchange) in existing:
                continue
            to_upsert.append({
                "symbol": symbol,
                "name": name,
                "exchange": exchange,
                "asset_type": "stock",
                "country_code": country,
                "currency": currency,
                "is_active": True,
            })
        print(f"To upsert: {len(to_upsert)}")
        if not to_upsert:
            print("Nothing to do.")
            return 0

        # 4. POST in chunks. on_conflict = (symbol, exchange) unique idx.
        # Dedupe inside the batch — same (symbol, exchange) can appear
        # in multiple universe rows (e.g. AAPL in SP500 *and* NDX).
        dedup: Dict[tuple, Dict] = {}
        for row in to_upsert:
            dedup[(row["symbol"], row["exchange"])] = row
        to_upsert = list(dedup.values())
        print(f"After dedupe: {len(to_upsert)}")

        post_headers = {**headers, "Prefer": "resolution=merge-duplicates,return=representation"}
        CHUNK = 200
        written = 0
        for i in range(0, len(to_upsert), CHUNK):
            chunk = to_upsert[i : i + CHUNK]
            r = client.post(
                f"{base}/rest/v1/instruments",
                params={"on_conflict": "symbol,exchange"},
                headers=post_headers,
                content=json.dumps(chunk),
                timeout=30.0,
            )
            if r.status_code >= 400:
                print(f"  upsert failed: {r.status_code} {r.text[:200]}", file=sys.stderr)
                continue
            written += len(r.json())
        print(f"Upserted {written} new instruments rows.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
