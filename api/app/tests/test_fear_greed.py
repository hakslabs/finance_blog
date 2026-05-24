from datetime import date, timedelta
from typing import Any, Dict, List

from fastapi.testclient import TestClient

from app.main import app
from app.settings import Settings, get_settings


def _settings() -> Settings:
    return Settings(
        APP_ENV="local",
        SUPABASE_URL="https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY="test-service-role",
        SUPABASE_JWT_SECRET="test-supabase-jwt-secret-32-bytes-minimum",
    )


class _FakeResponse:
    def __init__(self, rows: List[Dict[str, Any]], status_code: int = 200) -> None:
        self._rows = rows
        self.status_code = status_code
        self.text = ""

    def json(self) -> List[Dict[str, Any]]:
        return self._rows


class _FakeAsyncClient:
    rows: List[Dict[str, Any]] = []
    calls: List[Dict[str, Any]] = []

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        pass

    async def __aenter__(self) -> "_FakeAsyncClient":
        return self

    async def __aexit__(self, *args: Any) -> None:
        return None

    async def get(self, url: str, params: Dict[str, str]) -> _FakeResponse:
        self.calls.append({"url": url, "params": dict(params)})
        limit = int(params.get("limit", "1000"))
        offset = int(params.get("offset", "0"))
        return _FakeResponse(self.rows[offset : offset + limit])


def _point(day: date, value: int) -> Dict[str, Any]:
    return {
        "date": day.isoformat(),
        "value": value,
        "vix": 15.0,
        "adr": 1.1,
    }


def test_fear_greed_history_paginates_past_postgrest_limit(
    client: TestClient,
    monkeypatch,
) -> None:
    latest = date(2026, 5, 22)
    _FakeAsyncClient.rows = [
        _point(latest - timedelta(days=i), 20 + (i % 60))
        for i in range(1200)
    ]
    _FakeAsyncClient.calls = []
    monkeypatch.setattr(
        "app.routes.fear_greed.httpx.AsyncClient",
        _FakeAsyncClient,
    )
    app.dependency_overrides[get_settings] = _settings

    try:
        response = client.get("/v1/sentiment/fear-greed?market=US&days=1200")
    finally:
        app.dependency_overrides.pop(get_settings, None)

    assert response.status_code == 200
    body = response.json()
    assert body["market"] == "US"
    assert len(body["history"]) == 1200
    assert body["history"][0]["date"] == "2023-02-08"
    assert body["history"][-1]["date"] == "2026-05-22"
    assert [c["params"]["limit"] for c in _FakeAsyncClient.calls] == ["1000", "200"]
    assert [c["params"]["offset"] for c in _FakeAsyncClient.calls] == ["0", "1000"]
