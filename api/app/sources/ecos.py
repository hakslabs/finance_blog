"""ECOS (한국은행 경제통계시스템) provider — KR macro series.

API: https://ecos.bok.or.kr/api/StatisticSearch/{key}/json/kr/{start}/{end}/{stat_code}/{cycle}/{period_from}/{period_to}

Free, key-based. Cycle codes: D (daily), M (monthly), Q (quarterly), A (annual).
Period format depends on cycle: YYYYMMDD / YYYYMM / YYYYQn / YYYY.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Dict, List, Optional

import httpx
from fastapi import HTTPException


BASE_URL = "https://ecos.bok.or.kr/api"


def _period_window(cycle: str) -> tuple[str, str]:
    today = date.today()
    if cycle == "D":
        start = today - timedelta(days=30)
        return start.strftime("%Y%m%d"), today.strftime("%Y%m%d")
    if cycle == "M":
        start = today.replace(day=1) - timedelta(days=120)
        return start.strftime("%Y%m"), today.strftime("%Y%m")
    if cycle == "Q":
        year = today.year - 1
        return f"{year}Q1", f"{today.year}Q4"
    return str(today.year - 5), str(today.year)


async def fetch_series_latest(
    stat_code: str,
    cycle: str,
    api_key: str,
    *,
    item_code1: Optional[str] = None,
    item_code2: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Return the most recent + previous observations for a series."""
    start_p, end_p = _period_window(cycle)
    parts: List[str] = [
        api_key,
        "json",
        "kr",
        "1",
        "200",
        stat_code,
        cycle,
        start_p,
        end_p,
    ]
    if item_code1:
        parts.append(item_code1)
    if item_code2:
        parts.append(item_code2)
    url = f"{BASE_URL}/StatisticSearch/" + "/".join(parts)
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="upstream_unavailable") from exc
    if resp.status_code >= 400:
        raise HTTPException(status_code=503, detail="upstream_unavailable")
    body = resp.json()
    container = body.get("StatisticSearch") if isinstance(body, dict) else None
    if not container:
        # ECOS returns {"RESULT": {"CODE": "INFO-XXX", "MESSAGE": "..."}} on
        # errors; surface them as 503 so callers can fall back.
        return None
    rows = container.get("row") or []
    if not rows:
        return None
    rows_sorted = sorted(rows, key=lambda r: r.get("TIME", ""))
    latest = rows_sorted[-1]
    prev = rows_sorted[-2] if len(rows_sorted) >= 2 else None

    def _num(s: Any) -> Optional[float]:
        if s in (None, "", "-"):
            return None
        try:
            return float(s)
        except (TypeError, ValueError):
            return None

    value = _num(latest.get("DATA_VALUE"))
    prev_value = _num(prev.get("DATA_VALUE")) if prev else None
    change = value - prev_value if (value is not None and prev_value is not None) else None
    return {
        "stat_code": stat_code,
        "cycle": cycle,
        "period": latest.get("TIME"),
        "value": value,
        "previous_value": prev_value,
        "change": change,
        "unit": latest.get("UNIT_NAME"),
        "name": latest.get("STAT_NAME"),
    }
