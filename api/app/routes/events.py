"""Economic events calendar from Finnhub.

Returns upcoming macro releases. Falls through to empty when
FINNHUB_API_KEY is missing or upstream fails.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.settings import Settings, get_settings
from app.sources import finnhub


router = APIRouter(prefix="/events", tags=["events"])


class EconomicEvent(BaseModel):
    time: Optional[str] = None
    country: Optional[str] = None
    event: Optional[str] = None
    impact: Optional[str] = None
    actual: Optional[float] = None
    estimate: Optional[float] = None
    prev: Optional[float] = None
    unit: Optional[str] = None


class EventsResponse(BaseModel):
    items: List[EconomicEvent]


@router.get("/economic", response_model=EventsResponse)
async def list_economic_events(
    days_back: int = Query(2, ge=0, le=14),
    days_forward: int = Query(10, ge=1, le=30),
    settings: Settings = Depends(get_settings),
) -> EventsResponse:
    if not settings.finnhub_api_key:
        return EventsResponse(items=[])
    today = date.today()
    start = (today - timedelta(days=days_back)).isoformat()
    end = (today + timedelta(days=days_forward)).isoformat()
    try:
        raw = await finnhub.fetch_economic_calendar(
            settings.finnhub_api_key, from_date=start, to_date=end
        )
    except HTTPException:
        return EventsResponse(items=[])
    items: List[EconomicEvent] = []
    for r in raw:
        country = (r.get("country") or "").upper()
        if country not in ("US", "KR", "EA", "DE", "CN", "JP"):
            continue
        impact = (r.get("impact") or "").lower()
        if impact not in ("medium", "high"):
            continue
        items.append(EconomicEvent(**r))
    items.sort(key=lambda e: e.time or "")
    return EventsResponse(items=items[:25])
