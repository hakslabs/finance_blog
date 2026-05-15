from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.errors import register_exception_handlers
from app.models.health import HealthResponse
from app.routes.dashboard import router as dashboard_router
from app.routes.portfolios import router as portfolios_router
from app.routes.quotes import router as quotes_router
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

app.include_router(dashboard_router, prefix="/v1")
app.include_router(portfolios_router, prefix="/v1")
app.include_router(quotes_router, prefix="/v1")
app.include_router(watchlists_router, prefix="/v1")


@app.get("/health")
def health() -> HealthResponse:
    return HealthResponse(status="ok", version=settings.api_version)
