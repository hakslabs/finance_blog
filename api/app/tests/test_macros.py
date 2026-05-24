from fastapi.testclient import TestClient

from app.main import app
from app.settings import Settings, get_settings


def _settings_with_fred() -> Settings:
    return Settings(
        APP_ENV="local",
        SUPABASE_JWT_SECRET="test-supabase-jwt-secret-32-bytes-minimum",
        FRED_API_KEY="test-fred",
    )


def _settings_without_keys() -> Settings:
    return Settings(
        APP_ENV="local",
        SUPABASE_JWT_SECRET="test-supabase-jwt-secret-32-bytes-minimum",
        FRED_API_KEY=None,
        ECOS_API_KEY=None,
    )


def test_macro_history_returns_fred_rows(client: TestClient, monkeypatch) -> None:
    from app.sources import fred

    async def fake_history(series_id: str, api_key: str, *, limit: int = 120):
        assert series_id == "DGS10"
        assert api_key == "test-fred"
        assert limit == 30
        return [
            {"date": "2026-05-20", "value": 4.42},
            {"date": "2026-05-21", "value": 4.4},
        ]

    monkeypatch.setattr(fred, "fetch_series_history", fake_history)
    app.dependency_overrides[get_settings] = _settings_with_fred
    try:
        response = client.get("/v1/macros/indicators/DGS10/history?limit=30")
    finally:
        app.dependency_overrides.pop(get_settings, None)

    assert response.status_code == 200
    body = response.json()
    assert body["series_id"] == "DGS10"
    assert body["label"] == "美 10년물 국채금리"
    assert body["items"] == [
        {"date": "2026-05-20", "value": 4.42},
        {"date": "2026-05-21", "value": 4.4},
    ]


def test_macro_history_allows_five_year_limit(client: TestClient, monkeypatch) -> None:
    from app.sources import fred

    async def fake_history(series_id: str, api_key: str, *, limit: int = 120):
        assert series_id == "DGS10"
        assert api_key == "test-fred"
        assert limit == 1825
        return [{"date": "2021-05-21", "value": 1.62}]

    monkeypatch.setattr(fred, "fetch_series_history", fake_history)
    app.dependency_overrides[get_settings] = _settings_with_fred
    try:
        response = client.get("/v1/macros/indicators/DGS10/history?limit=1825")
    finally:
        app.dependency_overrides.pop(get_settings, None)

    assert response.status_code == 200
    assert response.json()["items"] == [{"date": "2021-05-21", "value": 1.62}]


def test_macro_history_without_key_is_empty(client: TestClient) -> None:
    app.dependency_overrides[get_settings] = _settings_without_keys
    try:
        response = client.get("/v1/macros/indicators/DGS10/history")
    finally:
        app.dependency_overrides.pop(get_settings, None)

    assert response.status_code == 200
    assert response.json()["items"] == []


def test_macro_history_unknown_series_404(client: TestClient) -> None:
    app.dependency_overrides[get_settings] = _settings_without_keys
    try:
        response = client.get("/v1/macros/indicators/UNKNOWN/history")
    finally:
        app.dependency_overrides.pop(get_settings, None)

    assert response.status_code == 404
