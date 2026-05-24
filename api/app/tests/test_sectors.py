from typing import Any, Dict, List

from fastapi.testclient import TestClient

from app.main import app
from app.settings import Settings, get_settings


def _settings_with_supabase() -> Settings:
    return Settings(
        APP_ENV="local",
        SUPABASE_URL="https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY="test-service-role",
        SUPABASE_JWT_SECRET="test-supabase-jwt-secret-32-bytes-minimum",
    )


class _FakeResponse:
    status_code = 200

    def json(self) -> List[Dict[str, Any]]:
        return [
            {
                "sector": "Technology",
                "etf": "XLK",
                "return_day": 0.5,
                "return_week": 1.5,
                "return_month": 4.0,
                "return_quarter": 8.0,
                "return_year": 24.0,
                "rank_day": 1,
                "rank_week": 2,
                "rank_month": 3,
                "prev_rank_month": 4,
                "money_flow": "inflow",
                "relative_strength": 1.2,
            }
        ]


class _FakeAsyncClient:
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        pass

    async def __aenter__(self) -> "_FakeAsyncClient":
        return self

    async def __aexit__(self, *args: Any) -> None:
        return None

    async def get(self, *args: Any, **kwargs: Any) -> _FakeResponse:
        del args, kwargs
        return _FakeResponse()


def test_sectors_returns_db_year_return(client: TestClient, monkeypatch) -> None:
    from app.routes import sectors_metrics

    monkeypatch.setattr(sectors_metrics.httpx, "AsyncClient", _FakeAsyncClient)
    app.dependency_overrides[get_settings] = _settings_with_supabase
    try:
        response = client.get("/v1/sectors?market=US")
    finally:
        app.dependency_overrides.pop(get_settings, None)

    assert response.status_code == 200
    item = response.json()["items"][0]
    assert item["returnQuarter"] == 8.0
    assert item["returnYear"] == 24.0
