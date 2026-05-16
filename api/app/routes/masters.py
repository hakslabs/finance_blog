"""Public read endpoints for the masters domain.

Falls back to 404 when the slug is not in DB. Returns an empty list when
no rows have been ingested yet — the frontend can layer fixtures over
that to keep the screen non-empty before ingestion lands.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.models.masters import MasterListResponse, MasterResponse
from app.repos.masters import MasterRepo, get_master_repo


router = APIRouter(prefix="/masters", tags=["masters"])


@router.get("", response_model=MasterListResponse)
async def list_masters(repo: MasterRepo = Depends(get_master_repo)) -> MasterListResponse:
    return MasterListResponse(masters=await repo.list_masters())


@router.get("/{slug}", response_model=MasterResponse)
async def get_master(
    slug: str, repo: MasterRepo = Depends(get_master_repo)
) -> MasterResponse:
    master = await repo.get_master(slug)
    if master is None:
        raise HTTPException(status_code=404, detail="not_found")
    return MasterResponse(master=master)
