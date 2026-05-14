from datetime import datetime
from typing import List, Literal

from pydantic import BaseModel


class DashboardPortfolioExample(BaseModel):
    total_value: float
    currency: str
    day_change: float
    day_change_pct: float


class DashboardWatchlistExample(BaseModel):
    symbol: str
    name: str
    exchange: str
    last_price: float
    change_pct: float


class DashboardEventExample(BaseModel):
    id: str
    title: str
    starts_at: datetime
    region: Literal["KR", "US", "GLOBAL"]
    importance: Literal["low", "medium", "high"]


class DashboardExampleResponse(BaseModel):
    as_of: datetime
    portfolio: DashboardPortfolioExample
    watchlist: List[DashboardWatchlistExample]
    events: List[DashboardEventExample]
