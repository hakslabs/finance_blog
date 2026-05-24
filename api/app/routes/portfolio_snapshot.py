"""Live portfolio snapshot: enrich holdings with latest prices.

Builds {totals, composition, top_holdings, holdings_with_price} from
the user's holdings + price_bars_daily. Front-end uses this to power
the dashboard portfolio strip without computing on the client.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Dict, List, Literal, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.auth import CurrentUser, get_current_user_id
from app.repos.portfolios import PortfolioRepo, get_portfolio_repo
from app.routes.portfolios import _derive_holdings
from app.settings import Settings, get_settings


router = APIRouter(prefix="/portfolios", tags=["portfolios"])
KRW_PER_USD = 1300.0


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


class PortfolioHistoryPoint(BaseModel):
    date: str
    portfolio: Optional[float] = None
    cost: Optional[float] = None


class PortfolioHistoryHolding(BaseModel):
    symbol: str
    requested_days: int = 0
    returned_count: int = 0
    from_date: Optional[str] = None
    to_date: Optional[str] = None


class PortfolioHistoryResponse(BaseModel):
    currency: str
    requested_days: int = 0
    rows: List[PortfolioHistoryPoint]
    holdings: List[PortfolioHistoryHolding]


class InvestmentFlowPoint(BaseModel):
    date: str
    label: str
    value: float
    netFlow: float


class RealizedPnlPoint(BaseModel):
    date: str
    label: str
    pnl: float
    cumPnl: float


class PortfolioAnalyticsResponse(BaseModel):
    currency: str
    flow_currency: str
    pnl_currency: str
    investment_flow: List[InvestmentFlowPoint]
    realized_pnl: List[RealizedPnlPoint]
    total_buy: float
    total_sell: float
    total_fee: float = 0
    total_realized_pnl: float


def _sb_headers(s: Settings) -> Dict[str, str]:
    return {
        "apikey": s.supabase_service_role_key or "",
        "Authorization": f"Bearer {s.supabase_service_role_key or ''}",
        "Accept": "application/json",
    }


def _convert_currency(value: float, source: str, target: str) -> float:
    source = source.upper()
    target = target.upper()
    if source == target:
        return value
    if source == "USD" and target == "KRW":
        return value * KRW_PER_USD
    if source == "KRW" and target == "USD":
        return value / KRW_PER_USD
    return value


async def _lookup_instrument_ids(
    client: httpx.AsyncClient,
    base: str,
    holdings: List[Any],
) -> Dict[tuple[str, str], str]:
    symbols = sorted({h.symbol for h in holdings})
    if not symbols:
        return {}
    inst_resp = await client.get(
        f"{base}/rest/v1/instruments",
        params={
            "symbol": f"in.({','.join(symbols)})",
            "select": "id,symbol,exchange",
        },
    )
    if inst_resp.status_code >= 400:
        raise HTTPException(status_code=503, detail="upstream_unavailable")
    sym_to_id: Dict[tuple[str, str], str] = {}
    for row in inst_resp.json():
        sym_to_id[(row["symbol"], row.get("exchange") or "")] = row["id"]
    return sym_to_id


def _build_portfolio_history_rows(
    holdings: List[Any],
    bars_by_symbol: Dict[str, List[Dict[str, Any]]],
    currency: str,
) -> List[PortfolioHistoryPoint]:
    date_set: set[str] = set()
    price_by_symbol: Dict[str, Dict[str, float]] = {}
    for symbol, rows in bars_by_symbol.items():
        prices: Dict[str, float] = {}
        for row in rows:
            date_value = str(row["t"])[:10]
            close = float(row["c"])
            prices[date_value] = close
            date_set.add(date_value)
        price_by_symbol[symbol] = prices

    last_by_symbol: Dict[str, float] = {}
    total_cost = sum(
        _convert_currency(h.cost_basis, h.currency, currency) for h in holdings
    )
    points: List[PortfolioHistoryPoint] = []
    for date_value in sorted(date_set):
        value = 0.0
        has_price = False
        for holding in holdings:
            close = price_by_symbol.get(holding.symbol, {}).get(date_value)
            if close is not None:
                last_by_symbol[holding.symbol] = close
            last = last_by_symbol.get(holding.symbol)
            if last is None:
                continue
            has_price = True
            value += _convert_currency(
                last * holding.quantity,
                holding.currency,
                currency,
            )
        points.append(
            PortfolioHistoryPoint(
                date=date_value,
                portfolio=round(value, 2) if has_price else None,
                cost=round(total_cost, 2),
            )
        )
    return points


def _parse_date(value: str) -> date:
    return date.fromisoformat(value[:10])


def _period_label(day: date, period: Literal["week", "month", "year"]) -> str:
    if period in ("week", "month"):
        return day.isoformat()[5:10]
    return f"{day.month}월"


def _investment_windows(period: Literal["week", "month", "year"]) -> List[tuple[date, date]]:
    today = date.today()
    if period == "year":
        windows: List[tuple[date, date]] = []
        for offset in range(11, -1, -1):
            month = today.month - offset
            year = today.year
            while month <= 0:
                month += 12
                year -= 1
            start = date(year, month, 1)
            next_month = month + 1
            next_year = year
            if next_month > 12:
                next_month = 1
                next_year += 1
            end = date(next_year, next_month, 1) - timedelta(days=1)
            windows.append((start, end))
        return windows
    days = 7 if period == "week" else 30
    return [
        (today - timedelta(days=offset), today - timedelta(days=offset))
        for offset in range(days - 1, -1, -1)
    ]


def _realized_windows(period: Literal["day", "week", "month", "year"]) -> List[tuple[str, date, date]]:
    today = date.today()
    if period == "day":
        return [
            (day.isoformat(), day, day)
            for day in (today - timedelta(days=offset) for offset in range(13, -1, -1))
        ]
    if period == "week":
        start_this_week = today - timedelta(days=(today.weekday() + 1) % 7)
        return [
            (
                (start_this_week - timedelta(days=offset * 7)).isoformat(),
                start_this_week - timedelta(days=offset * 7),
                start_this_week - timedelta(days=offset * 7) + timedelta(days=6),
            )
            for offset in range(11, -1, -1)
        ]
    if period == "month":
        windows: List[tuple[str, date, date]] = []
        for offset in range(11, -1, -1):
            month = today.month - offset
            year = today.year
            while month <= 0:
                month += 12
                year -= 1
            start = date(year, month, 1)
            next_month = month + 1
            next_year = year
            if next_month > 12:
                next_month = 1
                next_year += 1
            end = date(next_year, next_month, 1) - timedelta(days=1)
            windows.append((f"{year}-{month:02d}", start, end))
        return windows
    return [
        (str(year), date(year, 1, 1), date(year, 12, 31))
        for year in range(today.year - 4, today.year + 1)
    ]


def _tx_instrument(row: Dict[str, Any]) -> Dict[str, Any]:
    return row.get("instruments") or {}


def _tx_symbol(row: Dict[str, Any]) -> str:
    return str(_tx_instrument(row).get("symbol") or "")


def _tx_currency(row: Dict[str, Any], fallback: str) -> str:
    instrument = _tx_instrument(row)
    return str(instrument.get("currency") or row.get("currency") or fallback)


def _tx_amount(row: Dict[str, Any]) -> float:
    if row.get("amount") is not None:
        return float(row["amount"])
    if row.get("quantity") is not None and row.get("price") is not None:
        return float(row["quantity"]) * float(row["price"])
    return 0.0


def _build_investment_flow(
    tx_rows: List[Dict[str, Any]],
    currency: str,
    period: Literal["week", "month", "year"],
) -> List[InvestmentFlowPoint]:
    windows = _investment_windows(period)
    first_start = windows[0][0] if windows else None

    def cash_to_currency(row: Dict[str, Any]) -> float:
        amount = _convert_currency(_tx_amount(row), _tx_currency(row, currency), currency)
        return amount if row.get("type") == "buy" else -amount if row.get("type") == "sell" else 0

    cumulative = 0.0
    if first_start is not None:
        for row in tx_rows:
            if row.get("type") not in ("buy", "sell"):
                continue
            if _parse_date(str(row["occurred_at"])) < first_start:
                cumulative += cash_to_currency(row)

    points: List[InvestmentFlowPoint] = []
    for index, (start, end) in enumerate(windows):
        net_flow = 0.0
        for row in tx_rows:
            if row.get("type") not in ("buy", "sell"):
                continue
            occurred = _parse_date(str(row["occurred_at"]))
            if start <= occurred <= end:
                net_flow += cash_to_currency(row)
        cumulative += net_flow
        points.append(
            InvestmentFlowPoint(
                date=start.isoformat(),
                label="" if period == "month" and index % 5 != 0 else _period_label(start, period),
                value=round(cumulative, 2),
                netFlow=round(net_flow, 2),
            )
        )
    return points


def _build_realized_pnl(
    tx_rows: List[Dict[str, Any]],
    currency: str,
    period: Literal["day", "week", "month", "year"],
) -> List[RealizedPnlPoint]:
    windows = _realized_windows(period)
    pnl_by_label = {label: 0.0 for label, _, _ in windows}
    first_start = windows[0][1] if windows else None
    state_by_symbol: Dict[str, Dict[str, float]] = {}
    cumulative_before = 0.0

    for row in sorted(tx_rows, key=lambda r: str(r["occurred_at"])):
        if row.get("type") not in ("buy", "sell"):
            continue
        symbol = _tx_symbol(row)
        if not symbol:
            continue
        quantity = float(row.get("quantity") or 0)
        price = float(row.get("price") or 0)
        if quantity <= 0 or price <= 0:
            continue
        state = state_by_symbol.setdefault(symbol, {"cost": 0.0, "quantity": 0.0})
        if row.get("type") == "buy":
            state["cost"] += _convert_currency(_tx_amount(row), _tx_currency(row, currency), currency)
            state["quantity"] += quantity
            continue

        avg = state["cost"] / state["quantity"] if state["quantity"] > 0 else _convert_currency(price, _tx_currency(row, currency), currency)
        sell_qty = min(quantity, state["quantity"]) if state["quantity"] > 0 else quantity
        sell_price = _convert_currency(price, _tx_currency(row, currency), currency)
        pnl = (sell_price - avg) * sell_qty
        if state["quantity"] > 0:
            state["cost"] = max(0.0, state["cost"] - avg * sell_qty)
            state["quantity"] = max(0.0, state["quantity"] - sell_qty)

        occurred = _parse_date(str(row["occurred_at"]))
        matched = False
        for label, start, end in windows:
            if start <= occurred <= end:
                pnl_by_label[label] += pnl
                matched = True
                break
        if not matched and first_start is not None and occurred < first_start:
            cumulative_before += pnl

    cumulative = cumulative_before
    points: List[RealizedPnlPoint] = []
    for label, start, _ in windows:
        pnl = pnl_by_label[label]
        cumulative += pnl
        display_label = (
            label[5:]
            if period == "day"
            else f"{label[5:]}월"
            if period == "month"
            else label[5:]
            if period == "week"
            else label
        )
        points.append(
            RealizedPnlPoint(
                date=f"{label}-01-01" if period == "year" else f"{label}-01" if period == "month" else label,
                label=display_label,
                pnl=round(pnl, 2),
                cumPnl=round(cumulative, 2),
            )
        )
    return points


def _build_portfolio_analytics(
    tx_rows: List[Dict[str, Any]],
    flow_currency: str,
    pnl_currency: str,
    flow_period: Literal["week", "month", "year"],
    pnl_period: Literal["day", "week", "month", "year"],
) -> PortfolioAnalyticsResponse:
    total_buy = 0.0
    total_sell = 0.0
    for row in tx_rows:
        if row.get("type") == "buy":
            total_buy += _convert_currency(_tx_amount(row), _tx_currency(row, flow_currency), flow_currency)
        elif row.get("type") == "sell":
            total_sell += _convert_currency(_tx_amount(row), _tx_currency(row, flow_currency), flow_currency)
    realized = _build_realized_pnl(tx_rows, pnl_currency, pnl_period)
    return PortfolioAnalyticsResponse(
        currency=flow_currency,
        flow_currency=flow_currency,
        pnl_currency=pnl_currency,
        investment_flow=_build_investment_flow(tx_rows, flow_currency, flow_period),
        realized_pnl=realized,
        total_buy=round(total_buy, 2),
        total_sell=round(total_sell, 2),
        total_realized_pnl=realized[-1].cumPnl if realized else 0,
    )


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
        sym_to_id = await _lookup_instrument_ids(client, base, holdings)

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


@router.get("/me/history", response_model=PortfolioHistoryResponse)
async def portfolio_history(
    days: int = Query(1825, ge=1, le=1825),
    user: CurrentUser = Depends(get_current_user_id),
    repo: PortfolioRepo = Depends(get_portfolio_repo),
    settings: Settings = Depends(get_settings),
) -> PortfolioHistoryResponse:
    result = await repo.get_primary_with_transactions(user.id)
    portfolio_currency = "KRW"
    holdings = []
    if result is not None:
        portfolio, tx_rows = result
        portfolio_currency = portfolio.currency
        holdings = _derive_holdings(tx_rows)

    empty = PortfolioHistoryResponse(
        currency=portfolio_currency,
        requested_days=days,
        rows=[],
        holdings=[],
    )
    if not holdings:
        return empty
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return empty

    base = settings.supabase_url.rstrip("/")
    headers = _sb_headers(settings)
    async with httpx.AsyncClient(timeout=12.0, headers=headers) as client:
        sym_to_id = await _lookup_instrument_ids(client, base, holdings)
        bars_by_symbol: Dict[str, List[Dict[str, Any]]] = {}
        summaries: List[PortfolioHistoryHolding] = []
        for holding in holdings[:20]:
            inst_id = sym_to_id.get((holding.symbol, holding.exchange))
            rows: List[Dict[str, Any]] = []
            if inst_id:
                page_size = 1000
                offset = 0
                collected: List[Dict[str, Any]] = []
                while len(collected) < days:
                    limit = min(page_size, days - len(collected))
                    response = await client.get(
                        f"{base}/rest/v1/price_bars_daily",
                        params={
                            "instrument_id": f"eq.{inst_id}",
                            "select": "t,c",
                            "order": "t.desc",
                            "limit": str(limit),
                            "offset": str(offset),
                        },
                    )
                    if response.status_code >= 400:
                        break
                    page = response.json()
                    if not page:
                        break
                    collected.extend(page)
                    offset += len(page)
                    if len(page) < limit:
                        break
                rows = list(reversed(collected))
                if rows:
                    bars_by_symbol[holding.symbol] = rows
            summaries.append(
                PortfolioHistoryHolding(
                    symbol=holding.symbol,
                    requested_days=days,
                    returned_count=len(rows),
                    from_date=str(rows[0]["t"])[:10] if rows else None,
                    to_date=str(rows[-1]["t"])[:10] if rows else None,
                )
            )

    return PortfolioHistoryResponse(
        currency=portfolio_currency,
        requested_days=days,
        rows=_build_portfolio_history_rows(holdings, bars_by_symbol, portfolio_currency),
        holdings=summaries,
    )


@router.get("/me/analytics", response_model=PortfolioAnalyticsResponse)
async def portfolio_analytics(
    flow_period: Literal["week", "month", "year"] = Query("month"),
    pnl_period: Literal["day", "week", "month", "year"] = Query("month"),
    flow_currency: Literal["KRW", "USD"] = Query("KRW"),
    pnl_currency: Literal["KRW", "USD"] = Query("USD"),
    user: CurrentUser = Depends(get_current_user_id),
    repo: PortfolioRepo = Depends(get_portfolio_repo),
) -> PortfolioAnalyticsResponse:
    result = await repo.get_primary_with_transactions(user.id)
    if result is None:
        return PortfolioAnalyticsResponse(
            currency=flow_currency,
            flow_currency=flow_currency,
            pnl_currency=pnl_currency,
            investment_flow=[],
            realized_pnl=[],
            total_buy=0,
            total_sell=0,
            total_realized_pnl=0,
        )
    portfolio, tx_rows = result
    return _build_portfolio_analytics(
        tx_rows,
        flow_currency,
        pnl_currency,
        flow_period,
        pnl_period,
    )
