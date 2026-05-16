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
from app.sources import ecos, fred


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

# (stat_code, cycle, label, unit, item_code1 or None)
ECOS_SERIES: List[tuple[str, str, str, str, Optional[str]]] = [
    ("722Y001", "D", "한국은행 기준금리",   "%",   "0101000"),
    ("901Y009", "M", "韓 CPI (YoY)",        "%",   "0"),
    ("200Y001", "Q", "韓 GDP 성장률",       "%",   "10101"),
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
    results: List[Indicator] = []

    async def _fred(series_id: str, label: str, unit: str, country: str) -> Indicator:
        try:
            data = await fred.fetch_series_latest(series_id, settings.fred_api_key) if settings.fred_api_key else None
        except HTTPException:
            data = None
        return Indicator(
            series_id=series_id, label=label, country_code=country, unit=unit,
            date=(data or {}).get("date"), value=(data or {}).get("value"),
            previous_value=(data or {}).get("previous_value"), change=(data or {}).get("change"),
        )

    async def _ecos(stat: str, cycle: str, label: str, unit: str, item1: Optional[str]) -> Indicator:
        try:
            data = await ecos.fetch_series_latest(stat, cycle, settings.ecos_api_key, item_code1=item1) if settings.ecos_api_key else None
        except HTTPException:
            data = None
        return Indicator(
            series_id=f"ECOS:{stat}", label=label, country_code="KR", unit=unit,
            date=(data or {}).get("period"), value=(data or {}).get("value"),
            previous_value=(data or {}).get("previous_value"), change=(data or {}).get("change"),
        )

    if settings.fred_api_key:
        results += list(await asyncio.gather(
            *(_fred(sid, lbl, unit, country) for sid, lbl, unit, country in KEY_SERIES),
        ))
    if settings.ecos_api_key:
        results += list(await asyncio.gather(
            *(_ecos(stat, cycle, lbl, unit, item1) for stat, cycle, lbl, unit, item1 in ECOS_SERIES),
        ))
    return IndicatorsResponse(indicators=results)
