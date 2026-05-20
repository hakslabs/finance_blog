"""Helper for loading the blog-supported symbol universe.

The blog only covers stocks that sit in KOSPI200, NASDAQ100, or S&P500.
Every stock-event ingest script filters against `load_universe()`
before upserting so we don't pile thousands of irrelevant rows into
`stock_calendar_events`.

Reads from Supabase `index_constituents` (mig 0026, seeded by
`scripts/seed_index_constituents.py`). Returns separate KR / US sets
because the ingest scripts hit either-or providers (DART vs Finnhub /
Polygon), and falls back to empty sets — callers should refuse to run
if the universe is empty rather than silently flood the DB.
"""

from __future__ import annotations

import os
import sys
from typing import Dict, Optional, Set, Tuple

import httpx


def load_universe(
    supabase_url: Optional[str] = None,
    service_key: Optional[str] = None,
) -> Tuple[Set[str], Set[str]]:
    """Return (us_universe, kr_universe) as sets of uppercased symbols.

    us_universe = members of SP500 ∪ NDX
    kr_universe = members of KOSPI200 (6-digit codes, no '.' suffix)
    """
    supabase_url = supabase_url or os.environ.get("SUPABASE_URL")
    service_key = service_key or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not (supabase_url and service_key):
        print("[universe] SUPABASE env missing — returning empty sets", file=sys.stderr)
        return set(), set()

    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Accept": "application/json",
    }
    url = f"{supabase_url.rstrip('/')}/rest/v1/index_constituents"
    try:
        with httpx.Client(timeout=20.0) as client:
            resp = client.get(
                url,
                params={"select": "index_code,symbol", "limit": "5000"},
                headers=headers,
            )
    except httpx.HTTPError as exc:
        print(f"[universe] fetch failed: {exc}", file=sys.stderr)
        return set(), set()
    if resp.status_code >= 400:
        print(f"[universe] {resp.status_code} {resp.text[:200]}", file=sys.stderr)
        return set(), set()

    us: Set[str] = set()
    kr: Set[str] = set()
    for row in resp.json():
        idx = row.get("index_code")
        sym = (row.get("symbol") or "").strip().upper()
        if not sym:
            continue
        if idx in ("SP500", "NDX"):
            us.add(sym)
        elif idx == "KOSPI200":
            kr.add(sym)
    return us, kr


def require_universe(kind: str = "us") -> Set[str]:
    """Convenience: load and crash with a clear message if empty.

    Use at the top of an ingest script so we never accidentally bypass
    the universe filter and flood the DB.
    """
    us, kr = load_universe()
    chosen = us if kind == "us" else kr
    if not chosen:
        raise SystemExit(
            f"[universe] {kind} universe is empty — run "
            f"`python scripts/seed_index_constituents.py` first"
        )
    return chosen
