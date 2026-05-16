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


async def list_filings_by_form(
    cik: str, form: str, user_agent: str, *, limit: int = 4
) -> List[Dict[str, Any]]:
    """Return recent accessions for `cik` matching `form` (e.g. '13F-HR')."""
    items = await fetch_submissions(cik, user_agent, limit=120)
    return [r for r in items if r.get("form", "").upper() == form.upper()][:limit]


async def fetch_information_table(
    cik: str, accession: str, user_agent: str
) -> List[Dict[str, Any]]:
    """Fetch the 13F Information Table XML for one accession and parse it.

    Returns a list of holdings:
        { "name": str, "cusip": str, "value_usd": int, "shares": float,
          "share_type": "SH"|"PRN", "discretion": str, "put_call": Optional[str] }

    `value` in the SEC XML is reported in thousands of USD before
    2022-Q4 and in raw USD after. We return raw USD.
    """
    import re
    from xml.etree import ElementTree as ET

    cik10 = _normalize_cik(cik)
    acc_nodash = accession.replace("-", "")
    headers = {"User-Agent": user_agent, "Accept": "application/json"}
    base = f"https://www.sec.gov/Archives/edgar/data/{int(cik10)}/{acc_nodash}"
    index_url = f"{base}/index.json"

    try:
        async with httpx.AsyncClient(timeout=15.0, headers=headers) as client:
            idx = await client.get(index_url)
            if idx.status_code >= 400:
                return []
            idx_body = idx.json()
            files = idx_body.get("directory", {}).get("item", []) or []
            xml_name: Optional[str] = None
            for f in files:
                name = f.get("name", "")
                if name.lower().endswith(".xml") and "info" in name.lower():
                    xml_name = name
                    break
            if not xml_name:
                # Fallback: any .xml that isn't the primary doc
                for f in files:
                    name = f.get("name", "")
                    if name.lower().endswith(".xml") and "primary_doc" not in name.lower():
                        xml_name = name
                        break
            if not xml_name:
                return []
            xml_url = f"{base}/{xml_name}"
            xml_resp = await client.get(xml_url)
            if xml_resp.status_code >= 400:
                return []
            xml_text = xml_resp.text
    except httpx.HTTPError:
        return []

    # Strip namespaces (xmlns declarations, prefixed attributes like
    # xsi:schemaLocation, and ns: prefixes on element tags) so plain
    # `findall("infoTable")` works.
    xml_clean = re.sub(r"\sxmlns(:\w+)?=\"[^\"]+\"", "", xml_text)
    xml_clean = re.sub(r"\s\w+:\w+=\"[^\"]+\"", "", xml_clean)
    xml_clean = re.sub(r"<(/?)\w+:(\w+)", r"<\1\2", xml_clean)
    try:
        root = ET.fromstring(xml_clean)
    except ET.ParseError:
        return []

    holdings: List[Dict[str, Any]] = []
    # Reporting threshold for "value in USD" changed in 2022-Q4; auto-detect
    # by checking the order of magnitude vs shares.
    for info in root.findall(".//infoTable"):
        name = (info.findtext("nameOfIssuer") or "").strip()
        cusip = (info.findtext("cusip") or "").strip()
        title = (info.findtext("titleOfClass") or "").strip()
        value_raw = (info.findtext("value") or "0").strip()
        try:
            value_num = int(float(value_raw))
        except ValueError:
            value_num = 0
        shares_text = info.findtext("shrsOrPrnAmt/sshPrnamt") or "0"
        share_type = (info.findtext("shrsOrPrnAmt/sshPrnamtType") or "SH").strip()
        try:
            shares = float(shares_text)
        except ValueError:
            shares = 0.0
        discretion = (info.findtext("investmentDiscretion") or "").strip()
        put_call = info.findtext("putCall")
        holdings.append(
            {
                "name": name,
                "cusip": cusip,
                "title_of_class": title,
                "value_raw": value_num,
                "shares": shares,
                "share_type": share_type,
                "discretion": discretion,
                "put_call": put_call.strip() if put_call else None,
            }
        )

    if not holdings:
        return []

    # Heuristic: total value vs total shares. If avg value/share < 1, treat
    # as $K (pre-2022Q4). Otherwise raw USD.
    total_value = sum(h["value_raw"] for h in holdings)
    total_shares = sum(h["shares"] for h in holdings) or 1.0
    avg = total_value / total_shares
    multiplier = 1000 if avg < 1.0 else 1
    for h in holdings:
        h["value_usd"] = h["value_raw"] * multiplier
        del h["value_raw"]
    return holdings
