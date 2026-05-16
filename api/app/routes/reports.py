"""Public read endpoints for the reports domain."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from app.models.reports import ReportListResponse, ReportResponse
from app.repos.reports import ReportRepo, get_report_repo


router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("", response_model=ReportListResponse)
async def list_reports(
    limit: int = Query(50, ge=1, le=200),
    repo: ReportRepo = Depends(get_report_repo),
) -> ReportListResponse:
    return ReportListResponse(reports=await repo.list_reports(limit=limit))


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: str, repo: ReportRepo = Depends(get_report_repo)
) -> ReportResponse:
    report = await repo.get_report(report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="not_found")
    return ReportResponse(report=report)
