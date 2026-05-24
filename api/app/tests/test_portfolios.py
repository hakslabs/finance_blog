from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.portfolios import Portfolio
from app.repos.portfolios import PortfolioRepo, get_portfolio_repo, _row_to_transaction
from app.repos.watchlists import WatchlistRepo, get_watchlist_repo
from app.settings import Settings, get_settings
from app.tests.auth_helpers import auth_header


class _StubWatchlistRepo:
    def __init__(self, profile_exists: bool = True) -> None:
        self._profile_exists = profile_exists

    async def profile_exists(self, user_id: UUID) -> bool:
        return self._profile_exists

    async def ensure_profile(self, user_id: UUID, email: str | None) -> None:
        return None

    async def get_primary_for_user(self, user_id: UUID):  # unused here
        return None


class _StubPortfolioRepo:
    def __init__(
        self, portfolio: Optional[Portfolio], tx_rows: Optional[List[Dict[str, Any]]] = None
    ) -> None:
        self._portfolio = portfolio
        self._tx_rows = tx_rows or []

    async def get_primary_with_transactions(
        self, user_id: UUID
    ) -> Optional[Tuple[Portfolio, List[Dict[str, Any]]]]:
        if self._portfolio is None:
            return None
        # Mirror the real repo: parse tx rows into the portfolio.transactions
        # list while passing the raw rows through for holding derivation.
        self._portfolio.transactions = [_row_to_transaction(r) for r in self._tx_rows]
        return self._portfolio, self._tx_rows


class _FakeResponse:
    def __init__(self, rows: List[Dict[str, Any]], status_code: int = 200) -> None:
        self._rows = rows
        self.status_code = status_code

    def json(self) -> List[Dict[str, Any]]:
        return self._rows


class _FakeAsyncClient:
    instruments: List[Dict[str, Any]] = []
    bars: Dict[str, List[Dict[str, Any]]] = {}
    calls: List[Dict[str, Any]] = []

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        pass

    async def __aenter__(self) -> "_FakeAsyncClient":
        return self

    async def __aexit__(self, *args: Any) -> None:
        return None

    async def get(self, url: str, params: Dict[str, str]) -> _FakeResponse:
        self.calls.append({"url": url, "params": dict(params)})
        if url.endswith("/instruments"):
            return _FakeResponse(self.instruments)
        instrument_id = params["instrument_id"].removeprefix("eq.")
        limit = int(params.get("limit", "1000"))
        offset = int(params.get("offset", "0"))
        return _FakeResponse(self.bars.get(instrument_id, [])[offset : offset + limit])


def _settings() -> Settings:
    return Settings(
        APP_ENV="local",
        SUPABASE_URL="https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY="test-service-role",
        SUPABASE_JWT_SECRET="test-supabase-jwt-secret-32-bytes-minimum",
    )


def _aapl_instrument() -> Dict[str, str]:
    return {
        "symbol": "AAPL",
        "name": "Apple Inc.",
        "exchange": "NASDAQ",
        "currency": "USD",
    }


def _tx(
    tx_type: str,
    occurred_at: str,
    *,
    instrument: Optional[Dict[str, str]] = None,
    quantity: Optional[float] = None,
    price: Optional[float] = None,
    amount: float = 0.0,
    currency: str = "USD",
) -> Dict[str, Any]:
    return {
        "id": str(uuid4()),
        "occurred_at": occurred_at,
        "type": tx_type,
        "quantity": quantity,
        "price": price,
        "amount": amount,
        "currency": currency,
        "note": None,
        "instruments": instrument,
    }


@pytest.fixture()
def override_repos():
    state: Dict[str, Any] = {}

    def _install(
        portfolio: Optional[Portfolio],
        tx_rows: Optional[List[Dict[str, Any]]] = None,
        profile_exists: bool = True,
    ):
        wl = _StubWatchlistRepo(profile_exists=profile_exists)
        pf = _StubPortfolioRepo(portfolio, tx_rows)
        app.dependency_overrides[get_watchlist_repo] = lambda: wl
        app.dependency_overrides[get_portfolio_repo] = lambda: pf
        state["watchlist"] = wl
        state["portfolio"] = pf
        return state

    yield _install
    app.dependency_overrides.pop(get_watchlist_repo, None)
    app.dependency_overrides.pop(get_portfolio_repo, None)


