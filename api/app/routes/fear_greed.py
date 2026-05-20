"""Fear & Greed index history (per-market)."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.settings import Settings, get_settings


router = APIRouter(prefix="/sentiment/fear-greed", tags=["sentiment"])


class HistoryPoint(BaseModel):
    date: str
    value: int
    vix: Optional[float] = None
    adr: Optional[float] = None


class FearGreedData(BaseModel):
    market: str
    value: int
    label: str
    vix: Optional[float] = None
    adr: Optional[float] = None
    updatedAt: str
    history: List[HistoryPoint]


def _label(value: int) -> str:
    if value < 25:
        return "극도의 공포"
    if value < 45:
        return "공포"
    if value < 55:
        return "중립"
    if value < 75:
        return "탐욕"
    return "극도의 탐욕"


def _service_headers(settings: Settings):
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(503, "upstream_unavailable")
    k = settings.supabase_service_role_key
    return {"apikey": k, "Authorization": f"Bearer {k}", "Accept": "application/json"}


@router.get("", response_model=FearGreedData)
async def get_fear_greed(
    market: str = Query("US", pattern="^(US|KR)$"),
    days: int = Query(90, ge=1, le=365),
    settings: Settings = Depends(get_settings),
) -> FearGreedData:
    base = settings.supabase_url.rstrip("/")
    async with httpx.AsyncClient(timeout=8.0, headers=_service_headers(settings)) as c:
        r = await c.get(f"{base}/rest/v1/fear_greed_history",
                        params={"select": "date,value,vix,adr",
                                "market": f"eq.{market}",
                                "order": "date.desc",
                                "limit": str(days)})
        if r.status_code >= 400:
            raise HTTPException(r.status_code, r.text[:200])
        rows = r.json()
    if not rows:
        # empty fallback so the page can render
        return FearGreedData(market=market, value=50, label=_label(50),
                             updatedAt=datetime.now(tz=timezone.utc).isoformat(), history=[])
    rows_sorted = sorted(rows, key=lambda x: x["date"])  # asc for chart
    latest = rows_sorted[-1]
    return FearGreedData(
        market=market,
        value=int(latest["value"]),
        label=_label(int(latest["value"])),
        vix=latest.get("vix"),
        adr=latest.get("adr"),
        updatedAt=latest["date"] + "T00:00:00Z",
        history=[HistoryPoint(**row) for row in rows_sorted],
    )
