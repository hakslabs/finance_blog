"""CNN Fear & Greed Index (unofficial public JSON endpoint).

No API key. Returns the current composite score 0-100 + rating.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

import httpx
from fastapi import HTTPException


URL = "https://production.dataviz.cnn.io/index/fearandgreed/graphdata"
HEADERS = {
    # CNN's CDN rejects requests without a UA.
    "User-Agent": "Mozilla/5.0 (compatible; finance-lab/1.0)",
    "Accept": "application/json",
    "Origin": "https://edition.cnn.com",
    "Referer": "https://edition.cnn.com/markets/fear-and-greed",
}


async def fetch_fear_greed() -> Optional[Dict[str, Any]]:
    try:
        async with httpx.AsyncClient(timeout=10.0, headers=HEADERS) as client:
            resp = await client.get(URL)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="upstream_unavailable") from exc
    if resp.status_code >= 400:
        return None
    body = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
    fg = body.get("fear_and_greed") if isinstance(body, dict) else None
    if not isinstance(fg, dict):
        return None
    return {
        "value": fg.get("score"),
        "label": fg.get("rating"),
        "previous_close": fg.get("previous_close"),
        "previous_1_week": fg.get("previous_1_week"),
        "previous_1_month": fg.get("previous_1_month"),
        "previous_1_year": fg.get("previous_1_year"),
        "timestamp": fg.get("timestamp"),
    }
