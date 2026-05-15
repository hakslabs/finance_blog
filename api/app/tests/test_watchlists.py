from datetime import datetime, timezone
from typing import Optional
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.watchlists import Watchlist, WatchlistItem
from app.repos.watchlists import WatchlistRepo, get_watchlist_repo
from app.settings import Settings, get_settings
from app.tests.auth_helpers import TEST_USER_ID, auth_header


class _StubRepo:
    def __init__(self, watchlist: Optional[Watchlist], profile_exists: bool = True) -> None:
        self._watchlist = watchlist
        self._profile_exists = profile_exists
        self.calls: list[UUID] = []
        self.profile_calls: list[UUID] = []
        self.ensure_calls: list[tuple[UUID, str | None]] = []

    async def profile_exists(self, user_id: UUID) -> bool:
        self.profile_calls.append(user_id)
        return self._profile_exists

    async def ensure_profile(self, user_id: UUID, email: str | None) -> None:
        self.ensure_calls.append((user_id, email))

    async def get_primary_for_user(self, user_id: UUID) -> Optional[Watchlist]:
        self.calls.append(user_id)
        return self._watchlist


@pytest.fixture()
def override_repo():
    repos: list[_StubRepo] = []

    def _install(watchlist: Optional[Watchlist], profile_exists: bool = True) -> _StubRepo:
        repo = _StubRepo(watchlist, profile_exists)
        repos.append(repo)
        app.dependency_overrides[get_watchlist_repo] = lambda: repo
        return repo

    yield _install
    app.dependency_overrides.pop(get_watchlist_repo, None)


def test_requires_bearer_token(client: TestClient, override_repo) -> None:
    override_repo(None)
    response = client.get("/v1/watchlists/me")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthenticated"


def test_rejects_invalid_jwt(client: TestClient, override_repo) -> None:
    override_repo(None)
    response = client.get(
        "/v1/watchlists/me",
        headers={"Authorization": "Bearer not-a-jwt"},
    )
    assert response.status_code == 401


def test_ensures_profile_before_read(client: TestClient, override_repo) -> None:
    repo = override_repo(None, profile_exists=False)
    response = client.get("/v1/watchlists/me", headers=auth_header())
    assert response.status_code == 200
    assert repo.ensure_calls == [(UUID(TEST_USER_ID), "tester@example.com")]
    assert repo.calls == [UUID(TEST_USER_ID)]


def test_empty_watchlist_returns_container(client: TestClient, override_repo) -> None:
    override_repo(None)
    response = client.get("/v1/watchlists/me", headers=auth_header())
    assert response.status_code == 200
    body = response.json()
    assert body["watchlist"]["items"] == []
    assert isinstance(body["watchlist"]["updated_at"], str)


def test_populated_watchlist_serializes(client: TestClient, override_repo) -> None:
    repo = override_repo(
        Watchlist(
            id=uuid4(),
            name="Primary Watchlist",
            updated_at=datetime(2026, 5, 14, tzinfo=timezone.utc),
            items=[
                WatchlistItem(
                    symbol="AAPL",
                    name="Apple Inc.",
                    exchange="NASDAQ",
                    currency="USD",
                    note="Earnings baseline.",
                ),
                WatchlistItem(
                    symbol="MSFT",
                    name="Microsoft Corporation",
                    exchange="NASDAQ",
                    currency="USD",
                ),
            ],
        )
    )
    response = client.get("/v1/watchlists/me", headers=auth_header())
    assert response.status_code == 200
    body = response.json()
    items = body["watchlist"]["items"]
    assert [i["symbol"] for i in items] == ["AAPL", "MSFT"]
    assert items[0]["note"] == "Earnings baseline."
    assert items[0]["last_price"] is None
    assert repo.calls == [UUID(TEST_USER_ID)]


def test_missing_supabase_config_returns_503(client: TestClient) -> None:
    empty_settings = Settings(
        APP_ENV="local",
        SUPABASE_URL=None,
        SUPABASE_SERVICE_ROLE_KEY=None,
    )
    app.dependency_overrides[get_settings] = lambda: empty_settings
    try:
        response = client.get("/v1/watchlists/me", headers=auth_header())
    finally:
        app.dependency_overrides.pop(get_settings, None)
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "upstream_unavailable"
