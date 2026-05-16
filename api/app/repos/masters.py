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
