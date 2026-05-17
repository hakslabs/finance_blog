"""Public sentiment indicators (currently CNN Fear & Greed Index)."""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.settings import Settings, get_settings
from app.sources import cnn


router = APIRouter(prefix="/sentiment", tags=["sentiment"])


class FearGreed(BaseModel):
    market: str
    market_code: str
    value: Optional[float] = None
    label: Optional[str] = None
    previous_close: Optional[float] = None
    previous_1_week: Optional[float] = None
    previous_1_month: Optional[float] = None
    previous_1_year: Optional[float] = None
    timestamp: Optional[str] = None


class FearGreedResponse(BaseModel):
    items: List[FearGreed]


@router.get("/fear-greed", response_model=FearGreedResponse)
async def fear_greed(
    _: Settings = Depends(get_settings),
) -> FearGreedResponse:
    try:
        us = await cnn.fetch_fear_greed()
    except HTTPException:
        us = None
    items: List[FearGreed] = []
    if us:
        items.append(
            FearGreed(
                market="미국",
                market_code="US",
                value=us.get("value"),
                label=us.get("label"),
                previous_close=us.get("previous_close"),
                previous_1_week=us.get("previous_1_week"),
                previous_1_month=us.get("previous_1_month"),
                previous_1_year=us.get("previous_1_year"),
                timestamp=us.get("timestamp"),
            )
        )
    return FearGreedResponse(items=items)
