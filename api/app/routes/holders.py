"""Institutional holders for a symbol via filing_holdings reverse lookup.

For ticker → instrument_id → filing_holdings rows → filings → masters
(or filer_name when no master matches). Latest filing per filer.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.settings import Settings, get_settings


router = APIRouter(prefix="/stocks", tags=["stocks"])


class HolderRow(BaseModel):
    filer_name: str
    master_slug: Optional[str] = None
    filed_at: Optional[str] = None
    shares: float
    market_value: Optional[float] = None
    weight_pct: Optional[float] = None
    position_kind: str = "long"


class HoldersResponse(BaseModel):
    symbol: str
    items: List[HolderRow]


def _h(s: Settings) -> Dict[str, str]:
    return {
        "apikey": s.supabase_service_role_key or "",
        "Authorization": f"Bearer {s.supabase_service_role_key or ''}",
        "Accept": "application/json",
    }


@router.get("/{symbol}/holders", response_model=HoldersResponse)
async def stock_holders(
    symbol: str,
    limit: int = Query(20, ge=1, le=50),
    settings: Settings = Depends(get_settings),
) -> HoldersResponse:
    sym = symbol.upper()
    empty = HoldersResponse(symbol=sym, items=[])
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return empty
    base = settings.supabase_url.rstrip("/")
    async with httpx.AsyncClient(timeout=10.0, headers=_h(settings)) as client:
        inst = await client.get(
            f"{base}/rest/v1/instruments",
            params={"symbol": f"eq.{sym}", "select": "id", "limit": "1"},
        )
        if inst.status_code >= 400 or not inst.json():
            return empty
        instrument_id = inst.json()[0]["id"]

        fh = await client.get(
            f"{base}/rest/v1/filing_holdings",
            params={
                "instrument_id": f"eq.{instrument_id}",
                "select": "filing_id,shares,market_value,weight_pct,position_kind",
                "order": "market_value.desc",
                "limit": "200",
            },
        )
        if fh.status_code >= 400:
            return empty
        fh_rows: List[Dict[str, Any]] = fh.json()
        if not fh_rows:
            return empty
        filing_ids = sorted({r["filing_id"] for r in fh_rows})

        fil = await client.get(
            f"{base}/rest/v1/filings",
            params={
                "id": f"in.({','.join(filing_ids)})",
                "select": "id,filer_name,filer_cik,filed_at",
            },
        )
        if fil.status_code >= 400:
            return empty
        fil_map: Dict[str, Dict[str, Any]] = {r["id"]: r for r in fil.json()}

        # Map filer_cik → master.slug if we have one.
        ciks = [f.get("filer_cik") for f in fil_map.values() if f.get("filer_cik")]
        slug_by_cik: Dict[str, str] = {}
        if ciks:
            ms = await client.get(
                f"{base}/rest/v1/masters",
                params={
                    "filer_cik": f"in.({','.join(ciks)})",
                    "select": "slug,filer_cik",
                },
            )
            if ms.status_code < 400:
                for r in ms.json():
                    slug_by_cik[r["filer_cik"]] = r["slug"]

    # Aggregate by filer (latest filing per filer keeps newest entry only).
    by_filer: Dict[str, HolderRow] = {}
    for r in fh_rows:
        meta = fil_map.get(r["filing_id"])
        if not meta:
            continue
        name = meta["filer_name"]
        slug = slug_by_cik.get(meta.get("filer_cik") or "")
        new_row = HolderRow(
            filer_name=name,
            master_slug=slug,
            filed_at=meta.get("filed_at"),
            shares=float(r["shares"]),
            market_value=float(r["market_value"]) if r.get("market_value") is not None else None,
            weight_pct=float(r["weight_pct"]) if r.get("weight_pct") is not None else None,
            position_kind=r.get("position_kind") or "long",
        )
        prev = by_filer.get(name)
        if prev is None or (new_row.filed_at or "") > (prev.filed_at or ""):
            by_filer[name] = new_row

    items = sorted(by_filer.values(), key=lambda h: h.market_value or 0, reverse=True)[:limit]
    return HoldersResponse(symbol=sym, items=items)
