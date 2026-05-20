from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Path
from pydantic import BaseModel, Field

from app.auth import CurrentUser, get_current_user_id
from app.models.watchlists import Watchlist, WatchlistResponse
from app.repos.watchlists import WatchlistRepo, get_watchlist_repo


router = APIRouter(prefix="/watchlists", tags=["watchlists"])


class WatchlistItemCreate(BaseModel):
    symbol: str = Field(..., min_length=1)
    exchange: Optional[str] = None
    note: Optional[str] = None


@router.get("/me", response_model=WatchlistResponse)
async def get_my_watchlist(
    user: CurrentUser = Depends(get_current_user_id),
    repo: WatchlistRepo = Depends(get_watchlist_repo),
) -> WatchlistResponse:
    user_id = user.id
    await repo.ensure_profile(user_id, user.email)

    watchlist = await repo.get_primary_for_user(user_id)
    if watchlist is None:
        # No primary watchlist row yet — return an empty container so the UI
        # can render an empty state instead of treating it as an error.
        watchlist = Watchlist(
            id=uuid4(),
            name="Primary Watchlist",
            updated_at=datetime.now(tz=timezone.utc),
            items=[],
        )
    return WatchlistResponse(watchlist=watchlist)


@router.post("/me/items", response_model=WatchlistResponse)
async def add_watchlist_item(
    body: WatchlistItemCreate,
    user: CurrentUser = Depends(get_current_user_id),
    repo: WatchlistRepo = Depends(get_watchlist_repo),
) -> WatchlistResponse:
    await repo.ensure_profile(user.id, user.email)
    watchlist_id = await repo.ensure_primary_watchlist(user.id)
    instrument_id = await repo.resolve_instrument_id(body.symbol, body.exchange)
    if instrument_id is None:
        raise HTTPException(status_code=404, detail="instrument_not_found")
    await repo.add_item(watchlist_id, instrument_id, body.note)
    watchlist = await repo.get_primary_for_user(user.id)
    if watchlist is None:
        raise HTTPException(status_code=500, detail="watchlist_missing")
    return WatchlistResponse(watchlist=watchlist)


@router.delete("/me/items/{symbol}", response_model=WatchlistResponse)
async def remove_watchlist_item(
    symbol: str = Path(..., min_length=1),
    exchange: Optional[str] = None,
    user: CurrentUser = Depends(get_current_user_id),
    repo: WatchlistRepo = Depends(get_watchlist_repo),
) -> WatchlistResponse:
    await repo.ensure_profile(user.id, user.email)
    watchlist_id = await repo.ensure_primary_watchlist(user.id)
    instrument_id = await repo.resolve_instrument_id(symbol, exchange)
    if instrument_id is None:
        raise HTTPException(status_code=404, detail="instrument_not_found")
    await repo.remove_item(watchlist_id, instrument_id)
    watchlist = await repo.get_primary_for_user(user.id)
    if watchlist is None:
        raise HTTPException(status_code=500, detail="watchlist_missing")
    return WatchlistResponse(watchlist=watchlist)
