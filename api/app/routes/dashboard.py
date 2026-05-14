from datetime import datetime, timezone

from fastapi import APIRouter

from app.models.dashboard import (
    DashboardEventExample,
    DashboardExampleResponse,
    DashboardPortfolioExample,
    DashboardWatchlistExample,
)


router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _build_example() -> DashboardExampleResponse:
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


@router.get("/example")
def dashboard_example() -> DashboardExampleResponse:
    return _build_example()
