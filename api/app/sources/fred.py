"""FRED (St. Louis Fed) provider for key US macro indicators.

Free API, generous rate limit (~120/min). Used live for the macros
endpoint — values change slowly enough that a 60s in-process cache
inside the route is sufficient.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import httpx
from fastapi import HTTPException


BASE_URL = "https://api.stlouisfed.org/fred"


async def _get(path: str, params: Dict[str, Any], api_key: str) -> Any:
    full = {**params, "api_key": api_key, "file_type": "json"}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{BASE_URL}{path}", params=full)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="upstream_unavailable") from exc
    if resp.status_code == 429:
        raise HTTPException(status_code=429, detail="rate_limited")
    if resp.status_code >= 400:
        raise HTTPException(status_code=503, detail="upstream_unavailable")
    return resp.json()


async def fetch_series_latest(
    series_id: str, api_key: str, *, lookback: int = 2
) -> Optional[Dict[str, Any]]:
    """Return the most recent observation + previous one for change calc."""
    data = await _get(
        f"/series/observations",
        {
            "series_id": series_id,
            "sort_order": "desc",
            "limit": lookback,
        },
        api_key,
    )
    obs: List[Dict[str, Any]] = data.get("observations") or []
    if not obs:
        return None
    latest = obs[0]
    prev = obs[1] if len(obs) >= 2 else None

    def _num(s: str | None) -> Optional[float]:
        if s in (None, ".", ""):
            return None
        try:
            return float(s)
        except ValueError:
            return None

    value = _num(latest.get("value"))
    prev_value = _num(prev.get("value")) if prev else None
    change = value - prev_value if (value is not None and prev_value is not None) else None
    return {
        "series_id": series_id,
        "date": latest.get("date"),
        "value": value,
        "previous_value": prev_value,
        "change": change,
    }
