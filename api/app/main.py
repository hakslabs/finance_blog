from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.errors import register_exception_handlers
from app.models.health import HealthResponse
from app.routes.activity import router as activity_router
from app.routes.admin_console import router as admin_console_router
from app.routes.alerts import router as alerts_router
from app.routes.bookmarks import router as bookmarks_router
from app.routes.cron import router as cron_router
from app.routes.dashboard import router as dashboard_router
from app.routes.fear_greed import router as fear_greed_router
from app.routes.lessons_catalog import router as lessons_catalog_router
from app.routes.macros import router as macros_router
from app.routes.market import router as market_router
from app.routes.memos import router as memos_router
from app.routes.masters import router as masters_router
from app.routes.events import router as events_router
from app.routes.follows import router as follows_router
from app.routes.holders import router as holders_router
from app.routes.lessons import router as lessons_router
from app.routes.movers import router as movers_router
from app.routes.news import router as news_router
from app.routes.notices import router as notices_router
from app.routes.notifications import router as notifications_router
from app.routes.screens import router as screens_router
from app.routes.sectors_metrics import router as sectors_metrics_router
from app.routes.sentiment import router as sentiment_router
from app.routes.theses import router as theses_router
from app.routes.portfolio_snapshot import router as portfolio_snapshot_router
from app.routes.portfolio_transactions import router as portfolio_transactions_router
from app.routes.portfolios import router as portfolios_router
from app.routes.quotes import router as quotes_router
from app.routes.reports import router as reports_router
from app.routes.stocks_extra import router as stocks_extra_router
from app.routes.todos import router as todos_router
from app.routes.user_preferences import router as user_preferences_router
from app.routes.watchlists import router as watchlists_router
from app.settings import get_settings


settings = get_settings()

app = FastAPI(
    title="Finance_lab API",
    version=settings.api_version,
    docs_url="/docs" if settings.app_env == "local" else None,
    redoc_url="/redoc" if settings.app_env == "local" else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(activity_router, prefix="/v1")
app.include_router(admin_console_router, prefix="/v1")
app.include_router(alerts_router, prefix="/v1")
app.include_router(bookmarks_router, prefix="/v1")
app.include_router(cron_router, prefix="/v1")
app.include_router(dashboard_router, prefix="/v1")
app.include_router(fear_greed_router, prefix="/v1")
app.include_router(lessons_catalog_router, prefix="/v1")
app.include_router(macros_router, prefix="/v1")
app.include_router(market_router, prefix="/v1")
app.include_router(memos_router, prefix="/v1")
app.include_router(masters_router, prefix="/v1")
app.include_router(movers_router, prefix="/v1")
app.include_router(events_router, prefix="/v1")
app.include_router(follows_router, prefix="/v1")
app.include_router(holders_router, prefix="/v1")
app.include_router(lessons_router, prefix="/v1")
app.include_router(news_router, prefix="/v1")
app.include_router(notices_router, prefix="/v1")
app.include_router(notifications_router, prefix="/v1")
app.include_router(screens_router, prefix="/v1")
app.include_router(sectors_metrics_router, prefix="/v1")
app.include_router(sentiment_router, prefix="/v1")
app.include_router(theses_router, prefix="/v1")
app.include_router(portfolio_snapshot_router, prefix="/v1")
app.include_router(portfolios_router, prefix="/v1")
app.include_router(portfolio_transactions_router, prefix="/v1")
app.include_router(quotes_router, prefix="/v1")
app.include_router(reports_router, prefix="/v1")
app.include_router(stocks_extra_router, prefix="/v1")
app.include_router(todos_router, prefix="/v1")
app.include_router(user_preferences_router, prefix="/v1")
app.include_router(watchlists_router, prefix="/v1")


@app.get("/health")
def health() -> HealthResponse:
    return HealthResponse(status="ok", version=settings.api_version)
