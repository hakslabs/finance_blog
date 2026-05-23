"""GET /v1/search — unified header-search across instruments, masters, reports.

Hits Supabase PostgREST directly with `or=` ilike filters per table and
returns up to `limit` rows per section. Empty `q` → empty payload (the
frontend doesn't render the dropdown in that case).
"""

from __future__ import annotations

import asyncio
import time
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


_UNIVERSE_CACHE: Dict[str, Any] = {"set": None, "ts": 0.0}
_UNIVERSE_TTL = 300.0  # 5 min — universe changes via batch seed, not per-request


def _universe_includes(universe: set[str], symbol: str) -> bool:
    """Return True if symbol (or its bare 6-digit form) is in the universe.

    KR instruments live in `instruments` as `000660.KS` while
    `blog_index_universe` stores `000660` — normalise on lookup so the
    KOSPI200 set isn't dropped by the filter.
    """
    if not symbol:
        return False
    s = symbol.upper()
    if s in universe:
        return True
    if s.endswith((".KS", ".KQ")) and s[:-3] in universe:
        return True
    return False


def _normalize_kr_symbol(symbol: str) -> str:
    """Strip the `.KS` / `.KQ` suffix so frontend routes use bare codes."""
    if symbol and symbol.upper().endswith((".KS", ".KQ")):
        return symbol[:-3]
    return symbol


async def _load_universe(settings: Settings) -> set[str]:
    """Return the union of SP500 + NDX + KOSPI200 symbols (uppercased).

    Cached for 5 minutes in-process so every keystroke doesn't pay the
    `blog_index_universe` round-trip. Empty set if the table is empty.
    """
    now = time.monotonic()
    cached = _UNIVERSE_CACHE.get("set")
    if cached is not None and now - _UNIVERSE_CACHE.get("ts", 0.0) < _UNIVERSE_TTL:
        return cached  # type: ignore[return-value]
    rows = await _pg_get(
        settings,
        "blog_index_universe",
        {"select": "symbol", "limit": "5000"},
    )
    out = {(r.get("symbol") or "").upper() for r in rows if r.get("symbol")}
    _UNIVERSE_CACHE["set"] = out
    _UNIVERSE_CACHE["ts"] = now
    return out


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

    # Run universe load + the three ilike queries in parallel. Universe
    # is usually a cache hit so this is mostly 3 round-trips total
    # instead of 4 sequential ones — the dropdown feels instant.
    universe, sym_rows_raw, masters_rows, reports_rows = await asyncio.gather(
        _load_universe(settings),
        _pg_get(
            settings,
            "instruments",
            {
                "select": "symbol,name,exchange,country_code,asset_type",
                "or": f"(symbol.ilike.{needle},name.ilike.{needle})",
                "is_active": "eq.true",
                "order": "symbol.asc",
                # Slight over-fetch — universe filter + dedup drops a few.
                "limit": str(limit * 4),
            },
        ),
        _pg_get(
            settings,
            "masters",
            {
                "select": "slug,name,firm,country_code",
                "or": f"(name.ilike.{needle},firm.ilike.{needle},slug.ilike.{needle})",
                "order": "name.asc",
                "limit": str(limit),
            },
        ),
        _pg_get(
            settings,
            "reports",
            {
                "select": "id,title,source,category,published_at",
                "or": f"(title.ilike.{needle},source.ilike.{needle})",
                "order": "published_at.desc",
                "limit": str(limit),
            },
        ),
    )

    # Universe gate + KR symbol normalisation. Without the suffix strip,
    # KOSPI200 names match in `instruments` but get filtered out because
    # `blog_index_universe` keeps the bare 6-digit form. We also dedupe
    # the legacy duplicate rows (same symbol, different exchange label).
    seen_syms: set[str] = set()
    sym_rows: List[Dict[str, Any]] = []
    for r in sym_rows_raw:
        raw_sym = (r.get("symbol") or "").upper()
        if universe and not _universe_includes(universe, raw_sym):
            continue
        bare = _normalize_kr_symbol(raw_sym)
        if bare in seen_syms:
            continue
        seen_syms.add(bare)
        r = dict(r)
        r["symbol"] = bare  # frontend links use bare codes
        sym_rows.append(r)
        if len(sym_rows) >= limit:
            break

    return SearchResponse(
        query=q_trimmed,
        symbols=[SymbolHit(**r) for r in sym_rows],
        masters=[MasterHit(**r) for r in masters_rows],
        reports=[ReportHit(**r) for r in reports_rows],
    )
