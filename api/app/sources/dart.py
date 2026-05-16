"""DART (전자공시시스템) provider — KR corporate filings.

Open API: https://opendart.fss.or.kr/

We rely on the `corp_code` column on `instruments` to bridge from
stock_code (e.g. "005930") to the DART 8-digit corp_code. The full
corp_code mapping is a 5MB ZIP; we don't download it here — masters
that include KR tickers should populate `corp_code` directly via the
seed migration (PR-33).
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Dict, List, Optional

import httpx
from fastapi import HTTPException


BASE_URL = "https://opendart.fss.or.kr/api"


async def fetch_recent_filings(
    corp_code: str, api_key: str, *, days: int = 90, page_count: int = 20
) -> List[Dict[str, Any]]:
    """Return recent filings for `corp_code` (8-digit DART id)."""
    today = date.today()
    start = today - timedelta(days=days)
    url = f"{BASE_URL}/list.json"
    params = {
        "crtfc_key": api_key,
        "corp_code": corp_code,
        "bgn_de": start.strftime("%Y%m%d"),
        "end_de": today.strftime("%Y%m%d"),
        "page_count": str(page_count),
        "sort": "date",
        "sort_mth": "desc",
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="upstream_unavailable") from exc
    if resp.status_code >= 400:
        raise HTTPException(status_code=503, detail="upstream_unavailable")
    body = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
    if not isinstance(body, dict):
        return []
    status = body.get("status")
    # status "000" = success; "013" = empty results; everything else is an
    # error including bad/missing key.
    if status == "013":
        return []
    if status and status != "000":
        return []
    rows = body.get("list") or []
    out: List[Dict[str, Any]] = []
    for r in rows:
        rcept_no = r.get("rcept_no", "")
        url = (
            f"https://dart.fss.or.kr/dsaf001/main.do?rcpNo={rcept_no}"
            if rcept_no
            else None
        )
        out.append(
            {
                "accession": rcept_no,
                "form": r.get("report_nm", ""),
                "filed_at": r.get("rcept_dt"),  # YYYYMMDD
                "description": r.get("flr_nm") or "",
                "url": url,
            }
        )
    return out


def _fmt_filed_date(yyyymmdd: Optional[str]) -> Optional[str]:
    if not yyyymmdd or len(yyyymmdd) != 8:
        return yyyymmdd
    return f"{yyyymmdd[:4]}-{yyyymmdd[4:6]}-{yyyymmdd[6:]}"


async def fetch_recent_filings_normalized(
    corp_code: str, api_key: str, *, days: int = 90
) -> List[Dict[str, Any]]:
    """Same as `fetch_recent_filings` but with `filed_at` reformatted to
    `YYYY-MM-DD` for direct rendering in the same shape as SEC filings.
    """
    rows = await fetch_recent_filings(corp_code, api_key, days=days)
    for r in rows:
        r["filed_at"] = _fmt_filed_date(r.get("filed_at"))
    return rows
