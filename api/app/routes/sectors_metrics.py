"""Per-market sector rotation metrics."""
from __future__ import annotations

from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.settings import Settings, get_settings


router = APIRouter(prefix="/sectors", tags=["sectors"])


class SectorData(BaseModel):
    sector: str
    etf: Optional[str] = None
    code: Optional[str] = None
    returnDay: float = 0.0
    returnWeek: float = 0.0
    returnMonth: float = 0.0
    returnQuarter: float = 0.0
    rankDay: int = 0
    rankWeek: int = 0
    rankMonth: int = 0
    prevRankMonth: int = 0
    moneyFlow: str = "neutral"
    relativeStrength: float = 1.0


class SectorsResponse(BaseModel):
    items: List[SectorData]


def _service_headers(settings: Settings):
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(503, "upstream_unavailable")
    k = settings.supabase_service_role_key
    return {"apikey": k, "Authorization": f"Bearer {k}", "Accept": "application/json"}


@router.get("", response_model=SectorsResponse)
async def list_sectors(
    market: str = Query("US", pattern="^(US|KR)$"),
    settings: Settings = Depends(get_settings),
) -> SectorsResponse:
    base = settings.supabase_url.rstrip("/")
    async with httpx.AsyncClient(timeout=8.0, headers=_service_headers(settings)) as c:
        # latest date per sector (simplest: order by date desc then de-dup in python)
        r = await c.get(f"{base}/rest/v1/sector_metrics",
                        params={"select": "*", "market": f"eq.{market}",
                                "order": "date.desc", "limit": "200"})
        if r.status_code >= 400:
            return SectorsResponse(items=[])
        rows = r.json()
    seen = set()
    latest = []
    for row in rows:
        if row["sector"] in seen:
            continue
        seen.add(row["sector"])
        latest.append(row)
    return SectorsResponse(items=[
        SectorData(
            sector=row["sector"],
            etf=row.get("etf"),
            code=row.get("code"),
            returnDay=row.get("return_day") or 0.0,
            returnWeek=row.get("return_week") or 0.0,
            returnMonth=row.get("return_month") or 0.0,
            returnQuarter=row.get("return_quarter") or 0.0,
            rankDay=row.get("rank_day") or 0,
            rankWeek=row.get("rank_week") or 0,
            rankMonth=row.get("rank_month") or 0,
            prevRankMonth=row.get("prev_rank_month") or 0,
            moneyFlow=row.get("money_flow") or "neutral",
            relativeStrength=row.get("relative_strength") or 1.0,
        )
        for row in latest
    ])