def test_requires_bearer_token(client: TestClient, override_repos) -> None:
    override_repos(None)
    response = client.get("/v1/portfolios/me")
    assert response.status_code == 401


def test_new_user_gets_empty_portfolio(client: TestClient, override_repos) -> None:
    override_repos(None, profile_exists=False)
    response = client.get("/v1/portfolios/me", headers=auth_header())
    assert response.status_code == 200
    assert response.json()["portfolio"]["holdings"] == []


def test_no_portfolio_returns_empty_container(client: TestClient, override_repos) -> None:
    override_repos(None)
    response = client.get("/v1/portfolios/me", headers=auth_header())
    assert response.status_code == 200
    body = response.json()
    assert body["portfolio"]["holdings"] == []
    assert body["portfolio"]["transactions"] == []


def test_holdings_derived_from_buys(client: TestClient, override_repos) -> None:
    portfolio = Portfolio(
        id=uuid4(),
        name="Primary Portfolio",
        currency="USD",
        updated_at=datetime(2026, 5, 14, tzinfo=timezone.utc),
        holdings=[],
        transactions=[],
    )
    tx_rows = [
        _tx("buy", "2026-02-15", instrument=_aapl_instrument(), quantity=10, price=150.0, amount=1500.0),
        _tx("buy", "2026-04-15", instrument=_aapl_instrument(), quantity=5, price=180.0, amount=900.0),
    ]
    override_repos(portfolio, tx_rows)
    response = client.get("/v1/portfolios/me", headers=auth_header())
    assert response.status_code == 200
    holdings = response.json()["portfolio"]["holdings"]
    assert len(holdings) == 1
    h = holdings[0]
    assert h["symbol"] == "AAPL"
    assert h["quantity"] == 15
    # avg = (10*150 + 5*180) / 15 = 160
    assert h["average_cost"] == pytest.approx(160.0)
    assert h["cost_basis"] == pytest.approx(2400.0)


def test_partial_sell_keeps_average_cost(client: TestClient, override_repos) -> None:
    portfolio = Portfolio(
        id=uuid4(), name="P", currency="USD",
        updated_at=datetime(2026, 5, 14, tzinfo=timezone.utc),
        holdings=[], transactions=[],
    )
    tx_rows = [
        _tx("buy", "2026-02-15", instrument=_aapl_instrument(), quantity=10, price=150.0, amount=1500.0),
        _tx("sell", "2026-04-15", instrument=_aapl_instrument(), quantity=4, price=200.0, amount=800.0),
    ]
    override_repos(portfolio, tx_rows)
    response = client.get("/v1/portfolios/me", headers=auth_header())
    holdings = response.json()["portfolio"]["holdings"]
    assert len(holdings) == 1
    h = holdings[0]
    assert h["quantity"] == pytest.approx(6)
    # avg stays 150; cost_basis = 6 * 150 = 900
    assert h["average_cost"] == pytest.approx(150.0)
    assert h["cost_basis"] == pytest.approx(900.0)


def test_full_sell_drops_holding(client: TestClient, override_repos) -> None:
    portfolio = Portfolio(
        id=uuid4(), name="P", currency="USD",
        updated_at=datetime(2026, 5, 14, tzinfo=timezone.utc),
        holdings=[], transactions=[],
    )
    tx_rows = [
        _tx("buy", "2026-02-15", instrument=_aapl_instrument(), quantity=10, price=150.0, amount=1500.0),
        _tx("sell", "2026-04-15", instrument=_aapl_instrument(), quantity=10, price=200.0, amount=2000.0),
    ]
    override_repos(portfolio, tx_rows)
    response = client.get("/v1/portfolios/me", headers=auth_header())
    assert response.json()["portfolio"]["holdings"] == []


def test_dividend_and_deposit_excluded_from_holdings(
    client: TestClient, override_repos
) -> None:
    portfolio = Portfolio(
        id=uuid4(), name="P", currency="USD",
        updated_at=datetime(2026, 5, 14, tzinfo=timezone.utc),
        holdings=[], transactions=[],
    )
    tx_rows = [
        _tx("buy", "2026-02-15", instrument=_aapl_instrument(), quantity=10, price=150.0, amount=1500.0),
        _tx("dividend", "2026-04-15", instrument=_aapl_instrument(), quantity=10, price=0.24, amount=2.4),
        _tx("deposit", "2026-04-20", amount=1000.0),
    ]
    override_repos(portfolio, tx_rows)
    response = client.get("/v1/portfolios/me", headers=auth_header())
    body = response.json()
    holdings = body["portfolio"]["holdings"]
    assert len(holdings) == 1
    assert holdings[0]["quantity"] == 10
    # transactions surface all 3 in the response
    assert len(body["portfolio"]["transactions"]) == 3
    types = {t["type"] for t in body["portfolio"]["transactions"]}
    assert types == {"buy", "dividend", "deposit"}


