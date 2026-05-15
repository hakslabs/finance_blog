"""GET /v1/portfolios/me — read-only portfolio data path.

Holdings are derived from the transaction ledger using the average-cost
method:

- buys: cost_basis += qty * price; quantity += qty
- sells: avg = cost_basis/quantity (if quantity > 0);
         cost_basis -= qty * avg; quantity -= qty
- dividend / deposit: ignored for holdings (recorded in transactions)

Holdings with `quantity <= 0` are dropped. See EP-0001 PR-11 for the
"backend-side computation" choice and docs/design-docs/prices-ingestion-schema.md
for the deferred price_bars_daily join (market value lands later).
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user_id
from app.models.portfolios import Holding, Portfolio, PortfolioResponse
from app.repos.portfolios import PortfolioRepo, get_portfolio_repo
from app.repos.watchlists import WatchlistRepo, get_watchlist_repo


router = APIRouter(prefix="/portfolios", tags=["portfolios"])


@router.get("/me", response_model=PortfolioResponse)
async def get_my_portfolio(
    user_id: UUID = Depends(get_current_user_id),
    repo: PortfolioRepo = Depends(get_portfolio_repo),
    watchlist_repo: WatchlistRepo = Depends(get_watchlist_repo),
) -> PortfolioResponse:
    if not await watchlist_repo.profile_exists(user_id):
        raise HTTPException(status_code=401, detail="unauthenticated")

    result = await repo.get_primary_with_transactions(user_id)
    if result is None:
        empty = Portfolio(
            id=uuid4(),
            name="Primary Portfolio",
            currency="KRW",
            updated_at=datetime.now(tz=timezone.utc),
            holdings=[],
            transactions=[],
        )
        return PortfolioResponse(portfolio=empty)

    portfolio, tx_rows = result
    portfolio.holdings = _derive_holdings(tx_rows)
    return PortfolioResponse(portfolio=portfolio)


def _derive_holdings(tx_rows: List[Dict[str, Any]]) -> List[Holding]:
    # Walk transactions oldest-first so cost basis tracks correctly.
    ordered = sorted(tx_rows, key=lambda r: r["occurred_at"])

    by_instrument: Dict[str, Dict[str, Any]] = {}
    for r in ordered:
        if r["type"] not in ("buy", "sell"):
            continue
        instrument = r.get("instruments") or {}
        key = (instrument.get("symbol"), instrument.get("exchange"))
        if not key[0]:
            continue
        state = by_instrument.setdefault(
            f"{key[0]}|{key[1]}",
            {
                "symbol": instrument["symbol"],
                "name": instrument.get("name", instrument["symbol"]),
                "exchange": instrument.get("exchange", ""),
                "currency": instrument.get("currency", r["currency"]),
                "quantity": 0.0,
                "cost_basis": 0.0,
            },
        )
        qty = float(r["quantity"])
        price = float(r["price"])
        if r["type"] == "buy":
            state["cost_basis"] += qty * price
            state["quantity"] += qty
        else:  # sell
            if state["quantity"] > 0:
                avg = state["cost_basis"] / state["quantity"]
                state["cost_basis"] -= qty * avg
                state["quantity"] -= qty

    holdings: List[Holding] = []
    for state in by_instrument.values():
        if state["quantity"] <= 1e-9:
            continue
        quantity = state["quantity"]
        cost_basis = max(state["cost_basis"], 0.0)
        average_cost = cost_basis / quantity if quantity else 0.0
        holdings.append(
            Holding(
                symbol=state["symbol"],
                name=state["name"],
                exchange=state["exchange"],
                currency=state["currency"],
                quantity=quantity,
                average_cost=average_cost,
                cost_basis=cost_basis,
            )
        )
    holdings.sort(key=lambda h: h.symbol)
    return holdings
