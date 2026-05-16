from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel


class MasterSummary(BaseModel):
    id: str
    slug: str
    name: str
    firm: Optional[str] = None
    country_code: Optional[str] = None
    style: Optional[str] = None
    aum: Optional[float] = None
    aum_currency: Optional[str] = None
    photo_url: Optional[str] = None


class MasterPrinciple(BaseModel):
    ordinal: int
    title: str
    body: Optional[str] = None


class MasterBook(BaseModel):
    id: str
    ordinal: int
    title: str
    url: Optional[str] = None
    year: Optional[int] = None


class MasterStrategy(BaseModel):
    ordinal: int
    title: str
    body: Optional[str] = None


class Master(MasterSummary):
    description: Optional[str] = None
    homepage_url: Optional[str] = None
    filer_cik: Optional[str] = None
    birth_year: Optional[int] = None
    principles: List[MasterPrinciple] = []
    books: List[MasterBook] = []
    strategies: List[MasterStrategy] = []


class MasterListResponse(BaseModel):
    masters: List[MasterSummary]


class MasterResponse(BaseModel):
    master: Master


class MasterHolding(BaseModel):
    instrument_id: str
    symbol: Optional[str] = None
    name: Optional[str] = None
    exchange: Optional[str] = None
    shares: float
    market_value: Optional[float] = None
    weight_pct: Optional[float] = None
    position_kind: str = "long"


class MasterHoldingsResponse(BaseModel):
    slug: str
    period_end: Optional[str] = None
    filed_at: Optional[str] = None
    holdings: List[MasterHolding]
