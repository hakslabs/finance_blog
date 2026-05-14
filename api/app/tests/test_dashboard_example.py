from fastapi.testclient import TestClient


def test_dashboard_example_shape(client: TestClient) -> None:
    response = client.get("/v1/dashboard/example")
    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == {"as_of", "portfolio", "watchlist", "events"}
    assert body["portfolio"]["currency"] == "USD"
    assert isinstance(body["watchlist"], list) and body["watchlist"]
    assert body["watchlist"][0]["symbol"] == "AAPL"


def test_unknown_route_returns_contract_error(client: TestClient) -> None:
    response = client.get("/v1/does-not-exist")
    assert response.status_code == 404
    body = response.json()
    assert "error" in body
    assert body["error"]["code"] == "not_found"
    assert isinstance(body["error"]["message"], str)
