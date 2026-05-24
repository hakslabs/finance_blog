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

    def json(self) -> List[Dict[str, Any]]:
        return self._rows


class _FakeAsyncClient:
    instruments: Dict[str, List[Dict[str, Any]]] = {}
    bars: Dict[str, List[Dict[str, Any]]] = {}
    calls: List[Dict[str, Any]] = []

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
    ) -> _FakeResponse:
        self.calls.append({"url": url, "params": dict(params)})
        if url.endswith("/instruments"):
            symbol = params["symbol"].removeprefix("eq.")
            return _FakeResponse(self.instruments.get(symbol, []))

        instrument_id = params["instrument_id"].removeprefix("eq.")
        limit = int(params.get("limit", "1000"))
        offset = int(params.get("offset", "0"))
        rows = self.bars.get(instrument_id, [])[offset : offset + limit]
        return _FakeResponse(rows)


def _bar(day: date, close: float = 100.0) -> Dict[str, Any]:
    return {
        "t": day.isoformat(),
        "o": close - 1,
        "h": close + 1,
        "l": close - 2,
        "c": close,
        "v": 1000,
    }


def test_stock_bars_paginates_past_postgrest_page_limit(
    client: TestClient,
    monkeypatch,
) -> None:
    app.dependency_overrides[get_settings] = _settings
    _FakeAsyncClient.calls = []
    _FakeAsyncClient.instruments = {
        "AAPL": [{"id": "inst-aapl"}],
    }
    latest = date(2026, 5, 22)
    _FakeAsyncClient.bars = {
        "inst-aapl": [
            _bar(latest - timedelta(days=i), close=2000 - i)
            for i in range(1200)
        ],
    }
    monkeypatch.setattr(
        "app.routes.stocks_extra.httpx.AsyncClient",
        _FakeAsyncClient,
    )

    response = client.get("/v1/stocks/AAPL/bars?days=1200")

    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 1200
    assert items[0]["date"] == "2023-02-08"
    assert items[-1]["date"] == "2026-05-22"
    assert response.json()["requested_days"] == 1200
    assert response.json()["returned_count"] == 1200
    assert response.json()["from_date"] == "2023-02-08"
    assert response.json()["to_date"] == "2026-05-22"
    assert response.json()["instrument_count"] == 1
    assert response.json()["raw_count"] == 1200
    assert response.json()["duplicate_count"] == 0
    bar_queries = [
        c for c in _FakeAsyncClient.calls if c["url"].endswith("/price_bars_daily")
    ]
    assert [q["params"]["limit"] for q in bar_queries] == ["1000", "200"]
    assert [q["params"]["offset"] for q in bar_queries] == ["0", "1000"]
    app.dependency_overrides.pop(get_settings, None)


def test_stock_bars_resolves_kr_aliases_and_dedups_dates(
    client: TestClient,
    monkeypatch,
) -> None:
    app.dependency_overrides[get_settings] = _settings
    _FakeAsyncClient.calls = []
    _FakeAsyncClient.instruments = {
        "005930.KS": [{"id": "inst-legacy"}, {"id": "inst-krx"}],
    }
    _FakeAsyncClient.bars = {
        "inst-krx": [
            _bar(date(2026, 5, 22), close=90000),
            _bar(date(2026, 5, 21), close=88000),
        ],
        "inst-legacy": [
            _bar(date(2026, 5, 21), close=87000),
            _bar(date(2021, 5, 21), close=70000),
        ],
    }
    monkeypatch.setattr(
        "app.routes.stocks_extra.httpx.AsyncClient",
        _FakeAsyncClient,
    )

    response = client.get("/v1/stocks/005930/bars?days=10")

    assert response.status_code == 200
    body = response.json()
    assert body["symbol"] == "005930"
    assert [item["date"] for item in body["items"]] == [
        "2026-05-21",
        "2026-05-22",
    ]
    assert body["items"][0]["close"] == 88000
    assert body["requested_days"] == 10
    assert body["returned_count"] == 2
    assert body["instrument_count"] == 2
    assert body["raw_count"] == 3
    assert body["duplicate_count"] == 1
    app.dependency_overrides.pop(get_settings, None)


def test_stock_bars_days_uses_calendar_window_not_row_count(
    client: TestClient,
    monkeypatch,
) -> None:
    app.dependency_overrides[get_settings] = _settings
    _FakeAsyncClient.calls = []
    _FakeAsyncClient.instruments = {
        "AAPL": [{"id": "inst-aapl"}],
    }
    latest = date(2026, 5, 22)
    _FakeAsyncClient.bars = {
        "inst-aapl": [
            _bar(latest, close=120),
            _bar(latest - timedelta(days=3), close=119),
            _bar(latest - timedelta(days=6), close=118),
            _bar(latest - timedelta(days=9), close=117),
        ],
    }
    monkeypatch.setattr(
        "app.routes.stocks_extra.httpx.AsyncClient",
        _FakeAsyncClient,
    )

    response = client.get("/v1/stocks/AAPL/bars?days=7")

    assert response.status_code == 200
    body = response.json()
    assert body["requested_days"] == 7
    assert body["returned_count"] == 3
    assert [item["date"] for item in body["items"]] == [
        "2026-05-16",
        "2026-05-19",
        "2026-05-22",
    ]
    assert body["from_date"] == "2026-05-16"
    assert body["to_date"] == "2026-05-22"
    assert body["raw_count"] == 3
    app.dependency_overrides.pop(get_settings, None)


