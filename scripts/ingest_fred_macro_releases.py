"""Ingest upcoming US macro release dates from FRED into economic_events.

For each curated release (CPI, NFP, FOMC, GDP, PCE, Retail Sales, ...)
this script asks FRED's `release/dates` endpoint for the next handful of
scheduled release dates, then upserts them into the
`public.economic_events` table via Supabase PostgREST. Idempotent through
the (source, calendar_code, scheduled_at) unique constraint.

Run:
    PYTHONPATH=api python scripts/ingest_fred_macro_releases.py
    # optional: --weeks-ahead 8 (default 12)

Env required (.env at repo root works):
    FRED_API_KEY
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
from typing import Any, Dict, List

import httpx


# ── Curated release list ──────────────────────────────────────────────
# (FRED release_id, calendar_code, human title, importance 1-3)
RELEASES: List[tuple[int, str, str, int]] = [
    (10,  "US_CPI",     "미 CPI",          3),
    (46,  "US_PPI",     "미 PPI",          2),
    (50,  "US_NFP",     "미 고용 (NFP)",  3),
    (101, "US_FOMC",    "FOMC 회의",       3),
    (53,  "US_GDP",     "미 GDP",          2),
    (54,  "US_PCE",     "미 PCE",          3),
    (9,   "US_RETAIL",  "미 소매판매",    2),
    (291, "US_HOMES",   "미 기존주택판매", 1),
    (180, "US_JOBLESS", "미 신규실업청구", 1),
]


# ── Repo-root .env loader (matches scripts/backfill_us_ytd.py) ────────
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


def fetch_release_dates(
    client: httpx.Client, release_id: int, api_key: str, start: date, end: date
) -> List[str]:
    """Return ISO date strings for scheduled releases in [start, end]."""
    # NOTE: `include_release_dates_with_no_data=true` makes FRED return
    # one row per calendar day in the realtime window — that's how the
    # first ingest ended up with daily FOMC entries. We only want days
    # FRED actually has a release scheduled, so leave that flag OFF.
    resp = client.get(
        "https://api.stlouisfed.org/fred/release/dates",
        params={
            "release_id": str(release_id),
            "api_key": api_key,
            "file_type": "json",
            "realtime_start": start.isoformat(),
            "realtime_end": end.isoformat(),
            "sort_order": "asc",
            "limit": "100",
        },
        timeout=20.0,
    )
    if resp.status_code >= 400:
        print(f"  ! release_id={release_id} → {resp.status_code} {resp.text[:120]}", file=sys.stderr)
        return []
    payload = resp.json()
    dates: List[str] = []
    for row in payload.get("release_dates", []) or []:
        d = row.get("date")
        if d:
            dates.append(d)
    return dates


def upsert_events(
    client: httpx.Client, supabase_url: str, service_key: str, rows: List[Dict[str, Any]]
) -> int:
    if not rows:
        return 0
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        # Resolve conflicts on the unique constraint that already exists.
        "Prefer": "resolution=merge-duplicates,return=representation",
    }
    url = f"{supabase_url.rstrip('/')}/rest/v1/economic_events"
    resp = client.post(
        url,
        params={"on_conflict": "source,calendar_code,scheduled_at"},
        headers=headers,
        content=json.dumps(rows),
        timeout=20.0,
    )
    if resp.status_code >= 400:
        print(f"  upsert failed: {resp.status_code} {resp.text[:200]}", file=sys.stderr)
        return 0
    return len(resp.json())


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--weeks-ahead", type=int, default=12)
    args = parser.parse_args()

    api_key = os.environ.get("FRED_API_KEY")
    supabase_url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not (api_key and supabase_url and service_key):
        print("Missing FRED_API_KEY / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        return 1

    today = date.today()
    end = today + timedelta(weeks=args.weeks_ahead)
    print(f"Pulling FRED release dates from {today} → {end}")

    upserted_total = 0
    with httpx.Client() as client:
        for release_id, code, title, importance in RELEASES:
            dates = fetch_release_dates(client, release_id, api_key, today, end)
            if not dates:
                print(f"  · {code}: 0 dates")
                continue
            rows = []
            for d in dates:
                # FRED gives a date; pin to 13:30 UTC (~8:30 ET, the typical
                # US release time) so timeline ordering is sane.
                ts = datetime.fromisoformat(f"{d}T13:30:00+00:00")
                rows.append({
                    "calendar_code": code,
                    "title": title,
                    "country_code": "US",
                    "importance": importance,
                    "scheduled_at": ts.astimezone(timezone.utc).isoformat(),
                    "source": "fred",
                })
            n = upsert_events(client, supabase_url, service_key, rows)
            upserted_total += n
            print(f"  · {code}: {len(dates)} dates, upserted {n}")
    print(f"Done. Upserted {upserted_total} event rows total.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
