from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends

from app.auth import CurrentUser, get_current_user_id
from app.models.watchlists import Watchlist, WatchlistResponse
from app.repos.watchlists import WatchlistRepo, get_watchlist_repo


router = APIRouter(prefix="/watchlists", tags=["watchlists"])


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
