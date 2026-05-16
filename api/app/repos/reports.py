"""Reports repository against Supabase PostgREST.

Public-read table. Returns empty arrays when no rows have been ingested
yet — frontend falls back to fixtures when DB is empty.
"""

from __future__ import annotations

from datetime import date
from typing import Any, Dict, List, Optional

import httpx
from fastapi import Depends, HTTPException

from app.models.reports import Report, ReportSummary
from app.settings import Settings, get_settings


_REPORT_SUMMARY_SELECT = "id,source,title,category,published_at,language,importance"
_REPORT_DETAIL_SELECT = f"{_REPORT_SUMMARY_SELECT},summary,body_url"


class ReportRepo:
    def __init__(self, supabase_url: str, service_role_key: str) -> None:
        self._base_url = supabase_url.rstrip("/")
        self._headers = {
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Accept": "application/json",
        }

    async def list_reports(self, limit: int = 50) -> List[ReportSummary]:
        params = {
            "select": _REPORT_SUMMARY_SELECT,
            "order": "published_at.desc",
            "limit": str(limit),
        }
        url = f"{self._base_url}/rest/v1/reports"
        rows = await self._get(url, params)
        return [ReportSummary(**_to_summary(r)) for r in rows]

    async def get_report(self, report_id: str) -> Optional[Report]:
        params = {
            "id": f"eq.{report_id}",
            "select": _REPORT_DETAIL_SELECT,
            "limit": "1",
        }
        url = f"{self._base_url}/rest/v1/reports"
        rows = await self._get(url, params)
        if not rows:
            return None
        row = rows[0]
        return Report(
            **_to_summary(row),
            summary=row.get("summary"),
            body_url=row.get("body_url"),
        )

    async def _get(self, url: str, params: Dict[str, str]) -> List[Dict[str, Any]]:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(url, params=params, headers=self._headers)
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=503, detail="upstream_unavailable") from exc
        if response.status_code >= 400:
            raise HTTPException(status_code=503, detail="upstream_unavailable")
        return response.json()


def _to_summary(row: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": row["id"],
        "source": row["source"],
        "title": row["title"],
        "category": row.get("category"),
        "published_at": date.fromisoformat(row["published_at"]) if isinstance(row["published_at"], str) else row["published_at"],
        "language": row.get("language", "ko"),
        "importance": row.get("importance"),
    }


def get_report_repo(settings: Settings = Depends(get_settings)) -> ReportRepo:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(status_code=503, detail="upstream_unavailable")
    return ReportRepo(settings.supabase_url, settings.supabase_service_role_key)