def test_deposit_has_null_symbol_in_response(client: TestClient, override_repos) -> None:
    portfolio = Portfolio(
        id=uuid4(), name="P", currency="KRW",
        updated_at=datetime(2026, 5, 14, tzinfo=timezone.utc),
        holdings=[], transactions=[],
    )
    tx_rows = [_tx("deposit", "2026-03-20", amount=2_000_000.0, currency="KRW")]
    override_repos(portfolio, tx_rows)
    response = client.get("/v1/portfolios/me", headers=auth_header())
    tx = response.json()["portfolio"]["transactions"][0]
    assert tx["type"] == "deposit"
    assert tx["symbol"] is None
    assert tx["quantity"] is None


def test_multi_symbol_holdings(client: TestClient, override_repos) -> None:
    msft = {"symbol": "MSFT", "name": "Microsoft", "exchange": "NASDAQ", "currency": "USD"}
    portfolio = Portfolio(
        id=uuid4(), name="P", currency="USD",
        updated_at=datetime(2026, 5, 14, tzinfo=timezone.utc),
        holdings=[], transactions=[],
    )
    tx_rows = [
        _tx("buy", "2026-02-15", instrument=_aapl_instrument(), quantity=10, price=150.0, amount=1500.0),
        _tx("buy", "2026-02-20", instrument=msft, quantity=5, price=380.0, amount=1900.0),
    ]
    override_repos(portfolio, tx_rows)
    response = client.get("/v1/portfolios/me", headers=auth_header())
    holdings = response.json()["portfolio"]["holdings"]
    assert [h["symbol"] for h in holdings] == ["AAPL", "MSFT"]


def test_portfolio_history_uses_db_bars_server_side(
    client: TestClient,
    override_repos,
    monkeypatch,
) -> None:
    msft = {"symbol": "MSFT", "name": "Microsoft", "exchange": "NASDAQ", "currency": "USD"}
    portfolio = Portfolio(
        id=uuid4(), name="P", currency="USD",
        updated_at=datetime(2026, 5, 14, tzinfo=timezone.utc),
        holdings=[], transactions=[],
    )
    tx_rows = [
        _tx("buy", "2026-02-15", instrument=_aapl_instrument(), quantity=10, price=150.0, amount=1500.0),
        _tx("buy", "2026-02-20", instrument=msft, quantity=5, price=380.0, amount=1900.0),
    ]
    override_repos(portfolio, tx_rows)
    app.dependency_overrides[get_settings] = _settings
    _FakeAsyncClient.calls = []
    _FakeAsyncClient.instruments = [
        {"id": "inst-aapl", "symbol": "AAPL", "exchange": "NASDAQ"},
        {"id": "inst-msft", "symbol": "MSFT", "exchange": "NASDAQ"},
    ]
    _FakeAsyncClient.bars = {
        "inst-aapl": [
            {"t": "2026-05-22", "c": 120},
            {"t": "2026-05-21", "c": 110},
            {"t": "2026-05-20", "c": 100},
        ],
        "inst-msft": [
            {"t": "2026-05-22", "c": 220},
            {"t": "2026-05-20", "c": 200},
        ],
    }
    monkeypatch.setattr(
        "app.routes.portfolio_snapshot.httpx.AsyncClient",
        _FakeAsyncClient,
    )

    try:
        response = client.get("/v1/portfolios/me/history?days=3", headers=auth_header())
    finally:
        app.dependency_overrides.pop(get_settings, None)

    assert response.status_code == 200
    body = response.json()
    assert body["currency"] == "USD"
    assert body["requested_days"] == 3
    assert [row["date"] for row in body["rows"]] == [
        "2026-05-20",
        "2026-05-21",
        "2026-05-22",
    ]
    assert body["rows"][0]["portfolio"] == 2000
    assert body["rows"][1]["portfolio"] == 2100
    assert body["rows"][2]["portfolio"] == 2300
    assert body["rows"][0]["cost"] == 3400
    bar_queries = [
        c for c in _FakeAsyncClient.calls if c["url"].endswith("/price_bars_daily")
    ]
    assert all(q["params"]["offset"] == "0" for q in bar_queries)
    assert all(q["params"]["limit"] == "3" for q in bar_queries)
    assert body["holdings"][0]["returned_count"] == 3
    assert body["holdings"][1]["returned_count"] == 2