def test_stock_bars_compare_aligns_db_bars_and_returns(
    client: TestClient,
    monkeypatch,
) -> None:
    app.dependency_overrides[get_settings] = _settings
    _FakeAsyncClient.calls = []
    _FakeAsyncClient.instruments = {
        "AAPL": [{"id": "inst-aapl"}],
        "MSFT": [{"id": "inst-msft"}],
    }
    _FakeAsyncClient.bars = {
        "inst-aapl": [
            _bar(date(2026, 5, 22), close=121),
            _bar(date(2026, 5, 21), close=110),
            _bar(date(2026, 5, 20), close=100),
        ],
        "inst-msft": [
            _bar(date(2026, 5, 22), close=220),
            _bar(date(2026, 5, 20), close=200),
        ],
    }
    monkeypatch.setattr(
        "app.routes.stocks_extra.httpx.AsyncClient",
        _FakeAsyncClient,
    )

    response = client.get("/v1/stocks/bars/compare?symbols=AAPL,MSFT&days=10")

    assert response.status_code == 200
    body = response.json()
    assert body["symbols"] == ["AAPL", "MSFT"]
    assert body["requested_days"] == 10
    assert body["compare_from_date"] == "2026-05-20"
    assert body["compare_to_date"] == "2026-05-22"
    assert body["compare_baseline_date"] == "2026-05-20"
    assert body["compare_row_count"] == 3
    assert [row["date"] for row in body["rows"]] == [
        "2026-05-20",
        "2026-05-21",
        "2026-05-22",
    ]
    assert body["rows"][0]["AAPL"] == 0
    assert body["rows"][0]["MSFT"] == 0
    assert body["rows"][1]["AAPL"] == 10
    assert body["rows"][1]["MSFT"] == 0
    assert body["returns"] == {"AAPL": 21, "MSFT": 10}
    assert body["series"][0]["returned_count"] == 3
    assert body["series"][1]["returned_count"] == 2
    app.dependency_overrides.pop(get_settings, None)


def test_stock_bars_compare_stops_at_common_latest_date(
    client: TestClient,
    monkeypatch,
) -> None:
    app.dependency_overrides[get_settings] = _settings
    _FakeAsyncClient.calls = []
    _FakeAsyncClient.instruments = {
        "SPY": [{"id": "inst-spy"}],
        "QQQ": [{"id": "inst-qqq"}],
    }
    _FakeAsyncClient.bars = {
        "inst-spy": [
            _bar(date(2026, 5, 24), close=130),
            _bar(date(2026, 5, 23), close=120),
            _bar(date(2026, 5, 22), close=110),
            _bar(date(2026, 5, 21), close=100),
        ],
        "inst-qqq": [
            _bar(date(2026, 5, 22), close=220),
            _bar(date(2026, 5, 21), close=200),
        ],
    }
    monkeypatch.setattr(
        "app.routes.stocks_extra.httpx.AsyncClient",
        _FakeAsyncClient,
    )

    response = client.get("/v1/stocks/bars/compare?symbols=SPY,QQQ&days=10")

    assert response.status_code == 200
    body = response.json()
    assert body["compare_from_date"] == "2026-05-21"
    assert body["compare_to_date"] == "2026-05-22"
    assert body["compare_baseline_date"] == "2026-05-21"
    assert [row["date"] for row in body["rows"]] == [
        "2026-05-21",
        "2026-05-22",
    ]
    assert body["returns"] == {"SPY": 10, "QQQ": 10}
    app.dependency_overrides.pop(get_settings, None)


def test_stock_bars_compare_paginates_five_year_requests(
    client: TestClient,
    monkeypatch,
) -> None:
    app.dependency_overrides[get_settings] = _settings
    _FakeAsyncClient.calls = []
    _FakeAsyncClient.instruments = {
        "SPY": [{"id": "inst-spy"}],
        "069500.KS": [{"id": "inst-kodex"}],
    }
    latest = date(2026, 5, 22)
    _FakeAsyncClient.bars = {
        "inst-spy": [
            _bar(latest - timedelta(days=i), close=2000 - i)
            for i in range(1825)
        ],
        "inst-kodex": [
            _bar(latest - timedelta(days=i), close=4000 - i * 2)
            for i in range(1825)
        ],
    }
    monkeypatch.setattr(
        "app.routes.stocks_extra.httpx.AsyncClient",
        _FakeAsyncClient,
    )

    response = client.get("/v1/stocks/bars/compare?symbols=SPY,069500.KS&days=1825")

    assert response.status_code == 200
    body = response.json()
    assert body["symbols"] == ["SPY", "069500.KS"]
    assert body["requested_days"] == 1825
    assert body["compare_from_date"] == "2021-05-24"
    assert body["compare_to_date"] == "2026-05-22"
    assert body["compare_baseline_date"] == "2021-05-24"
    assert body["compare_row_count"] == 1825
    assert len(body["rows"]) == 1825
    assert body["rows"][0]["date"] == "2021-05-24"
    assert body["rows"][-1]["date"] == "2026-05-22"
    assert body["series"][0]["returned_count"] == 1825
    assert body["series"][1]["returned_count"] == 1825
    assert body["returns"]["SPY"] > 0
    assert body["returns"]["069500.KS"] > 0
    bar_queries = [
        c for c in _FakeAsyncClient.calls if c["url"].endswith("/price_bars_daily")
    ]
    assert [q["params"]["limit"] for q in bar_queries] == [
        "1000",
        "825",
        "1000",
        "825",
    ]
    assert [q["params"]["offset"] for q in bar_queries] == [
        "0",
        "1000",
        "0",
        "1000",
    ]
    app.dependency_overrides.pop(get_settings, None)
