from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel


Interval = Literal["1d", "1h"]
Range = Literal["1mo", "3mo", "6mo", "1y", "5y"]


class Bar(BaseModel):
    t: datetime
    o: float
    h: float
    l: float
    c: float
    v: int


class Quote(BaseModel):
    symbol: str
    currency: str
    last: float
    change: float
    change_pct: float
    as_of: datetime
    bars: List[Bar]
    last_refreshed_at: datetime
    stale: bool = False
