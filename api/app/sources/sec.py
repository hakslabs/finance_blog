"""SEC EDGAR provider — recent submissions (filings) for a CIK or ticker.

Uses the public data.sec.gov submissions API. Requires a User-Agent per
SEC fair-use policy (set via SEC_USER_AGENT env var).
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

import httpx
from fastapi import HTTPException


SUBMISSIONS_URL = "https://data.sec.gov/submissions/CIK{cik10}.json"
TICKER_MAP_URL = "https://www.sec.gov/files/company_tickers.json"

_TICKER_CACHE: Dict[str, str] = {}  # symbol -> 10-digit CIK


def _normalize_cik(cik: str | int) -> str:
    digits = re.sub(r"\D", "", str(cik))
    return digits.zfill(10)


async def _ensure_ticker_map(user_agent: str) -> Dict[str, str]:
    global _TICKER_CACHE
    if _TICKER_CACHE:
        return _TICKER_CACHE
    headers = {"User-Agent": user_agent, "Accept": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(TICKER_MAP_URL, headers=headers)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="upstream_unavailable") from exc
    if resp.status_code >= 400:
        raise HTTPException(status_code=503, detail="upstream_unavailable")
    data = resp.json()
    if isinstance(data, dict):
        for entry in data.values():
            if isinstance(entry, dict):
                t = str(entry.get("ticker", "")).upper()
                c = entry.get("cik_str")
                if t and c is not None:
                    _TICKER_CACHE[t] = _normalize_cik(c)
    return _TICKER_CACHE


async def resolve_cik(symbol: str, user_agent: str) -> Optional[str]:
    mapping = await _ensure_ticker_map(user_agent)
    return mapping.get(symbol.upper())


async def fetch_submissions(
    cik: str, user_agent: str, *, limit: int = 20
) -> List[Dict[str, Any]]:
    cik10 = _normalize_cik(cik)
    headers = {"User-Agent": user_agent, "Accept": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                SUBMISSIONS_URL.format(cik10=cik10), headers=headers
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="upstream_unavailable") from exc
    if resp.status_code == 404:
        return []
    if resp.status_code >= 400:
        raise HTTPException(status_code=503, detail="upstream_unavailable")
    body = resp.json()
    recent = body.get("filings", {}).get("recent", {}) if isinstance(body, dict) else {}
    accession = recent.get("accessionNumber") or []
    form = recent.get("form") or []
    filing_date = recent.get("filingDate") or []
    primary_doc = recent.get("primaryDocument") or []
    primary_desc = recent.get("primaryDocDescription") or []
    items: List[Dict[str, Any]] = []
    for i in range(min(limit, len(accession))):
        acc = accession[i]
        doc = primary_doc[i] if i < len(primary_doc) else ""
        acc_nodash = acc.replace("-", "")
        url = (
            f"https://www.sec.gov/Archives/edgar/data/"
            f"{int(cik10)}/{acc_nodash}/{doc}"
        )
        items.append(
            {
                "accession": acc,
                "form": form[i] if i < len(form) else "",
                "filed_at": filing_date[i] if i < len(filing_date) else None,
                "description": primary_desc[i] if i < len(primary_desc) else "",
                "url": url,
            }
        )
    return items
