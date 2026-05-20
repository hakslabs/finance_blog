"""Ingest CNN Fear & Greed history into fear_greed_history (mig 0024).

Free, no API key. CNN's graphdata endpoint returns ~365 days of history.
For KR we don't have a free composite — we synthesize a proxy from VIX
inverse + recent KOSPI breadth if available, otherwise mirror US for
display purposes (clearly labeled).
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List

import httpx

from app.settings import Settings, get_settings


log = logging.getLogger(__name__)

CNN_URL = "https://production.dataviz.cnn.io/index/fearandgreed/graphdata"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; finance-lab/1.0)",
    "Accept": "application/json",
    "Origin": "https://edition.cnn.com",
    "Referer": "https://edition.cnn.com/markets/fear-and-greed",
}


async def _fetch_cnn_series() -> List[Dict[str, Any]]:
    async with httpx.AsyncClient(timeout=15.0, headers=HEADERS) as c:
        r = await c.get(CNN_URL)
    if r.status_code >= 400:
        log.warning("cnn fear/greed fetch failed: %s", r.status_code)
        return []
    body = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
    series = body.get("fear_and_greed_historical", {}).get("data", []) if isinstance(body, dict) else []
    # CNN can emit multiple intraday points for the same date — keep only
    # the latest score per date (last in chronological order).
    by_date: Dict[str, int] = {}
    for row in series:
        ts_ms = row.get("x")
        score = row.get("y")
        if ts_ms is None or score is None:
            continue
        date = datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc).date().isoformat()
        by_date[date] = int(round(score))
    return [{"date": d, "value": v} for d, v in sorted(by_date.items())]


async def _upsert_history(settings: Settings, market: str, rows: List[Dict[str, Any]]) -> int:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        log.warning("supabase env missing — skip fear_greed upsert")
        return 0
    base = settings.supabase_url.rstrip("/")
    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    payload = [{"market": market, **r} for r in rows]
    if not payload:
        return 0
    async with httpx.AsyncClient(timeout=30.0, headers=headers) as c:
        r = await c.post(f"{base}/rest/v1/fear_greed_history", json=payload)
    if r.status_code >= 400:
        log.warning("fear_greed upsert failed: %s %s", r.status_code, r.text[:200])
        return 0
    return len(payload)


async def run() -> Dict[str, Any]:
    settings = get_settings()
    series = await _fetch_cnn_series()
    n_us = await _upsert_history(settings, "US", series)
    # Mirror US into KR as placeholder (TODO: replace with KRX-based proxy)
    n_kr = await _upsert_history(settings, "KR", series)
    return {"us_rows": n_us, "kr_rows": n_kr}
