"""Watchlist repository against Supabase PostgREST.

PR-09 reads only the primary watchlist for a user. Writes land in a later PR.
The dev-header path uses the service role key server-side; row ownership is
enforced explicitly in the query (`user_id = eq.<uuid>`) rather than via RLS,
because RLS keys off `auth.uid()` which is only populated under JWT auth
(PR-14).
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

import httpx
from fastapi import Depends, HTTPException

from app.models.watchlists import Watchlist, WatchlistItem
from app.settings import Settings, get_settings


_WATCHLIST_SELECT = (
    "id,name,updated_at,"
    "watchlist_items(position,note,"
    "instruments(symbol,name,exchange,currency))"
)


class WatchlistRepo:
    def __init__(self, supabase_url: str, service_role_key: str) -> None:
        self._base_url = supabase_url.rstrip("/")
        self._headers = {
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Accept": "application/json",
        }

    async def profile_exists(self, user_id: UUID) -> bool:
        params = {
            "id": f"eq.{user_id}",
            "select": "id",
            "limit": "1",
        }
        url = f"{self._base_url}/rest/v1/profiles"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(url, params=params, headers=self._headers)
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=503, detail="upstream_unavailable") from exc

        if response.status_code >= 400:
            raise HTTPException(status_code=503, detail="upstream_unavailable")

        return bool(response.json())

    async def get_primary_for_user(self, user_id: UUID) -> Optional[Watchlist]:
        params = {
            "user_id": f"eq.{user_id}",
            "is_primary": "eq.true",
            "select": _WATCHLIST_SELECT,
            "limit": "1",
        }
        url = f"{self._base_url}/rest/v1/watchlists"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(url, params=params, headers=self._headers)
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=503, detail="upstream_unavailable") from exc

        if response.status_code >= 400:
            raise HTTPException(status_code=503, detail="upstream_unavailable")

        rows = response.json()
        if not rows:
            return None
        return _row_to_watchlist(rows[0])


def _row_to_watchlist(row: Dict[str, Any]) -> Watchlist:
    raw_items = row.get("watchlist_items") or []
    sorted_items = sorted(raw_items, key=lambda r: r.get("position", 0))
    items: List[WatchlistItem] = []
    for r in sorted_items:
        instrument = r.get("instruments") or {}
        items.append(
            WatchlistItem(
                symbol=instrument.get("symbol", ""),
                name=instrument.get("name", ""),
                exchange=instrument.get("exchange", ""),
                currency=instrument.get("currency", ""),
                last_price=None,
                last_price_at=None,
                note=r.get("note"),
            )
        )
    return Watchlist(
        id=row["id"],
        name=row["name"],
        updated_at=_parse_dt(row["updated_at"]),
        items=items,
    )


def _parse_dt(value: str) -> datetime:
    # PostgREST returns ISO 8601 timestamps; normalize trailing 'Z' to +00:00.
    normalized = value.replace("Z", "+00:00")
    dt = datetime.fromisoformat(normalized)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def get_watchlist_repo(settings: Settings = Depends(get_settings)) -> WatchlistRepo:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(status_code=503, detail="upstream_unavailable")
    return WatchlistRepo(settings.supabase_url, settings.supabase_service_role_key)
