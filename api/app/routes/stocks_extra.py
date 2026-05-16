"""Extra per-symbol read endpoints used by the stock-detail page tabs.

Each endpoint is a thin live-fetch wrapper over a free third-party API.
We do not cache into Supabase here — ingestion lives in a later PR. The
goal is just to put real values on screen now using already-connected
keys (Finnhub, Alpha Vantage, SEC EDGAR).

If the relevant API key is missing or the upstream fails, endpoints
return empty arrays / nulls instead of 500ing so the page stays usable.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.settings import Settings, get_settings
from app.sources import finnhub, sec


router = APIRouter(prefix="/stocks", tags=["stocks"])


class NewsItem(BaseModel):
    id: str
    headline: str
    summary: Optional[str] = None
    source: Optional[str] = None
    url: Optional[str] = None
    category: Optional[str] = None
    datetime: Optional[str] = None
    image: Optional[str] = None


class NewsResponse(BaseModel):
    symbol: str
    items: List[NewsItem]


class CompanyProfile(BaseModel):
    name: Optional[str] = None
    country: Optional[str] = None
    currency: Optional[str] = None
    exchange: Optional[str] = None
    industry: Optional[str] = None
    ipo: Optional[str] = None
    market_cap: Optional[float] = None
    share_outstanding: Optional[float] = None
    logo: Optional[str] = None
    weburl: Optional[str] = None
    phone: Optional[str] = None


class ProfileResponse(BaseModel):
    symbol: str
    profile: Optional[CompanyProfile] = None
    metrics: Dict[str, Any] = {}


class RecommendationBucket(BaseModel):
    period: Optional[str] = None
    strong_buy: int = 0
    buy: int = 0
    hold: int = 0
    sell: int = 0
    strong_sell: int = 0


class PriceTarget(BaseModel):
    target_high: Optional[float] = None
    target_low: Optional[float] = None
    target_mean: Optional[float] = None
    target_median: Optional[float] = None
    last_updated: Optional[str] = None
    number_of_analysts: Optional[int] = None


class ConsensusResponse(BaseModel):
    symbol: str
    recommendations: List[RecommendationBucket]
    price_target: Optional[PriceTarget] = None


class FilingItem(BaseModel):
    accession: str
    form: str
    filed_at: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None


class FilingsResponse(BaseModel):
    symbol: str
    cik: Optional[str] = None
    items: List[FilingItem]


class FinancialPeriod(BaseModel):
    year: Optional[int] = None
    quarter: Optional[int] = None
    period: Optional[str] = None
    form: Optional[str] = None
    income_statement: List[Dict[str, Any]] = []
    balance_sheet: List[Dict[str, Any]] = []
    cash_flow: List[Dict[str, Any]] = []


class FinancialsResponse(BaseModel):
    symbol: str
    freq: str
    periods: List[FinancialPeriod]


@router.get("/{symbol}/news", response_model=NewsResponse)
async def stock_news(
    symbol: str,
    days: int = Query(14, ge=1, le=30),
    settings: Settings = Depends(get_settings),
) -> NewsResponse:
    symbol = symbol.upper()
    if not settings.finnhub_api_key:
        return NewsResponse(symbol=symbol, items=[])
    try:
        raw = await finnhub.fetch_company_news(symbol, settings.finnhub_api_key, days=days)
    except HTTPException:
        return NewsResponse(symbol=symbol, items=[])
    return NewsResponse(symbol=symbol, items=[NewsItem(**r) for r in raw])


@router.get("/{symbol}/profile", response_model=ProfileResponse)
async def stock_profile(
    symbol: str,
    settings: Settings = Depends(get_settings),
) -> ProfileResponse:
    symbol = symbol.upper()
    if not settings.finnhub_api_key:
        return ProfileResponse(symbol=symbol, profile=None, metrics={})
    profile_raw = None
    metrics: Dict[str, Any] = {}
    try:
        profile_raw = await finnhub.fetch_company_profile(symbol, settings.finnhub_api_key)
    except HTTPException:
        profile_raw = None
    try:
        metrics = await finnhub.fetch_basic_financials(symbol, settings.finnhub_api_key)
    except HTTPException:
        metrics = {}
    profile = CompanyProfile(**profile_raw) if profile_raw else None
    return ProfileResponse(symbol=symbol, profile=profile, metrics=metrics)


@router.get("/{symbol}/consensus", response_model=ConsensusResponse)
async def stock_consensus(
    symbol: str,
    settings: Settings = Depends(get_settings),
) -> ConsensusResponse:
    symbol = symbol.upper()
    if not settings.finnhub_api_key:
        return ConsensusResponse(symbol=symbol, recommendations=[], price_target=None)
    recommendations: List[Dict[str, Any]] = []
    target: Optional[Dict[str, Any]] = None
    try:
        recommendations = await finnhub.fetch_recommendation_trends(
            symbol, settings.finnhub_api_key
        )
    except HTTPException:
        recommendations = []
    try:
        target = await finnhub.fetch_price_target(symbol, settings.finnhub_api_key)
    except HTTPException:
        target = None
    return ConsensusResponse(
        symbol=symbol,
        recommendations=[RecommendationBucket(**r) for r in recommendations],
        price_target=PriceTarget(**target) if target else None,
    )


@router.get("/{symbol}/financials", response_model=FinancialsResponse)
async def stock_financials(
    symbol: str,
    freq: str = Query("annual", pattern="^(annual|quarterly)$"),
    settings: Settings = Depends(get_settings),
) -> FinancialsResponse:
    symbol = symbol.upper()
    if not settings.finnhub_api_key:
        return FinancialsResponse(symbol=symbol, freq=freq, periods=[])
    try:
        raw = await finnhub.fetch_financials_reported(
            symbol, settings.finnhub_api_key, freq=freq
        )
    except HTTPException:
        return FinancialsResponse(symbol=symbol, freq=freq, periods=[])
    periods = [
        FinancialPeriod(
            year=r.get("year"),
            quarter=r.get("quarter"),
            period=r.get("period"),
            form=r.get("form"),
            income_statement=r.get("ic") or [],
            balance_sheet=r.get("bs") or [],
            cash_flow=r.get("cf") or [],
        )
        for r in raw
    ]
    return FinancialsResponse(symbol=symbol, freq=freq, periods=periods)


@router.get("/{symbol}/filings", response_model=FilingsResponse)
async def stock_filings(
    symbol: str,
    limit: int = Query(20, ge=1, le=50),
    settings: Settings = Depends(get_settings),
) -> FilingsResponse:
    symbol = symbol.upper()
    if not settings.sec_user_agent:
        return FilingsResponse(symbol=symbol, cik=None, items=[])
    try:
        cik = await sec.resolve_cik(symbol, settings.sec_user_agent)
    except HTTPException:
        cik = None
    if not cik:
        return FilingsResponse(symbol=symbol, cik=None, items=[])
    try:
        raw = await sec.fetch_submissions(cik, settings.sec_user_agent, limit=limit)
    except HTTPException:
        raw = []
    return FilingsResponse(
        symbol=symbol, cik=cik, items=[FilingItem(**r) for r in raw]
    )
