from typing import Any, Dict, List

from fastapi.testclient import TestClient

from app.main import app
from app.settings import Settings, get_settings


def _settings_without_keys() -> Settings:
    return Settings(
        APP_ENV="local",
        SUPABASE_JWT_SECRET="test-supabase-jwt-secret-32-bytes-minimum",
        ALPHAVANTAGE_API_KEY=None,
        FINNHUB_API_KEY=None,
        KRX_API_KEY=None,
    )


def _settings_with_supabase() -> Settings:
    return Settings(
        APP_ENV="local",
        SUPABASE_URL="https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY="test-service-role",
        SUPABASE_JWT_SECRET="test-supabase-jwt-secret-32-bytes-minimum",
        ALPHAVANTAGE_API_KEY=None,
        FINNHUB_API_KEY=None,
        KRX_API_KEY=None,
    )


class _FakeResponse:
    def __init__(self, rows: List[Dict[str, Any]], status_code: int = 200) -> None:
        self._rows = rows
        self.status_code = status_code

    def json(self) -> List[Dict[str, Any]]:
        return self._rows


class _FakeAsyncClient:
    instruments: Dict[str, List[Dict[str, Any]]] = {}
    bars: Dict[str, List[Dict[str, Any]]] = {}

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        pass

    async def __aenter__(self) -> "_FakeAsyncClient":
        return self

    async def __aexit__(self, *args: Any) -> None:
        return None

    async def get(
        self,
        url: str,
        params: Dict[str, str],
        **kwargs: Any,
    ) -> _FakeResponse:
        del kwargs
        if url.endswith("/instruments"):
            symbol = params["symbol"].removeprefix("eq.")
            return _FakeResponse(self.instruments.get(symbol, []))

        instrument_id = params["instrument_id"].removeprefix("eq.")
        return _FakeResponse(self.bars.get(instrument_id, []))


def test_indices_use_yahoo_quotes_without_mock_fallback(
    client: TestClient,
    monkeypatch,
) -> None:
    from app.routes import indices

    async def fake_fetch_quotes(symbols: List[str], client: Any = None):
        del client
        assert "^GSPC" in symbols
        return {
            "^GSPC": {"price": 6200.0, "change": 20.0, "change_pct": 0.32},
            "KRW=X": {"price": 1365.0, "change": -2.0, "change_pct": -0.15},
        }

    async def no_finnhub(*args: Any, **kwargs: Any):
        del args, kwargs
        return None

    async def no_kr_index(*args: Any, **kwargs: Any):
        del args, kwargs
        return None

    async def no_db_proxy(*args: Any, **kwargs: Any):
        del args, kwargs
        return None

    indices._cache.clear()
    monkeypatch.setattr(indices.yahoo, "fetch_quotes", fake_fetch_quotes)
    monkeypatch.setattr(indices, "_fetch_finnhub", no_finnhub)
    monkeypatch.setattr(indices, "_fetch_kr_index", no_kr_index)
    monkeypatch.setattr(indices, "_fetch_db_proxy", no_db_proxy)
    app.dependency_overrides[get_settings] = _settings_without_keys
    try:
        response = client.get("/v1/market/indices")
    finally:
        app.dependency_overrides.pop(get_settings, None)
        indices._cache.clear()

    assert response.status_code == 200
    items = response.json()["items"]
    assert {item["symbol"] for item in items} == {"S&P 500", "USD/KRW"}
    assert all(item["source"] == "live" for item in items)
    assert all(item["source"] != "mock" for item in items)


def test_indices_fall_back_to_db_proxy_bars(
    client: TestClient,
    monkeypatch,
) -> None:
    from app.routes import indices

    async def empty_quotes(symbols: List[str], client: Any = None):
        del symbols, client
        return {}

    async def no_finnhub(*args: Any, **kwargs: Any):
        del args, kwargs
        return None

    async def no_usdkrw(*args: Any, **kwargs: Any):
        del args, kwargs
        return None

    indices._cache.clear()
    _FakeAsyncClient.instruments = {"SPY": [{"id": "inst-spy"}]}
    _FakeAsyncClient.bars = {
        "inst-spy": [
            {"t": "2026-05-22", "c": 620.0},
            {"t": "2026-05-21", "c": 610.0},
        ],
    }
    monkeypatch.setattr(indices.httpx, "AsyncClient", _FakeAsyncClient)
    monkeypatch.setattr(indices.yahoo, "fetch_quotes", empty_quotes)
    monkeypatch.setattr(indices, "_fetch_finnhub", no_finnhub)
    monkeypatch.setattr(indices, "_fetch_usdkrw", no_usdkrw)
    app.dependency_overrides[get_settings] = _settings_with_supabase
    try:
        response = client.get("/v1/market/indices")
    finally:
        app.dependency_overrides.pop(get_settings, None)
        indices._cache.clear()

    assert response.status_code == 200
    items = response.json()["items"]
    assert items == [
        {
            "symbol": "S&P 500",
            "name": "S&P 500 (SPY)",
            "value": 620.0,
            "change": 10.0,
            "change_pct": 1.639344262295082,
            "market": "US",
            "source": "db",
        },
    ]


def test_index_with_only_one_bar_does_not_claim_flat_change(
    client: TestClient,
    monkeypatch,
) -> None:
    from app.routes import indices

    async def empty_quotes(symbols: List[str], client: Any = None):
        del symbols, client
        return {}

    async def no_finnhub(*args: Any, **kwargs: Any):
        del args, kwargs
        return None

    async def no_usdkrw(*args: Any, **kwargs: Any):
        del args, kwargs
        return None

    indices._cache.clear()
    _FakeAsyncClient.instruments = {"SPY": [{"id": "inst-spy"}]}
    _FakeAsyncClient.bars = {"inst-spy": [{"t": "2026-05-22", "c": 620.0}]}
    monkeypatch.setattr(indices.httpx, "AsyncClient", _FakeAsyncClient)
    monkeypatch.setattr(indices.yahoo, "fetch_quotes", empty_quotes)
    monkeypatch.setattr(indices, "_fetch_finnhub", no_finnhub)
    monkeypatch.setattr(indices, "_fetch_usdkrw", no_usdkrw)
    app.dependency_overrides[get_settings] = _settings_with_supabase
    try:
        response = client.get("/v1/market/indices")
    finally:
        app.dependency_overrides.pop(get_settings, None)
        indices._cache.clear()

    assert response.status_code == 200
    item = response.json()["items"][0]
    assert item["value"] == 620.0
    assert item["change"] is None
    assert item["change_pct"] is None
