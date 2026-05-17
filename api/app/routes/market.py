"""Market breadth — feeds both the KR fear/greed gauge and the heatmap.

Computes, per instrument in the requested market: change_pct from the
latest two daily bars. From that we derive:

- score: % of rising names, mapped to 0-100 (50 = balanced)
- cells: every name with its change_pct (for heatmap)
- counts: rising/falling/flat

Pure DB read against price_bars_daily + instruments.
"""

from __future__ import annotations

from typing import Any, Dict, List

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.settings import Settings, get_settings


router = APIRouter(prefix="/market", tags=["market"])


class BreadthCell(BaseModel):
    symbol: str
    name: str
    change_pct: float
    last: float


class BreadthResponse(BaseModel):
    market: str
    score: float
    rising: int
    falling: int
    flat: int
    total: int
    cells: List[BreadthCell]


def _sb_headers(settings: Settings) -> Dict[str, str]:
    return {
        "apikey": settings.supabase_service_role_key or "",
        "Authorization": f"Bearer {settings.supabase_service_role_key or ''}",
        "Accept": "application/json",
    }


@router.get("/breadth", response_model=BreadthResponse)
async def market_breadth(
    market: str = Query("US", pattern="^(US|KR)$"),
    settings: Settings = Depends(get_settings),
) -> BreadthResponse:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return BreadthResponse(market=market, score=50, rising=0, falling=0, flat=0, total=0, cells=[])

    base = settings.supabase_url.rstrip("/")
    headers = _sb_headers(settings)

    async with httpx.AsyncClient(timeout=12.0, headers=headers) as client:
        inst_resp = await client.get(
            f"{base}/rest/v1/instruments",
            params={
                "select": "id,symbol,name",
                "country_code": f"eq.{market}",
                "asset_type": "eq.stock",
                "is_active": "eq.true",
                "exchange": "neq.UNKNOWN",
                "limit": "300",
            },
        )
        if inst_resp.status_code >= 400:
            raise HTTPException(status_code=503, detail="upstream_unavailable")
        instruments = inst_resp.json()
        if not instruments:
            return BreadthResponse(market=market, score=50, rising=0, falling=0, flat=0, total=0, cells=[])
        ids = [i["id"] for i in instruments]
        id_to_inst = {i["id"]: i for i in instruments}

        bars_by_inst: Dict[str, List[Dict[str, Any]]] = {}
        for start in range(0, len(ids), 50):
            chunk = ids[start : start + 50]
            bars_resp = await client.get(
                f"{base}/rest/v1/price_bars_daily",
                params={
                    "instrument_id": f"in.({','.join(chunk)})",
                    "select": "instrument_id,t,c",
                    "order": "t.desc",
                    "limit": "600",
                },
            )
            if bars_resp.status_code >= 400:
                continue
            for row in bars_resp.json():
                bars_by_inst.setdefault(row["instrument_id"], []).append(row)

    cells: List[BreadthCell] = []
    rising = falling = flat = 0
    for inst_id, inst in id_to_inst.items():
        bars = bars_by_inst.get(inst_id) or []
        if len(bars) < 2:
            continue
        last_c = float(bars[0]["c"])
        prev_c = float(bars[1]["c"])
        if prev_c <= 0 or last_c <= 0:
            continue
        pct = ((last_c - prev_c) / prev_c) * 100
        cells.append(BreadthCell(symbol=inst["symbol"], name=inst["name"], change_pct=pct, last=last_c))
        if pct > 0.1:
            rising += 1
        elif pct < -0.1:
            falling += 1
        else:
            flat += 1

    total = rising + falling + flat
    score = (rising / total) * 100 if total > 0 else 50.0
    cells.sort(key=lambda c: abs(c.change_pct), reverse=True)
    return BreadthResponse(
        market=market,
        score=round(score, 1),
        rising=rising,
        falling=falling,
        flat=flat,
        total=total,
        cells=cells[:30],
    )
