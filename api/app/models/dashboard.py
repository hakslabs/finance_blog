from datetime import datetime, timezone
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


def build_dashboard_example() -> DashboardExampleResponse:
    return DashboardExampleResponse(
        as_of=datetime(2026, 5, 14, 0, 0, tzinfo=timezone.utc),
        portfolio=DashboardPortfolioExample(
            total_value=125430.5,
            currency="USD",
            day_change=842.31,
            day_change_pct=0.68,
        ),
        watchlist=[
            DashboardWatchlistExample(
                symbol="AAPL",
                name="Apple Inc.",
                exchange="NASDAQ",
                last_price=187.42,
                change_pct=0.66,
            ),
            DashboardWatchlistExample(
                symbol="005930.KS",
                name="Samsung Electronics",
                exchange="KRX",
                last_price=78200.0,
                change_pct=-0.31,
            ),
        ],
        events=[
            DashboardEventExample(
                id="fomc-minutes",
                title="FOMC minutes",
                starts_at=datetime(2026, 5, 14, 18, 0, tzinfo=timezone.utc),
                region="US",
                importance="high",
            )
        ],
    )
