from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.quotes import Bar, Quote
from app.routes import quotes as quotes_route
from app.settings import Settings, get_settings


DEV_USER = "00000000-0000-4000-8000-000000000001"


def _settings_with_keys() -> Settings:
    return Settings(
        APP_ENV="local",
        POLYGON_API_KEY="test-polygon",
        ALPHA_VANTAGE_API_KEY="test-alpha",
    )


def _settings_without_keys() -> Settings:
    return Settings(
        APP_ENV="local",
        POLYGON_API_KEY=None,
        ALPHA_VANTAGE_API_KEY=None,
    )


def _sample_bars() -> list[Bar]:
    return [
        Bar(
            t=datetime(2026, 5, 12, tzinfo=timezone.utc),
            o=185.0, h=187.0, l=184.5, c=186.0, v=10_000,
        ),
        Bar(
            t=datetime(2026, 5, 13, tzinfo=timezone.utc),
            o=186.1, h=188.0, l=185.8, c=187.42, v=12_000,
        ),
    ]


def _sample_quote() -> Quote:
    bars = _sample_bars()
    return Quote(
        symbol="AAPL",
        currency="USD",
        last=bars[-1].c,
        change=bars[-1].c - bars[-2].c,
        change_pct=(bars[-1].c - bars[-2].c) / bars[-2].c * 100.0,
        as_of=bars[-1].t,
        bars=bars,
        last_refreshed_at=datetime(2026, 5, 13, 16, tzinfo=timezone.utc),
        stale=False,
    )


@pytest.fixture(autouse=True)
def _reset_cache():
    quotes_route._clear_cache()
    yield
    quotes_route._clear_cache()
    app.dependency_overrides.pop(get_settings, None)


def test_requires_dev_header(client: TestClient) -> None:
    app.dependency_overrides[get_settings] = _settings_with_keys
    response = client.get("/v1/quotes/AAPL")
    assert response.status_code == 401


def test_returns_quote_from_polygon(client: TestClient, monkeypatch) -> None:
    app.dependency_overrides[get_settings] = _settings_with_keys
    quote = _sample_quote()

    async def fake_polygon(symbol, range_, api_key, **kwargs):
        assert symbol == "AAPL"
        assert range_ == "6mo"
        assert api_key == "test-polygon"
        return quote

    monkeypatch.setattr(
        "app.routes.quotes.polygon.fetch_daily_quote", fake_polygon
    )

    response = client.get(
        "/v1/quotes/AAPL", headers={"X-Dev-User": DEV_USER}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["symbol"] == "AAPL"
    assert body["stale"] is False
    assert len(body["bars"]) == 2
    assert body["last"] == pytest.approx(187.42)


def test_falls_back_to_alphavantage_on_polygon_error(
    client: TestClient, monkeypatch
) -> None:
    app.dependency_overrides[get_settings] = _settings_with_keys

    async def boom(*args, **kwargs):
        from app.sources.polygon import PolygonError
        raise PolygonError("upstream 500")

    quote = _sample_quote()

    async def fake_alpha(symbol, range_, api_key, **kwargs):
        return quote

    monkeypatch.setattr("app.routes.quotes.polygon.fetch_daily_quote", boom)
    monkeypatch.setattr(
        "app.routes.quotes.alphavantage.fetch_daily_quote", fake_alpha
    )

    response = client.get(
        "/v1/quotes/AAPL", headers={"X-Dev-User": DEV_USER}
    )
    assert response.status_code == 200
    assert response.json()["last"] == pytest.approx(187.42)


def test_serves_stale_cache_on_provider_outage(
    client: TestClient, monkeypatch
) -> None:
    app.dependency_overrides[get_settings] = _settings_with_keys
    quote = _sample_quote()
    # Prime the cache.
    quotes_route._cache_put("AAPL", "6mo", quote)
    # Force TTL expiration so the next request refetches.
    import time
    quotes_route._CACHE[("AAPL", "6mo")] = (
        time.monotonic() - 9999,
        quote,
    )

    async def boom(*args, **kwargs):
        from app.sources.polygon import PolygonError
        raise PolygonError("polygon down")

    async def boom_alpha(*args, **kwargs):
        from app.sources.alphavantage import AlphaVantageError
        raise AlphaVantageError("alpha down")

    monkeypatch.setattr("app.routes.quotes.polygon.fetch_daily_quote", boom)
    monkeypatch.setattr(
        "app.routes.quotes.alphavantage.fetch_daily_quote", boom_alpha
    )

    response = client.get(
        "/v1/quotes/AAPL", headers={"X-Dev-User": DEV_USER}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["stale"] is True
    assert body["symbol"] == "AAPL"


def test_returns_503_when_no_cache_and_provider_fails(
    client: TestClient, monkeypatch
) -> None:
    app.dependency_overrides[get_settings] = _settings_with_keys

    async def boom(*args, **kwargs):
        from app.sources.polygon import PolygonError
        raise PolygonError("polygon down")

    async def boom_alpha(*args, **kwargs):
        from app.sources.alphavantage import AlphaVantageError
        raise AlphaVantageError("alpha down")

    monkeypatch.setattr("app.routes.quotes.polygon.fetch_daily_quote", boom)
    monkeypatch.setattr(
        "app.routes.quotes.alphavantage.fetch_daily_quote", boom_alpha
    )

    response = client.get(
        "/v1/quotes/AAPL", headers={"X-Dev-User": DEV_USER}
    )
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "upstream_unavailable"


def test_404_for_unknown_symbol(client: TestClient, monkeypatch) -> None:
    app.dependency_overrides[get_settings] = _settings_with_keys
    from fastapi import HTTPException

    async def not_found(*args, **kwargs):
        raise HTTPException(status_code=404, detail="not_found")

    monkeypatch.setattr(
        "app.routes.quotes.polygon.fetch_daily_quote", not_found
    )

    response = client.get(
        "/v1/quotes/NOPE", headers={"X-Dev-User": DEV_USER}
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


def test_no_provider_configured_returns_503(client: TestClient) -> None:
    app.dependency_overrides[get_settings] = _settings_without_keys
    response = client.get(
        "/v1/quotes/AAPL", headers={"X-Dev-User": DEV_USER}
    )
    assert response.status_code == 503


def test_uppercases_symbol(client: TestClient, monkeypatch) -> None:
    app.dependency_overrides[get_settings] = _settings_with_keys
    seen = []

    async def fake_polygon(symbol, range_, api_key, **kwargs):
        seen.append(symbol)
        return _sample_quote()

    monkeypatch.setattr(
        "app.routes.quotes.polygon.fetch_daily_quote", fake_polygon
    )

    response = client.get(
        "/v1/quotes/aapl", headers={"X-Dev-User": DEV_USER}
    )
    assert response.status_code == 200
    assert seen == ["AAPL"]


def test_rejects_intraday_interval(client: TestClient) -> None:
    app.dependency_overrides[get_settings] = _settings_with_keys
    response = client.get(
        "/v1/quotes/AAPL?interval=1h",
        headers={"X-Dev-User": DEV_USER},
    )
    assert response.status_code == 400
