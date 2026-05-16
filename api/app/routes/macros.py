"""Live macro indicators from FRED.

Returns the latest observation for a fixed set of key US series. No DB
persistence — values change slowly enough that callers can re-fetch on
demand. Used by the dashboard macro strip.

If FRED_API_KEY is missing or the upstream rate-limits, returns an
empty payload so the page falls back gracefully.
"""

from __future__ import annotations

import asyncio
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.settings import Settings, get_settings
from app.sources import fred


router = APIRouter(prefix="/macros", tags=["macros"])


KEY_SERIES: List[tuple[str, str, str, str]] = [
    # (series_id, label, unit, country_code)
    ("DFF",      "美 연방기금 금리",     "%",   "US"),
    ("DGS10",    "美 10년물 국채금리",   "%",   "US"),
    ("CPIAUCSL", "美 CPI (지수)",        "idx", "US"),
    ("UNRATE",   "美 실업률",            "%",   "US"),
    ("DEXKOUS",  "원/달러 환율",         "₩",   "KR"),
    ("VIXCLS",   "VIX 변동성지수",       "",    "US"),
]


class Indicator(BaseModel):
    series_id: str
    label: str
    country_code: str
    unit: str
    date: Optional[str] = None
    value: Optional[float] = None
    previous_value: Optional[float] = None
    change: Optional[float] = None


class IndicatorsResponse(BaseModel):
    indicators: List[Indicator]


@router.get("/indicators", response_model=IndicatorsResponse)
async def list_indicators(
    settings: Settings = Depends(get_settings),
) -> IndicatorsResponse:
    if not settings.fred_api_key:
        return IndicatorsResponse(indicators=[])

    async def _one(series_id: str, label: str, unit: str, country: str) -> Indicator:
        try:
            data = await fred.fetch_series_latest(series_id, settings.fred_api_key)
        except HTTPException:
            data = None
        return Indicator(
            series_id=series_id,
            label=label,
            country_code=country,
            unit=unit,
            date=(data or {}).get("date"),
            value=(data or {}).get("value"),
            previous_value=(data or {}).get("previous_value"),
            change=(data or {}).get("change"),
        )

    results = await asyncio.gather(
        *(_one(sid, lbl, unit, country) for sid, lbl, unit, country in KEY_SERIES),
        return_exceptions=False,
    )
    return IndicatorsResponse(indicators=list(results))
