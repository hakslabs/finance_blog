"""Top movers from price_bars_daily.

For each tracked instrument in the requested market we pull the most
recent two daily bars and compute change_pct. Results sorted by absolute
change descending. No external API call — pure DB read.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.settings import Settings, get_settings


router = APIRouter(prefix="/movers", tags=["movers"])


class Mover(BaseModel):
    rank: int
    symbol: str
    name: str
    market: str
    last: float
    change: float
    change_pct: float
    volume: int


class MoversResponse(BaseModel):
    market: str
    items: List[Mover]


def _sb_headers(settings: Settings) -> Dict[str, str]:
    return {
        "apikey": settings.supabase_service_role_key or "",
        "Authorization": f"Bearer {settings.supabase_service_role_key or ''}",
        "Accept": "application/json",
    }


@router.get("", response_model=MoversResponse)
async def list_movers(
    market: str = Query("US", pattern="^(US|KR)$"),
    limit: int = Query(8, ge=1, le=30),
    settings: Settings = Depends(get_settings),
) -> MoversResponse:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return MoversResponse(market=market, items=[])

    base = settings.supabase_url.rstrip("/")
    headers = _sb_headers(settings)

    async with httpx.AsyncClient(timeout=10.0, headers=headers) as client:
        # 1) Tracked instruments for the market (skip UNKNOWN/placeholders).
        inst_resp = await client.get(
            f"{base}/rest/v1/instruments",
            params={
                "select": "id,symbol,name,exchange",
                "country_code": f"eq.{market}",
                "asset_type": "eq.stock",
                "is_active": "eq.true",
                "exchange": "neq.UNKNOWN",
                "order": "symbol.asc",
                "limit": "200",
            },
        )
        if inst_resp.status_code >= 400:
            raise HTTPException(status_code=503, detail="upstream_unavailable")
        instruments = inst_resp.json()
        if not instruments:
            return MoversResponse(market=market, items=[])
        ids = [i["id"] for i in instruments]
        id_to_inst = {i["id"]: i for i in instruments}

        # 2) Pull the latest 2 bars per instrument (chunk to avoid huge query).
        bars_by_inst: Dict[str, List[Dict[str, Any]]] = {}
        for start in range(0, len(ids), 50):
            chunk = ids[start : start + 50]
            bars_resp = await client.get(
                f"{base}/rest/v1/price_bars_daily",
                params={
                    "instrument_id": f"in.({','.join(chunk)})",
                    "select": "instrument_id,t,c,v",
                    "order": "t.desc",
                    "limit": "1000",
                },
            )
            if bars_resp.status_code >= 400:
                continue
            for row in bars_resp.json():
                bars_by_inst.setdefault(row["instrument_id"], []).append(row)

    rows: List[Mover] = []
    for inst_id, inst in id_to_inst.items():
        bars = bars_by_inst.get(inst_id) or []
        if len(bars) < 2:
            continue
        latest = bars[0]
        prev = bars[1]
        last_c = float(latest["c"])
        prev_c = float(prev["c"])
        if prev_c <= 0 or last_c <= 0:
            continue
        change = last_c - prev_c
        change_pct = (change / prev_c) * 100
        rows.append(
            Mover(
                rank=0,
                symbol=inst["symbol"],
                name=inst["name"],
                market=market,
                last=last_c,
                change=change,
                change_pct=change_pct,
                volume=int(latest.get("v") or 0),
            )
        )

    rows.sort(key=lambda m: abs(m.change_pct), reverse=True)
    rows = rows[:limit]
    for idx, row in enumerate(rows):
        row.rank = idx + 1
    return MoversResponse(market=market, items=rows)
