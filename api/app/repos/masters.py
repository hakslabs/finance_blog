"""Masters repository against Supabase PostgREST.

Public-read tables (RLS public select). Service-role used here for stable
server-side access without auth coupling. Returns empty arrays when no
rows are ingested yet — frontend falls back to fixtures in that case.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import httpx
from fastapi import Depends, HTTPException

from app.models.masters import (
    Master,
    MasterBook,
    MasterHolding,
    MasterPrinciple,
    MasterStrategy,
    MasterSummary,
)
from app.settings import Settings, get_settings


_MASTER_SUMMARY_SELECT = (
    "id,slug,name,firm,country_code,style,aum,aum_currency,photo_url"
)
_MASTER_DETAIL_SELECT = (
    f"{_MASTER_SUMMARY_SELECT},description,homepage_url,filer_cik,birth_year,"
    "master_principles(ordinal,title,body),"
    "master_books(id,ordinal,title,url,year),"
    "master_strategies(ordinal,title,body)"
)


class MasterRepo:
    def __init__(self, supabase_url: str, service_role_key: str) -> None:
        self._base_url = supabase_url.rstrip("/")
        self._headers = {
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Accept": "application/json",
        }

    async def list_masters(self) -> List[MasterSummary]:
        params = {"select": _MASTER_SUMMARY_SELECT, "order": "name.asc"}
        url = f"{self._base_url}/rest/v1/masters"
        rows = await self._get(url, params)
        return [MasterSummary(**_clean_summary(r)) for r in rows]

    async def get_master(self, slug: str) -> Optional[Master]:
        params = {
            "slug": f"eq.{slug}",
            "select": _MASTER_DETAIL_SELECT,
            "limit": "1",
        }
        url = f"{self._base_url}/rest/v1/masters"
        rows = await self._get(url, params)
        if not rows:
            return None
        return _row_to_master(rows[0])

    async def get_holdings(self, slug: str, *, limit: int = 50) -> Dict[str, Any]:
        """Return latest 13F holdings for `slug` via master_filings view.

        Joins via instruments to enrich with symbol/name/exchange. Empty
        result is normal until ingest_13f has run.
        """
        # First grab the most recent filing for this slug from the view.
        url = f"{self._base_url}/rest/v1/master_filings"
        params = {
            "master_slug": f"eq.{slug}",
            "select": "filing_id,period_end,filed_at,instrument_id,shares,market_value,weight_pct,position_kind",
            "order": "filed_at.desc,weight_pct.desc",
            "limit": "500",
        }
        rows = await self._get(url, params)
        if not rows:
            return {"slug": slug, "period_end": None, "filed_at": None, "holdings": []}
        latest_filing_id = rows[0]["filing_id"]
        latest_rows = [r for r in rows if r["filing_id"] == latest_filing_id][:limit]
        instrument_ids = sorted({r["instrument_id"] for r in latest_rows if r.get("instrument_id")})
        # Bulk fetch instruments for symbol/name/exchange.
        inst_map: Dict[str, Dict[str, Any]] = {}
        if instrument_ids:
            inst_url = f"{self._base_url}/rest/v1/instruments"
            inst_params = {
                "id": f"in.({','.join(instrument_ids)})",
                "select": "id,symbol,name,exchange",
            }
            inst_rows = await self._get(inst_url, inst_params)
            inst_map = {r["id"]: r for r in inst_rows}
        holdings: List[MasterHolding] = []
        for r in latest_rows:
            inst = inst_map.get(r["instrument_id"], {}) if r.get("instrument_id") else {}
            holdings.append(
                MasterHolding(
                    instrument_id=r["instrument_id"],
                    symbol=inst.get("symbol"),
                    name=inst.get("name"),
                    exchange=inst.get("exchange"),
                    shares=float(r["shares"]),
                    market_value=float(r["market_value"]) if r.get("market_value") is not None else None,
                    weight_pct=float(r["weight_pct"]) if r.get("weight_pct") is not None else None,
                    position_kind=r.get("position_kind") or "long",
                )
            )
        return {
            "slug": slug,
            "period_end": latest_rows[0].get("period_end"),
            "filed_at": latest_rows[0].get("filed_at"),
            "holdings": holdings,
        }

    async def _get(self, url: str, params: Dict[str, str]) -> List[Dict[str, Any]]:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(url, params=params, headers=self._headers)
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=503, detail="upstream_unavailable") from exc
        if response.status_code >= 400:
            raise HTTPException(status_code=503, detail="upstream_unavailable")
        return response.json()


def _clean_summary(row: Dict[str, Any]) -> Dict[str, Any]:
    return {k: row.get(k) for k in (
        "id", "slug", "name", "firm", "country_code", "style", "aum", "aum_currency", "photo_url"
    )}


def _row_to_master(row: Dict[str, Any]) -> Master:
    base = _clean_summary(row)
    principles_raw = sorted(row.get("master_principles") or [], key=lambda r: r.get("ordinal", 0))
    books_raw = sorted(row.get("master_books") or [], key=lambda r: r.get("ordinal", 0))
    strategies_raw = sorted(row.get("master_strategies") or [], key=lambda r: r.get("ordinal", 0))
    return Master(
        **base,
        description=row.get("description"),
        homepage_url=row.get("homepage_url"),
        filer_cik=row.get("filer_cik"),
        birth_year=row.get("birth_year"),
        principles=[MasterPrinciple(**p) for p in principles_raw],
        books=[MasterBook(**b) for b in books_raw],
        strategies=[MasterStrategy(**s) for s in strategies_raw],
    )


def get_master_repo(settings: Settings = Depends(get_settings)) -> MasterRepo:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(status_code=503, detail="upstream_unavailable")
    return MasterRepo(settings.supabase_url, settings.supabase_service_role_key)
