"""Portfolio repository against Supabase PostgREST.

PR-11 reads only the primary portfolio + its transactions. Holdings are
derived in the route via the average-cost method; no positions table.
The API keeps using the service role key server-side; owner filtering is
explicit in the query.
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

import httpx
from fastapi import Depends, HTTPException

from app.models.portfolios import Portfolio, Transaction
from app.settings import Settings, get_settings


_PORTFOLIO_SELECT = "id,name,currency,updated_at"
_TX_SELECT = (
    "id,occurred_at,type,quantity,price,amount,currency,note,"
    "instruments(symbol,name,exchange,currency)"
)


class PortfolioRepo:
    def __init__(self, supabase_url: str, service_role_key: str) -> None:
        self._base_url = supabase_url.rstrip("/")
        self._headers = {
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Accept": "application/json",
        }

    async def _get(self, path: str, params: Dict[str, str]) -> Any:
        url = f"{self._base_url}{path}"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(url, params=params, headers=self._headers)
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=503, detail="upstream_unavailable") from exc
        if response.status_code >= 400:
            raise HTTPException(status_code=503, detail="upstream_unavailable")
        return response.json()

    async def get_primary_with_transactions(
        self, user_id: UUID
    ) -> Optional[Tuple[Portfolio, List[Dict[str, Any]]]]:
        portfolios = await self._get(
            "/rest/v1/portfolios",
            {
                "user_id": f"eq.{user_id}",
                "is_primary": "eq.true",
                "select": _PORTFOLIO_SELECT,
                "limit": "1",
            },
        )
        if not portfolios:
            return None
        row = portfolios[0]
        portfolio_id = row["id"]

        tx_rows = await self._get(
            "/rest/v1/transactions",
            {
                "portfolio_id": f"eq.{portfolio_id}",
                "select": _TX_SELECT,
                "order": "occurred_at.desc,created_at.desc",
            },
        )

        transactions = [_row_to_transaction(r) for r in tx_rows]

        portfolio = Portfolio(
            id=row["id"],
            name=row["name"],
            currency=row["currency"],
            updated_at=_parse_dt(row["updated_at"]),
            holdings=[],
            transactions=transactions,
        )
        return portfolio, tx_rows


def _row_to_transaction(r: Dict[str, Any]) -> Transaction:
    instrument = r.get("instruments") or {}
    return Transaction(
        id=r["id"],
        occurred_at=date.fromisoformat(r["occurred_at"]),
        type=r["type"],
        symbol=instrument.get("symbol"),
        quantity=_as_float(r.get("quantity")),
        price=_as_float(r.get("price")),
        amount=float(r["amount"]),
        currency=r["currency"],
        note=r.get("note"),
    )


def _as_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    return float(value)


def _parse_dt(value: str) -> datetime:
    normalized = value.replace("Z", "+00:00")
    dt = datetime.fromisoformat(normalized)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def get_portfolio_repo(settings: Settings = Depends(get_settings)) -> PortfolioRepo:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(status_code=503, detail="upstream_unavailable")
    return PortfolioRepo(settings.supabase_url, settings.supabase_service_role_key)