def test_portfolio_history_paginates_past_postgrest_limit(
    client: TestClient,
    override_repos,
    monkeypatch,
) -> None:
    portfolio = Portfolio(
        id=uuid4(), name="P", currency="USD",
        updated_at=datetime(2026, 5, 14, tzinfo=timezone.utc),
        holdings=[], transactions=[],
    )
    tx_rows = [
        _tx("buy", "2022-01-01", instrument=_aapl_instrument(), quantity=1, price=100.0, amount=100.0),
    ]
    override_repos(portfolio, tx_rows)
    app.dependency_overrides[get_settings] = _settings
    _FakeAsyncClient.calls = []
    _FakeAsyncClient.instruments = [
        {"id": "inst-aapl", "symbol": "AAPL", "exchange": "NASDAQ"},
    ]
    latest = date(2026, 5, 22)
    _FakeAsyncClient.bars = {
        "inst-aapl": [
            {"t": (latest - timedelta(days=i)).isoformat(), "c": 2000 - i}
            for i in range(1200)
        ],
    }
    monkeypatch.setattr(
        "app.routes.portfolio_snapshot.httpx.AsyncClient",
        _FakeAsyncClient,
    )

    try:
        response = client.get("/v1/portfolios/me/history?days=1200", headers=auth_header())
    finally:
        app.dependency_overrides.pop(get_settings, None)

    assert response.status_code == 200
    body = response.json()
    assert body["requested_days"] == 1200
    assert body["holdings"][0]["returned_count"] == 1200
    assert len(body["rows"]) == 1200
    assert body["rows"][0]["date"] == "2023-02-08"
    assert body["rows"][-1]["date"] == "2026-05-22"
    bar_queries = [
        c for c in _FakeAsyncClient.calls if c["url"].endswith("/price_bars_daily")
    ]
    assert [q["params"]["limit"] for q in bar_queries] == ["1000", "200"]
    assert [q["params"]["offset"] for q in bar_queries] == ["0", "1000"]


def test_portfolio_analytics_builds_flow_and_realized_pnl(
    client: TestClient,
    override_repos,
) -> None:
    current_year = date.today().year
    portfolio = Portfolio(
        id=uuid4(), name="P", currency="USD",
        updated_at=datetime(current_year, 5, 14, tzinfo=timezone.utc),
        holdings=[], transactions=[],
    )
    tx_rows = [
        _tx("buy", f"{current_year}-01-10", instrument=_aapl_instrument(), quantity=10, price=100.0, amount=1000.0),
        _tx("sell", f"{current_year}-03-10", instrument=_aapl_instrument(), quantity=4, price=125.0, amount=500.0),
        _tx("buy", f"{current_year}-04-10", instrument=_aapl_instrument(), quantity=2, price=110.0, amount=220.0),
    ]
    override_repos(portfolio, tx_rows)

    response = client.get(
        "/v1/portfolios/me/analytics?flow_period=year&pnl_period=year",
        headers=auth_header(),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["currency"] == "KRW"
    assert body["flow_currency"] == "KRW"
    assert body["pnl_currency"] == "USD"
    assert body["total_buy"] == 1586000
    assert body["total_sell"] == 650000
    assert body["total_realized_pnl"] == 100
    assert body["realized_pnl"][-1]["date"] == f"{current_year}-01-01"
    assert body["realized_pnl"][-1]["pnl"] == 100
    assert body["investment_flow"][-1]["date"] == f"{current_year}-{date.today().month:02d}-01"
    assert body["investment_flow"][-1]["value"] == 936000


def test_missing_supabase_config_returns_503(client: TestClient) -> None:
    empty = Settings(
        APP_ENV="local",
        SUPABASE_URL=None,
        SUPABASE_SERVICE_ROLE_KEY=None,
    )
    app.dependency_overrides[get_settings] = lambda: empty
    try:
        response = client.get("/v1/portfolios/me", headers=auth_header())
    finally:
        app.dependency_overrides.pop(get_settings, None)
    assert response.status_code == 503
