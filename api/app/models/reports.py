from __future__ import annotations

from datetime import date
from typing import List, Optional

from pydantic import BaseModel


class ReportSummary(BaseModel):
    id: str
    source: str
    title: str
    category: Optional[str] = None
    published_at: date
    language: str
    importance: Optional[int] = None


class Report(ReportSummary):
    summary: Optional[str] = None
    body_url: Optional[str] = None


class ReportListResponse(BaseModel):
    reports: List[ReportSummary]


class ReportResponse(BaseModel):
    report: Report
