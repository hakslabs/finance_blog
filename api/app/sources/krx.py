"""KRX OpenAPI provider — KOSPI/KOSDAQ daily OHLCV.

Endpoint: https://data-dbg.krx.co.kr/svc/apis/sto/stk_bydd_trd
Returns: { "OutBlock_1": [ { ISU_CD, ISU_SRT_CD, ISU_ABBRV,
                             TDD_OPNPRC, TDD_HGPRC, TDD_LWPRC,
                             TDD_CLSPRC, ACC_TRDVOL, ... }, ... ] }

Header: AUTH_KEY. Use the KRX_API_KEY env value.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Dict, List, Optional

import httpx
from fastapi import HTTPException


BASE_URL = "https://data-dbg.krx.co.kr/svc/apis/sto"


def _last_weekday(d: date) -> date:
    """Return the most recent weekday on or before `d`."""
    while d.weekday() >= 5:
        d -= timedelta(days=1)
    return d


async def fetch_kospi_daily(
    api_key: str, target: Optional[date] = None
) -> List[Dict[str, Any]]:
    """Return daily bars for the KOSPI universe on `target` (defaults to
    the most recent settled trading day, which is D-2 from today —
    KRX publishes EOD after the 3:30 PM KST close, so D-1 may be
    partial). Empty list on holidays / weekends.
    """
    target_date = _last_weekday(target or date.today() - timedelta(days=2))
    headers = {"AUTH_KEY": api_key}
    params = {"basDd": target_date.strftime("%Y%m%d")}
    url = f"{BASE_URL}/stk_bydd_trd"
    try:
        async with httpx.AsyncClient(timeout=15.0, headers=headers) as client:
            resp = await client.get(url, params=params)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="upstream_unavailable") from exc
    if resp.status_code >= 400:
        raise HTTPException(status_code=503, detail="upstream_unavailable")
    body = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
    rows = body.get("OutBlock_1") or []
    out: List[Dict[str, Any]] = []
    for r in rows:
        if r.get("MKT_NM") not in ("KOSPI", "KOSDAQ"):
            continue
        try:
            o = float((r.get("TDD_OPNPRC") or "0").replace(",", ""))
            h = float((r.get("TDD_HGPRC") or "0").replace(",", ""))
            low = float((r.get("TDD_LWPRC") or "0").replace(",", ""))
            c = float((r.get("TDD_CLSPRC") or "0").replace(",", ""))
            v = int((r.get("ACC_TRDVOL") or "0").replace(",", ""))
        except (TypeError, ValueError):
            continue
        if c <= 0 or o <= 0:
            continue
        # KRX 6-digit code → ".KS"/".KQ" exchange suffix matching our seed.
        code = r.get("ISU_CD", "").strip()
        suffix = ".KS" if r.get("MKT_NM") == "KOSPI" else ".KQ"
        out.append(
            {
                "symbol": f"{code}{suffix}",
                "name": r.get("ISU_NM", "").strip(),
                "exchange": "KRX",
                "date": target_date.isoformat(),
                "o": o, "h": h, "l": low, "c": c, "v": v,
                "market": r.get("MKT_NM"),
            }
        )
    return out
