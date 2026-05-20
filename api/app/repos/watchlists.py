"""Watchlist repository against Supabase PostgREST.

PR-09 reads only the primary watchlist for a user. Writes land in a later PR.
The API keeps using the service role key server-side; row ownership is enforced
explicitly in the query (`user_id = eq.<uuid>`) so the browser never receives
private database credentials.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

import httpx
from fastapi import Depends, HTTPException

from app.models.watchlists import Watchlist, WatchlistItem
from app.settings import Settings, get_settings


DEV_SEED_USER_ID = UUID("00000000-0000-4000-8000-000000000001")
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

    async def ensure_profile(self, user_id: UUID, email: Optional[str]) -> None:
        if await self.profile_exists(user_id):
            return

        display_name = email.split("@", 1)[0] if email else "Finance_lab User"
        payload = {
            "id": str(user_id),
            "display_name": display_name,
            "email": email,
        }
        url = f"{self._base_url}/rest/v1/profiles"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(
                    url,
                    json=payload,
                    headers={**self._headers, "Prefer": "return=minimal"},
                )
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=503, detail="upstream_unavailable") from exc

        if response.status_code not in (201, 409):
            raise HTTPException(status_code=503, detail="upstream_unavailable")

        await self._claim_dev_seed_data(user_id)

    async def _claim_dev_seed_data(self, user_id: UUID) -> None:
        if user_id == DEV_SEED_USER_ID:
            return

        for table in ("watchlists", "portfolios"):
            url = f"{self._base_url}/rest/v1/{table}"
            params = {"user_id": f"eq.{DEV_SEED_USER_ID}"}
            payload = {"user_id": str(user_id)}
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    response = await client.patch(
                        url,
                        params=params,
                        json=payload,
                        headers={**self._headers, "Prefer": "return=minimal"},
                    )
            except httpx.HTTPError as exc:
                raise HTTPException(status_code=503, detail="upstream_unavailable") from exc

            if response.status_code == 404:
                continue
            if response.status_code >= 400:
                raise HTTPException(status_code=503, detail="upstream_unavailable")

    async def ensure_primary_watchlist(self, user_id: UUID) -> UUID:
        """Return the user's primary watchlist id, creating one if missing."""
        params = {
            "user_id": f"eq.{user_id}",
            "is_primary": "eq.true",
            "select": "id",
            "limit": "1",
        }
        url = f"{self._base_url}/rest/v1/watchlists"
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, params=params, headers=self._headers)
        if resp.status_code >= 400:
            raise HTTPException(status_code=503, detail="upstream_unavailable")
        rows = resp.json()
        if rows:
            return UUID(rows[0]["id"])
        # Create a primary watchlist for this user.
        payload = {
            "user_id": str(user_id),
            "name": "Primary Watchlist",
            "is_primary": True,
        }
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                url,
                json=payload,
                headers={**self._headers, "Prefer": "return=representation"},
            )
        if resp.status_code >= 400:
            raise HTTPException(status_code=503, detail="upstream_unavailable")
        return UUID(resp.json()[0]["id"])

    async def resolve_instrument_id(
        self, symbol: str, exchange: Optional[str] = None
    ) -> Optional[UUID]:
        params: Dict[str, str] = {
            "symbol": f"eq.{symbol}",
            "select": "id",
            "limit": "1",
        }
        if exchange:
            params["exchange"] = f"eq.{exchange}"
        url = f"{self._base_url}/rest/v1/instruments"
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, params=params, headers=self._headers)
        if resp.status_code >= 400:
            return None
        rows = resp.json()
        return UUID(rows[0]["id"]) if rows else None

    async def add_item(
        self, watchlist_id: UUID, instrument_id: UUID, note: Optional[str] = None
    ) -> None:
        url = f"{self._base_url}/rest/v1/watchlist_items"
        payload: Dict[str, Any] = {
            "watchlist_id": str(watchlist_id),
            "instrument_id": str(instrument_id),
        }
        if note is not None:
            payload["note"] = note
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                url,
                json=payload,
                headers={
                    **self._headers,
                    "Prefer": "return=minimal,resolution=merge-duplicates",
                },
            )
        if resp.status_code >= 400 and resp.status_code != 409:
            raise HTTPException(status_code=resp.status_code, detail=resp.text[:200])

    async def remove_item(self, watchlist_id: UUID, instrument_id: UUID) -> None:
        url = f"{self._base_url}/rest/v1/watchlist_items"
        params = {
            "watchlist_id": f"eq.{watchlist_id}",
            "instrument_id": f"eq.{instrument_id}",
        }
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.delete(url, params=params, headers=self._headers)
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.text[:200])

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
