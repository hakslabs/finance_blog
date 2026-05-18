"""Live portfolio snapshot: enrich holdings with latest prices.

Builds {totals, composition, top_holdings, holdings_with_price} from
the user's holdings + price_bars_daily. Front-end uses this to power
the dashboard portfolio strip without computing on the client.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import CurrentUser, get_current_user_id
from app.repos.portfolios import PortfolioRepo, get_portfolio_repo
from app.routes.portfolios import _derive_holdings
from app.settings import Settings, get_settings


router = APIRouter(prefix="/portfolios", tags=["portfolios"])


class SnapshotHolding(BaseModel):
    symbol: str
    name: str
    exchange: str
    currency: str
    quantity: float
    average_cost: float
    cost_basis: float
    last_price: Optional[float] = None
    market_value: Optional[float] = None
    today_change: Optional[float] = None
    today_pct: Optional[float] = None
    weight_pct: Optional[float] = None
    pnl: Optional[float] = None
    pnl_pct: Optional[float] = None


class Composition(BaseModel):
    label: str
    percent: float
    amount: float


class Totals(BaseModel):
    currency: str
    total_value: float
    total_cost: float
    today_pnl: float
    today_pct: float
    total_return: float
    total_return_pct: float


class SnapshotResponse(BaseModel):
    totals: Totals
    composition: List[Composition]
    top_holdings: List[SnapshotHolding]
    holdings: List[SnapshotHolding]


def _sb_headers(s: Settings) -> Dict[str, str]:
    return {
        "apikey": s.supabase_service_role_key or "",
        "Authorization": f"Bearer {s.supabase_service_role_key or ''}",
        "Accept": "application/json",
    }


@router.get("/me/snapshot", response_model=SnapshotResponse)
async def portfolio_snapshot(
    user: CurrentUser = Depends(get_current_user_id),
    repo: PortfolioRepo = Depends(get_portfolio_repo),
    settings: Settings = Depends(get_settings),
) -> SnapshotResponse:
    result = await repo.get_primary_with_transactions(user.id)
    portfolio_currency = "KRW"
    holdings = []
    if result is not None:
        portfolio, tx_rows = result
        portfolio_currency = portfolio.currency
        holdings = _derive_holdings(tx_rows)

    empty = SnapshotResponse(
        totals=Totals(currency=portfolio_currency, total_value=0, total_cost=0,
                      today_pnl=0, today_pct=0, total_return=0, total_return_pct=0),
        composition=[], top_holdings=[], holdings=[],
    )
    if not holdings:
        return empty
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return empty

    base = settings.supabase_url.rstrip("/")
    headers = _sb_headers(settings)
    async with httpx.AsyncClient(timeout=10.0, headers=headers) as client:
        # Look up instrument ids by (symbol, exchange).
        symbols = list({h.symbol for h in holdings})
        inst_resp = await client.get(
            f"{base}/rest/v1/instruments",
            params={
                "symbol": f"in.({','.join(symbols)})",
                "select": "id,symbol,exchange",
            },
        )
        if inst_resp.status_code >= 400:
            raise HTTPException(status_code=503, detail="upstream_unavailable")
        inst_rows = inst_resp.json()
        sym_to_id: Dict[str, str] = {}
        for r in inst_rows:
            sym_to_id[(r["symbol"], r.get("exchange"))] = r["id"]  # type: ignore[index]

        # Latest 2 bars per instrument.
        ids = list({v for v in sym_to_id.values()})
        bars_by_inst: Dict[str, List[Dict[str, Any]]] = {}
        for start in range(0, len(ids), 50):
            chunk = ids[start : start + 50]
            if not chunk:
                continue
            bars_resp = await client.get(
                f"{base}/rest/v1/price_bars_daily",
                params={
                    "instrument_id": f"in.({','.join(chunk)})",
                    "select": "instrument_id,t,c",
                    "order": "t.desc",
                    "limit": "200",
                },
            )
            if bars_resp.status_code >= 400:
                continue
            for row in bars_resp.json():
                bars_by_inst.setdefault(row["instrument_id"], []).append(row)

    enriched: List[SnapshotHolding] = []
    total_value = 0.0
    total_cost = 0.0
    today_pnl_sum = 0.0
    for h in holdings:
        inst_id = sym_to_id.get((h.symbol, h.exchange))
        bars = bars_by_inst.get(inst_id) if inst_id else None
        last_price = float(bars[0]["c"]) if bars else None
        prev = float(bars[1]["c"]) if (bars and len(bars) >= 2) else None
        market_value = last_price * h.quantity if last_price is not None else None
        today_change = (last_price - prev) if (last_price is not None and prev is not None) else None
        today_pct = (today_change / prev * 100) if (today_change is not None and prev) else None
        pnl = (market_value - h.cost_basis) if market_value is not None else None
        pnl_pct = (pnl / h.cost_basis * 100) if (pnl is not None and h.cost_basis > 0) else None
        snap = SnapshotHolding(
            symbol=h.symbol, name=h.name, exchange=h.exchange, currency=h.currency,
            quantity=h.quantity, average_cost=h.average_cost, cost_basis=h.cost_basis,
            last_price=last_price, market_value=market_value,
            today_change=today_change, today_pct=today_pct,
            pnl=pnl, pnl_pct=pnl_pct,
        )
        enriched.append(snap)
        if market_value is not None:
            total_value += market_value
            total_cost += h.cost_basis
            if today_change is not None:
                today_pnl_sum += today_change * h.quantity

    # weight_pct per holding
    for s in enriched:
        if s.market_value is not None and total_value > 0:
            s.weight_pct = round((s.market_value / total_value) * 100, 2)

    today_pct_total = (today_pnl_sum / (total_value - today_pnl_sum) * 100) if (total_value - today_pnl_sum) > 0 else 0.0
    total_return = total_value - total_cost
    total_return_pct = (total_return / total_cost * 100) if total_cost > 0 else 0.0

    # Composition: by symbol weight (top 5 + 기타).
    sorted_enriched = sorted(
        [s for s in enriched if s.market_value is not None and s.market_value > 0],
        key=lambda s: s.market_value or 0,
        reverse=True,
    )
    composition: List[Composition] = []
    for s in sorted_enriched[:5]:
        composition.append(Composition(
            label=s.symbol,
            percent=s.weight_pct or 0,
            amount=s.market_value or 0,
        ))
    if len(sorted_enriched) > 5:
        rest = sorted_enriched[5:]
        rest_amount = sum(s.market_value or 0 for s in rest)
        rest_pct = round((rest_amount / total_value) * 100, 2) if total_value > 0 else 0
        composition.append(Composition(label="기타", percent=rest_pct, amount=rest_amount))

    top_holdings = sorted_enriched[:6]

    return SnapshotResponse(
        totals=Totals(
            currency=portfolio_currency,
            total_value=round(total_value, 2),
            total_cost=round(total_cost, 2),
            today_pnl=round(today_pnl_sum, 2),
            today_pct=round(today_pct_total, 4),
            total_return=round(total_return, 2),
            total_return_pct=round(total_return_pct, 4),
        ),
        composition=composition,
        top_holdings=top_holdings,
        holdings=enriched,
    )
