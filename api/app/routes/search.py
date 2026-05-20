"""GET /v1/search — unified header-search across instruments, masters, reports.

Hits Supabase PostgREST directly with `or=` ilike filters per table and
returns up to `limit` rows per section. Empty `q` → empty payload (the
frontend doesn't render the dropdown in that case).
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.settings import Settings, get_settings


router = APIRouter(prefix="/search", tags=["search"])


class SymbolHit(BaseModel):
    symbol: str
    name: str
    exchange: Optional[str] = None
    country_code: Optional[str] = None
    asset_type: Optional[str] = None


class MasterHit(BaseModel):
    slug: str
    name: str
    firm: Optional[str] = None
    country_code: Optional[str] = None


class ReportHit(BaseModel):
    id: str
    title: str
    source: str
    category: Optional[str] = None
    published_at: Optional[str] = None


class SearchResponse(BaseModel):
    query: str
    symbols: List[SymbolHit]
    masters: List[MasterHit]
    reports: List[ReportHit]


def _escape(q: str) -> str:
    # PostgREST ilike doesn't accept raw commas/parens inside `or=(...)` values
    # — wrap with `*` for ilike fuzziness and strip the few chars that break the
    # filter grammar.
    cleaned = q.replace(",", " ").replace("(", " ").replace(")", " ").strip()
    return f"*{cleaned}*"


async def _load_universe(settings: Settings) -> set[str]:
    """Return the union of SP500 + NDX + KOSPI200 symbols (uppercased).

    Empty set if the table is empty (= seed script hasn't run yet) — the
    caller short-circuits the universe filter in that case so search
    doesn't go dark while we wait for the seeder.
    """
    rows = await _pg_get(
        settings,
        "blog_index_universe",
        {"select": "symbol", "limit": "5000"},
    )
    return {(r.get("symbol") or "").upper() for r in rows if r.get("symbol")}


async def _pg_get(
    settings: Settings,
    path: str,
    params: Dict[str, str],
) -> List[Dict[str, Any]]:
    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Accept": "application/json",
    }
    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/{path}"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url, params=params, headers=headers)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="upstream_unavailable") from exc
    if response.status_code >= 400:
        raise HTTPException(status_code=503, detail="upstream_unavailable")
    return response.json()


@router.get("", response_model=SearchResponse)
async def search(
    q: str = Query("", description="case-insensitive substring across symbol/name/title"),
    limit: int = Query(8, ge=1, le=25),
    settings: Settings = Depends(get_settings),
) -> SearchResponse:
    q_trimmed = q.strip()
    if not q_trimmed:
        return SearchResponse(query="", symbols=[], masters=[], reports=[])
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(status_code=503, detail="upstream_unavailable")

    needle = _escape(q_trimmed)

    # Instruments: match by symbol or name (case-insensitive). Gate by
    # the blog's index universe (SP500 ∪ NDX ∪ KOSPI200) so the
    # dropdown never returns tickers the blog doesn't cover.
    universe = await _load_universe(settings)
    sym_rows_raw = await _pg_get(
        settings,
        "instruments",
        {
            "select": "symbol,name,exchange,country_code,asset_type",
            "or": f"(symbol.ilike.{needle},name.ilike.{needle})",
            "is_active": "eq.true",
            "order": "symbol.asc",
            # Pull a bit extra since some will get filtered out below.
            "limit": str(limit * 3),
        },
    )
    sym_rows = [r for r in sym_rows_raw if (r.get("symbol") or "").upper() in universe][:limit] \
        if universe else sym_rows_raw[:limit]
    masters_rows = await _pg_get(
        settings,
        "masters",
        {
            "select": "slug,name,firm,country_code",
            "or": f"(name.ilike.{needle},firm.ilike.{needle},slug.ilike.{needle})",
            "order": "name.asc",
            "limit": str(limit),
        },
    )
    reports_rows = await _pg_get(
        settings,
        "reports",
        {
            "select": "id,title,source,category,published_at",
            "or": f"(title.ilike.{needle},source.ilike.{needle})",
            "order": "published_at.desc",
            "limit": str(limit),
        },
    )

    return SearchResponse(
        query=q_trimmed,
        symbols=[SymbolHit(**r) for r in sym_rows],
        masters=[MasterHit(**r) for r in masters_rows],
        reports=[ReportHit(**r) for r in reports_rows],
    )
