"""Ingest Korean earnings & dividend filings from DART into stock_calendar_events.

DART's `/api/list.json` exposes all corporate disclosures filtered by
publication type. We pull two types in a [today - lookback, today]
window and upsert each filing as a calendar event keyed by the filer's
6-digit `stock_code`:

  - pblntf_detail_ty=I001 (잠정실적등) → event_type='earnings'
  - pblntf_detail_ty=B001 (현금ㆍ현물배당결정) → event_type='dividend'

⚠ Known limitations (good enough for a first cut):

  1. DART list filings are BACKWARD-looking. Korean companies generally
     don't pre-announce a specific earnings date the way US ones do —
     the 잠정실적공시 IS the announcement. So the calendar shows
     "recently reported" rather than "upcoming earnings".

  2. For dividends, the date stored here is the **공시일** (resolution
     filing date), NOT the **배당락일** (ex-dividend date). The ex-date
     lives inside the filing's structured fields; enriching that
     requires a follow-up call per filing to a typed endpoint (e.g.
     /api/CmptCshDvdndDcsn.json). Marked TODO at bottom of this file.

  3. Filings without a `stock_code` (non-listed entities) are skipped.

Run:
    PYTHONPATH=api python scripts/ingest_dart_kr_calendar.py
    # optional: --days-back 30 (default 30)

Env required (.env at repo root works):
    DART_API_KEY
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
from typing import Any, Dict, List, Tuple


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


import httpx  # noqa: E402  (imported after env loader)

sys.path.insert(0, str(ROOT))

from scripts.lib.index_universe import require_universe  # noqa: E402


DART_BASE = "https://opendart.fss.or.kr/api"

# (pblntf_detail_ty, event_type, default importance)
FILING_TYPES: List[Tuple[str, str, int]] = [
    ("I001", "earnings", 2),
    ("B001", "dividend", 1),
]


def fetch_filings(
    client: httpx.Client,
    api_key: str,
    *,
    detail_ty: str,
    bgn_de: str,
    end_de: str,
) -> List[Dict[str, Any]]:
    """Walk paginated DART list endpoint, return all rows for the filter."""
    rows: List[Dict[str, Any]] = []
    page = 1
    while True:
        resp = client.get(
            f"{DART_BASE}/list.json",
            params={
                "crtfc_key": api_key,
                "bgn_de": bgn_de,
                "end_de": end_de,
                "pblntf_detail_ty": detail_ty,
                "page_no": str(page),
                "page_count": "100",
                "sort": "date",
                "sort_mth": "desc",
            },
            timeout=20.0,
        )
        if resp.status_code >= 400:
            print(f"  ! dart {resp.status_code} {resp.text[:200]}", file=sys.stderr)
            return rows
        body = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
        if not isinstance(body, dict):
            return rows
        status = body.get("status")
        if status == "013":  # empty results
            return rows
        if status and status != "000":
            print(f"  ! dart status={status} message={body.get('message')}", file=sys.stderr)
            return rows
        page_rows = body.get("list") or []
        rows.extend(page_rows)
        total_pages = int(body.get("total_page") or 1)
        if page >= total_pages:
            return rows
        page += 1
        time.sleep(0.2)  # be polite to DART


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
    parser.add_argument("--days-back", type=int, default=30)
    args = parser.parse_args()

    api_key = os.environ.get("DART_API_KEY")
    supabase_url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not (api_key and supabase_url and service_key):
        print("Missing DART_API_KEY / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        return 1

    today = date.today()
    start = today - timedelta(days=args.days_back)
    bgn = start.strftime("%Y%m%d")
    end = today.strftime("%Y%m%d")
    print(f"Pulling DART filings {start} → {today}")

    universe = require_universe("kr")
    print(f"  filtering against {len(universe)} KOSPI200 symbols")

    total_upserted = 0
    total_skipped = 0
    with httpx.Client() as client:
        for detail_ty, event_type, importance in FILING_TYPES:
            raw = fetch_filings(client, api_key, detail_ty=detail_ty, bgn_de=bgn, end_de=end)
            print(f"  · {detail_ty} ({event_type}): {len(raw)} filings")

            out: List[Dict[str, Any]] = []
            for r in raw:
                stock_code = (r.get("stock_code") or "").strip()
                if not stock_code:
                    # Non-listed filer (예: 자회사 합병공시 등) — skip.
                    continue
                if stock_code not in universe:
                    total_skipped += 1
                    continue
                rcept_dt = r.get("rcept_dt")  # YYYYMMDD
                if not rcept_dt or len(rcept_dt) != 8:
                    continue
                try:
                    day = date(int(rcept_dt[0:4]), int(rcept_dt[4:6]), int(rcept_dt[6:8]))
                except ValueError:
                    continue
                # KRX cash equities settle at 15:30 KST = 06:30 UTC. Pin the
                # filing to that hour so the calendar groups Korean events
                # together rather than interleaving them with US 13:30 UTC.
                ts = datetime(day.year, day.month, day.day, 6, 30, 0, tzinfo=timezone.utc)
                fiscal_period = r.get("report_nm") or None  # full Korean title
                out.append({
                    "symbol": stock_code,
                    "event_type": event_type,
                    "scheduled_at": ts.isoformat(),
                    "fiscal_period": fiscal_period,
                    "importance": importance,
                    "source": "dart",
                })

            written = upsert_rows(client, supabase_url, service_key, out)
            total_upserted += written
            print(f"    upserted {written} / {len(out)} → stock_calendar_events")

    print(f"Done. {total_upserted} Korean calendar rows total ({total_skipped} skipped: out of KOSPI200).")
    return 0


# ──────────────────────────────────────────────────────────────────────
# TODO: ex-dividend date enrichment
#
# B001 filings give us the resolution date, but the actual ex-date
# (배당락일) is a structured field inside DART's typed endpoint for
# 현금ㆍ현물배당결정. Once the endpoint name is confirmed (likely
# `/api/CmptCshDvdndDcsn.json` for KOSPI/KOSDAQ listed companies, with
# `bnsh_recd_de` = 기준일 ≈ ex-date), do a second pass per rcept_no and
# overwrite `scheduled_at` + populate `cash_amount` / `record_date`.
# Per-filing call so wire rate-limiting (DART = 20k req/day cap).
# ──────────────────────────────────────────────────────────────────────


if __name__ == "__main__":
    sys.exit(main())
