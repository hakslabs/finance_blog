"""Ingest upcoming earnings dates from Finnhub into stock_calendar_events.

Finnhub's `/calendar/earnings` returns the *global* US earnings calendar
in a date range (no symbol filter needed). Each row carries the ticker,
the report date, hour (`bmo`/`amc`/`dmh`), EPS / revenue estimates, and
fiscal period.

Pairs with `ingest_polygon_dividends.py` — both write to the same
`stock_calendar_events` table, distinguished by `event_type`. Idempotent
through the unique constraint (source, symbol, event_type, scheduled_at).

Run:
    PYTHONPATH=api python scripts/ingest_finnhub_earnings.py
    # optional: --weeks-ahead 8 (default 6)

Env required (.env at repo root works):
    FINNHUB_API_KEY
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

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


FINNHUB_BASE = "https://finnhub.io/api/v1"


def fetch_earnings(
    client: httpx.Client, api_key: str, start: date, end: date
) -> List[Dict[str, Any]]:
    resp = client.get(
        f"{FINNHUB_BASE}/calendar/earnings",
        params={
            "from": start.isoformat(),
            "to": end.isoformat(),
            "token": api_key,
        },
        timeout=30.0,
    )
    if resp.status_code >= 400:
        print(f"  ! finnhub {resp.status_code} {resp.text[:200]}", file=sys.stderr)
        return []
    payload = resp.json()
    if not isinstance(payload, dict):
        return []
    return payload.get("earningsCalendar") or []


def _hour_to_offset_h(hour: Optional[str]) -> int:
    """Finnhub `hour`: 'bmo' = before market open (≈ 12:00 UTC),
    'amc' = after market close (≈ 21:00 UTC), 'dmh' / None = midday."""
    if not hour:
        return 16
    if hour == "bmo":
        return 12
    if hour == "amc":
        return 21
    return 16


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

    api_key = os.environ.get("FINNHUB_API_KEY")
    supabase_url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not (api_key and supabase_url and service_key):
        print("Missing FINNHUB_API_KEY / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        return 1

    today = date.today()
    end = today + timedelta(weeks=args.weeks_ahead)
    print(f"Pulling Finnhub earnings {today} → {end}")

    with httpx.Client() as client:
        raw = fetch_earnings(client, api_key, today, end)
        print(f"  fetched {len(raw)} earnings rows")

        out: List[Dict[str, Any]] = []
        for r in raw:
            symbol = (r.get("symbol") or "").upper().strip()
            ev_date = r.get("date")
            if not symbol or not ev_date:
                continue
            try:
                day = date.fromisoformat(ev_date)
            except ValueError:
                continue
            offset_h = _hour_to_offset_h(r.get("hour"))
            ts = datetime(day.year, day.month, day.day, offset_h, 0, 0, tzinfo=timezone.utc)
            # fiscalPeriod field name varies; Finnhub gives `quarter` (int) +
            # `year` (int). Stitch into "Qn FYYYYY" for display.
            quarter = r.get("quarter")
            year = r.get("year")
            fiscal_period = None
            if quarter and year:
                fiscal_period = f"Q{quarter} FY{year}"
            out.append({
                "symbol": symbol,
                "event_type": "earnings",
                "scheduled_at": ts.isoformat(),
                "eps_estimate": r.get("epsEstimate"),
                "eps_actual": r.get("epsActual"),
                "revenue_estimate": r.get("revenueEstimate"),
                "revenue_actual": r.get("revenueActual"),
                "fiscal_period": fiscal_period,
                "importance": 2,  # earnings are inherently market-moving
                "source": "finnhub",
            })

        written = upsert_rows(client, supabase_url, service_key, out)
        print(f"Done. Upserted {written} / {len(out)} earnings rows.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
