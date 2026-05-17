"""Aggregated news feed for the dashboard.

Reads from news_items + news_instruments. Returns the most recent N
items with their related symbols (joined back through instruments).
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.settings import Settings, get_settings


router = APIRouter(prefix="/news", tags=["news"])


class NewsItem(BaseModel):
    id: str
    source: str
    title: str
    summary: Optional[str] = None
    url: Optional[str] = None
    language: str = "en"
    published_at: str
    related_symbols: List[str] = []


class NewsResponse(BaseModel):
    items: List[NewsItem]


def _sb_headers(settings: Settings) -> Dict[str, str]:
    return {
        "apikey": settings.supabase_service_role_key or "",
        "Authorization": f"Bearer {settings.supabase_service_role_key or ''}",
        "Accept": "application/json",
    }


@router.get("", response_model=NewsResponse)
async def list_news(
    limit: int = Query(8, ge=1, le=50),
    settings: Settings = Depends(get_settings),
) -> NewsResponse:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return NewsResponse(items=[])
    base = settings.supabase_url.rstrip("/")
    headers = _sb_headers(settings)
    async with httpx.AsyncClient(timeout=10.0, headers=headers) as client:
        resp = await client.get(
            f"{base}/rest/v1/news_items",
            params={
                "select": "id,source,title,summary,url,language,published_at,"
                          "news_instruments(instruments(symbol))",
                "order": "published_at.desc",
                "limit": str(limit),
            },
        )
        if resp.status_code >= 400:
            return NewsResponse(items=[])
        rows: List[Dict[str, Any]] = resp.json() or []
    out: List[NewsItem] = []
    for r in rows:
        syms: List[str] = []
        for ni in r.get("news_instruments") or []:
            inst = (ni or {}).get("instruments") or {}
            sym = inst.get("symbol")
            if sym and sym not in syms:
                syms.append(sym)
        pub = r.get("published_at") or datetime.now(tz=timezone.utc).isoformat()
        out.append(
            NewsItem(
                id=str(r["id"]),
                source=r.get("source", ""),
                title=r["title"],
                summary=r.get("summary"),
                url=r.get("url"),
                language=r.get("language", "en"),
                published_at=pub,
                related_symbols=syms[:3],
            )
        )
    return NewsResponse(items=out)
