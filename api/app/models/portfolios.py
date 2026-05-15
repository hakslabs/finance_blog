from datetime import date, datetime
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel


TransactionType = Literal["buy", "sell", "dividend", "deposit"]


class Holding(BaseModel):
    symbol: str
    name: str
    exchange: str
    currency: str
    quantity: float
    average_cost: float
    cost_basis: float


class Transaction(BaseModel):
    id: UUID
    occurred_at: date
    type: TransactionType
    symbol: Optional[str] = None
    quantity: Optional[float] = None
    price: Optional[float] = None
    amount: float
    currency: str
    note: Optional[str] = None


class Portfolio(BaseModel):
    id: UUID
    name: str
    currency: str
    updated_at: datetime
    holdings: List[Holding]
    transactions: List[Transaction]


class PortfolioResponse(BaseModel):
    portfolio: Portfolio
