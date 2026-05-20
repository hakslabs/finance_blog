"""Ingest upcoming dividend ex-dates from Polygon into stock_calendar_events.

Pulls Polygon's `/v3/reference/dividends` (covers US equities; free tier
has access) for ex-dividend dates in [today, today + weeks_ahead]. Each
row is upserted via Supabase PostgREST on the unique constraint
(source, symbol, event_type, scheduled_at), so reruns are safe.

Earnings ingest is intentionally **not** in this script: Polygon's
earnings calendar endpoint requires a paid tier. When we get a key for
it (or wire yfinance / Finnhub), add a sibling script
`ingest_polygon_earnings.py` writing `event_type='earnings'` into the
same table.

Run:
    PYTHONPATH=api python scripts/ingest_polygon_dividends.py
    # optional: --weeks-ahead 8 (default 6)

Env required (.env at repo root works):
    POLYGON_API_KEY
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List

import httpx


# ── Repo-root .env loader (must run before lib.index_universe imports) ─
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

sys.path.insert(0, str(ROOT))

from scripts.lib.index_universe import require_universe  # noqa: E402


POLYGON_BASE = "https://api.polygon.io"
RATE_SLEEP_S = 13.0  # free tier ≈ 5 req/min


def fetch_dividends(
    client: httpx.Client, api_key: str, start: date, end: date, limit: int = 1000
) -> List[Dict[str, Any]]:
    """Walk the cursor-paginated Polygon dividends endpoint."""
    rows: List[Dict[str, Any]] = []
    url = f"{POLYGON_BASE}/v3/reference/dividends"
    params: Dict[str, Any] = {
        "ex_dividend_date.gte": start.isoformat(),
        "ex_dividend_date.lte": end.isoformat(),
        "order": "asc",
        "sort": "ex_dividend_date",
        "limit": limit,
        "apiKey": api_key,
    }
    next_url = None
    while True:
        resp = client.get(next_url or url, params=None if next_url else params, timeout=20.0)
        if resp.status_code == 429:
            print(f"  rate-limited, sleeping {RATE_SLEEP_S}s")
            time.sleep(RATE_SLEEP_S)
            continue
        if resp.status_code >= 400:
            print(f"  ! polygon {resp.status_code} {resp.text[:200]}", file=sys.stderr)
            break
        payload = resp.json()
        rows.extend(payload.get("results", []) or [])
        nxt = payload.get("next_url")
        if not nxt:
            break
        # Polygon's next_url already carries the cursor; we just need the key
        next_url = f"{nxt}&apiKey={api_key}" if "apiKey=" not in nxt else nxt
        time.sleep(RATE_SLEEP_S)
    return rows


def upsert_rows(
    client: httpx.Client, supabase_url: str, service_key: str, rows: List[Dict[str, Any]]
) -> int:
    if not rows:
        return 0
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=representation",
    }
    url = f"{supabase_url.rstrip('/')}/rest/v1/stock_calendar_events"
    # PostgREST has a per-request body limit; chunk to be safe.
    CHUNK = 500
    written = 0
    for i in range(0, len(rows), CHUNK):
        chunk = rows[i : i + CHUNK]
        resp = client.post(
            url,
            params={"on_conflict": "source,symbol,event_type,scheduled_at"},
            headers=headers,
            content=json.dumps(chunk),
            timeout=30.0,
        )
        if resp.status_code >= 400:
            print(f"  upsert failed: {resp.status_code} {resp.text[:200]}", file=sys.stderr)
            continue
        written += len(resp.json())
    return written


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--weeks-ahead", type=int, default=6)
    args = parser.parse_args()

    api_key = os.environ.get("POLYGON_API_KEY")
    supabase_url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not (api_key and supabase_url and service_key):
        print("Missing POLYGON_API_KEY / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        return 1

    today = date.today()
    end = today + timedelta(weeks=args.weeks_ahead)
    print(f"Pulling Polygon dividends {today} → {end}")

    universe = require_universe("us")
    print(f"  filtering against {len(universe)} US symbols (SP500 ∪ NDX)")

    with httpx.Client() as client:
        raw = fetch_dividends(client, api_key, today, end)
        print(f"  fetched {len(raw)} dividend rows from Polygon")

        out: List[Dict[str, Any]] = []
        skipped = 0
        for r in raw:
            ticker = (r.get("ticker") or "").upper().strip()
            ex_date = r.get("ex_dividend_date")
            if not ticker or not ex_date:
                continue
            if ticker not in universe:
                skipped += 1
                continue
            # Ex-dividend date is a calendar day; pin to 13:30 UTC like macros
            # so the calendar sorts cleanly alongside FRED rows.
            try:
                ts = datetime.fromisoformat(f"{ex_date}T13:30:00+00:00")
            except ValueError:
                continue
            out.append({
                "symbol": ticker,
                "event_type": "dividend",
                "scheduled_at": ts.astimezone(timezone.utc).isoformat(),
                "cash_amount": r.get("cash_amount"),
                "currency": r.get("currency") or "USD",
                "declaration_date": r.get("declaration_date"),
                "record_date": r.get("record_date"),
                "pay_date": r.get("pay_date"),
                "importance": 1,
                "source": "polygon",
            })

        written = upsert_rows(client, supabase_url, service_key, out)
        print(f"Done. Upserted {written} / {len(out)} dividend rows ({skipped} skipped: out of universe).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
