from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


class WatchlistItem(BaseModel):
    symbol: str
    name: str
    exchange: str
    currency: str
    last_price: Optional[float] = None
    last_price_at: Optional[datetime] = None
    note: Optional[str] = None


class Watchlist(BaseModel):
    id: UUID
    name: str
    updated_at: datetime
    items: List[WatchlistItem]


class WatchlistResponse(BaseModel):
    watchlist: Watchlist
