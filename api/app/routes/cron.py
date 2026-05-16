"""Internal cron endpoints called by Vercel Cron Jobs.

Vercel Cron Jobs send a request with an `Authorization: Bearer
<CRON_SECRET>` header. The secret comes from the Vercel project env var
and is mirrored into the FastAPI Settings as `cron_secret`. Any request
without a matching bearer is 401, even in local mode — these routes are
not for browsers.

Failures inside the job write a `failed` ingestion_runs row; the HTTP
response itself stays 200 so Vercel doesn't keep retrying.
"""

from __future__ import annotations

import logging
from typing import Any, Dict

from fastapi import APIRouter, Depends, Header, HTTPException

from app.jobs import ingest_13f, ingest_finnhub, refresh_kr_daily, refresh_us_daily
from app.settings import Settings, get_settings


router = APIRouter(prefix="/internal/cron", tags=["cron"])
log = logging.getLogger(__name__)


def _require_cron(
    authorization: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> None:
    if not settings.cron_secret:
        raise HTTPException(status_code=503, detail="cron_disabled")
    expected = f"Bearer {settings.cron_secret}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="unauthenticated")


@router.get("/refresh-us-daily")
async def refresh_us_daily_route(
    _auth: None = Depends(_require_cron),
    settings: Settings = Depends(get_settings),
) -> Dict[str, Any]:
    try:
        result = await refresh_us_daily.run(settings)
        return {"status": "ok", **result}
    except refresh_us_daily.IngestionError as exc:
        log.error("us_grouped_daily failed: %s", exc)
        return {"status": "failed", "error": str(exc)}


@router.get("/ingest-13f")
async def ingest_13f_route(
    _auth: None = Depends(_require_cron),
    settings: Settings = Depends(get_settings),
) -> Dict[str, Any]:
    try:
        result = await ingest_13f.run(settings)
        return {"status": "ok", **result}
    except ingest_13f.IngestionError as exc:
        log.error("ingest_13f failed: %s", exc)
        return {"status": "failed", "error": str(exc)}


@router.get("/ingest-finnhub")
async def ingest_finnhub_route(
    _auth: None = Depends(_require_cron),
    settings: Settings = Depends(get_settings),
) -> Dict[str, Any]:
    try:
        result = await ingest_finnhub.run(settings)
        return {"status": "ok", **result}
    except ingest_finnhub.IngestionError as exc:
        log.error("ingest_finnhub failed: %s", exc)
        return {"status": "failed", "error": str(exc)}


@router.get("/refresh-kr-daily")
async def refresh_kr_daily_route(
    _auth: None = Depends(_require_cron),
    settings: Settings = Depends(get_settings),
) -> Dict[str, Any]:
    try:
        result = await refresh_kr_daily.run(settings)
        return {"status": "ok", **result}
    except refresh_kr_daily.IngestionError as exc:
        log.error("kr_daily failed: %s", exc)
        return {"status": "failed", "error": str(exc)}
