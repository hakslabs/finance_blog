"""Ingest upcoming macro events from Finnhub into economic_events.

FRED's /release/dates endpoint turned out to be backward-looking —
most macro releases have no future dates available, so the FRED
ingest yielded ~1 row for the next quarter. Finnhub's
/calendar/economic IS forward-looking and is the same source the
on-page /v1/events route already uses, so this brings the calendar
table in line with the route.

Curates to US/KR (and a few moving-the-world neighbors) and to
impact ∈ {medium, high} so the table stays focused. Idempotent via
the existing (source, calendar_code, scheduled_at) unique constraint;
we set source='finnhub' so this doesn't collide with leftover FRED
rows if both ever co-exist.

Run:
    PYTHONPATH=api python scripts/ingest_finnhub_macro.py
    # optional: --weeks-ahead 12 (default 12)

Env required (.env at repo root works):
    FINNHUB_API_KEY
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional


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


import httpx  # noqa: E402


FINNHUB_BASE = "https://finnhub.io/api/v1"

# Country codes we surface in the blog calendar.
COUNTRY_ALLOW = {"US", "KR", "EA", "DE", "CN", "JP"}
IMPACT_TO_IMPORTANCE = {"high": 3, "medium": 2, "low": 1}


def fetch_calendar(
    client: httpx.Client, api_key: str, start: date, end: date
) -> List[Dict[str, Any]]:
    resp = client.get(
        f"{FINNHUB_BASE}/calendar/economic",
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
    return payload.get("economicCalendar") or []


def _slug_event(event: str) -> str:
    """Turn a Finnhub event name into a stable calendar_code (uppercase
    alphanumerics, joined by underscores, truncated). Combined with
    (country, scheduled_at) this is unique enough for upserts."""
    cleaned = re.sub(r"[^A-Za-z0-9]+", "_", (event or "")).strip("_").upper()
    return cleaned[:50] or "EVENT"


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
    url = f"{supabase_url.rstrip('/')}/rest/v1/economic_events"
    CHUNK = 500
    written = 0
    for i in range(0, len(rows), CHUNK):
        chunk = rows[i : i + CHUNK]
        resp = client.post(
            url,
            params={"on_conflict": "source,calendar_code,scheduled_at"},
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
    parser.add_argument("--weeks-ahead", type=int, default=12)
    args = parser.parse_args()

    api_key = os.environ.get("FINNHUB_API_KEY")
    supabase_url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not (api_key and supabase_url and service_key):
        print("Missing FINNHUB_API_KEY / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        return 1

    today = date.today()
    end = today + timedelta(weeks=args.weeks_ahead)
    print(f"Pulling Finnhub economic calendar {today} → {end}")

    with httpx.Client() as client:
        raw = fetch_calendar(client, api_key, today, end)
        print(f"  fetched {len(raw)} rows total")

        out: List[Dict[str, Any]] = []
        seen_keys: set = set()
        for r in raw:
            country = (r.get("country") or "").upper()
            if country not in COUNTRY_ALLOW:
                continue
            impact = (r.get("impact") or "").lower()
            if impact not in ("medium", "high"):
                continue
            time_str = r.get("time")  # e.g. "2026-05-15 12:30:00"
            if not time_str:
                continue
            try:
                # Finnhub serves UTC timestamps
                dt = datetime.strptime(time_str, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
            except ValueError:
                # Some rows come as just a date — treat as 13:30 UTC
                try:
                    d = date.fromisoformat(time_str[:10])
                    dt = datetime(d.year, d.month, d.day, 13, 30, 0, tzinfo=timezone.utc)
                except ValueError:
                    continue
            event = r.get("event") or "(event)"
            code = f"{country}_{_slug_event(event)}"
            key = (code, dt.isoformat())
            if key in seen_keys:
                continue
            seen_keys.add(key)
            out.append({
                "calendar_code": code,
                "title": event,
                "country_code": country,
                "importance": IMPACT_TO_IMPORTANCE.get(impact, 1),
                "scheduled_at": dt.isoformat(),
                "actual_value": str(r["actual"]) if r.get("actual") is not None else None,
                "forecast_value": str(r["estimate"]) if r.get("estimate") is not None else None,
                "previous_value": str(r["prev"]) if r.get("prev") is not None else None,
                "unit": r.get("unit"),
                "source": "finnhub",
            })

        written = upsert_rows(client, supabase_url, service_key, out)
        print(f"Done. Upserted {written} / {len(out)} macro rows (filtered from {len(raw)}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
