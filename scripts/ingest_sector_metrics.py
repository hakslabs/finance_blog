"""Populate `sector_metrics` from `price_bars_daily` for the dashboard
sector-rotation panel.

Mock fallback was kicking in on the Home page because the table was
empty — this script computes daily/weekly/monthly returns per US
sector ETF (SPDR Select Sector family) and per KR industry, ranks
them, derives a money-flow label, and upserts one row per (sector,
market, date=today).

Idempotent via the (sector, market, date) primary key.

Run:
    PYTHONPATH=api python scripts/ingest_sector_metrics.py
"""

from __future__ import annotations

import json
import os
import sys
from datetime import date, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import httpx


# ── Repo-root .env loader ─────────────────────────────────────────────
ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = ROOT / ".env"
if ENV_FILE.exists():
    for raw in ENV_FILE.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        value = value.strip()
        if value and not value.startswith(("'", '"')):
            hash_idx = value.find(" #")
            if hash_idx >= 0:
                value = value[:hash_idx].rstrip()
        value = value.strip('"').strip("'")
        os.environ.setdefault(key.strip(), value)


# US sector group → list of GICS/instruments.sector values that fall
# under it. We don't have the SPDR Select Sector ETFs in the universe,
# so we average each member stock's daily return as the proxy.
US_SECTORS_GROUPED: List[Tuple[str, List[str]]] = [
    ("기술",       ["Information Technology", "Technology"]),
    ("금융",       ["Financials", "Financial Services"]),
    ("헬스케어",   ["Health Care", "Healthcare"]),
    ("에너지",     ["Energy"]),
    ("소비재",     ["Consumer Staples"]),
    ("재량소비재", ["Consumer Discretionary"]),
    ("산업재",     ["Industrials"]),
    ("유틸리티",   ["Utilities"]),
    ("부동산",     ["Real Estate"]),
    ("소재",       ["Materials"]),
    ("통신",       ["Communication Services", "Communications"]),
]

# KR industry leaders (proxy for sectorAverage moves). One liquid name
# per sector — the average daily return across leaders is a decent
# rotation signal until we have a KOSPI-by-sector index ingest.
KR_SECTORS: List[Tuple[str, List[str]]] = [
    ("반도체",     ["005930", "000660"]),         # 삼성전자, 하이닉스
    ("바이오",     ["207940", "068270"]),         # 삼성바이오, 셀트리온
    ("자동차",     ["005380", "012330"]),         # 현대차, 현대모비스
    ("화학",       ["051910", "011170"]),         # LG화학, 롯데케미칼
    ("은행",       ["105560", "055550"]),         # KB금융, 신한지주
    ("IT서비스",   ["035420", "035720"]),         # NAVER, 카카오
    ("철강",       ["005490", "004020"]),         # POSCO홀딩스, 현대제철
    ("건설",       ["000720", "047040"]),         # 현대건설, 대우건설
    ("유통",       ["282330", "139480"]),         # BGF, 이마트
    ("통신",       ["017670", "030200"]),         # SK텔레콤, KT
]

BENCHMARK_SYMBOLS = {
    "US": "SPY",
    "KR": "069500.KS",  # KODEX 200
}


def _sb_headers(service_key: str) -> Dict[str, str]:
    return {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def _last_n_closes(
    client: httpx.Client, base: str, headers: Dict[str, str],
    instrument_id: str, n: int,
) -> List[Tuple[str, float]]:
    """Return [(date, close), ...] in ascending date order, newest at end."""
    r = client.get(
        f"{base}/rest/v1/price_bars_daily",
        params={
            "instrument_id": f"eq.{instrument_id}",
            "select": "t,c",
            "order": "t.desc",
            "limit": str(n),
        },
        headers=headers,
        timeout=15.0,
    )
    if r.status_code >= 400:
        return []
    rows = r.json() or []
    out = [(row["t"], float(row["c"])) for row in rows if row.get("c") is not None]
    out.sort(key=lambda x: x[0])
    return out


def _resolve_instrument_id(
    client: httpx.Client, base: str, headers: Dict[str, str], symbol: str,
) -> Optional[str]:
    r = client.get(
        f"{base}/rest/v1/instruments",
        params={"symbol": f"eq.{symbol}", "select": "id", "limit": "1"},
        headers=headers,
        timeout=10.0,
    )
    if r.status_code >= 400:
        return None
    rows = r.json() or []
    return rows[0]["id"] if rows else None


def _supports_return_year(
    client: httpx.Client, base: str, headers: Dict[str, str]
) -> bool:
    """Detect whether the deployed schema has the annual-return column.

    This keeps the existing daily/weekly/monthly sector refresh alive while a
    database migration is rolling out. Any other PostgREST error remains a
    hard failure instead of being mistaken for a missing column.
    """
    response = client.get(
        f"{base}/rest/v1/sector_metrics",
        params={"select": "return_year", "limit": "1"},
        headers=headers,
        timeout=15.0,
    )
    if response.status_code < 400:
        return True
    if response.status_code == 400 and "return_year" in response.text:
        print("  ! sector_metrics.return_year migration is not applied; skipping annual return")
        return False
    raise RuntimeError(
        f"could not inspect sector_metrics schema: {response.status_code} {response.text[:200]}"
    )


def _pct_change(closes: List[Tuple[str, float]], lookback: int) -> Optional[float]:
    if len(closes) <= lookback:
        return None
    latest = closes[-1][1]
    past = closes[-1 - lookback][1]
    if past <= 0:
        return None
    return (latest / past - 1.0) * 100.0


def _benchmark_monthly_return(
    client: httpx.Client,
    base: str,
    headers: Dict[str, str],
    symbol: str,
) -> Optional[float]:
    instrument_id = _resolve_instrument_id(client, base, headers, symbol)
    if not instrument_id:
        return None
    return _pct_change(
        _last_n_closes(client, base, headers, instrument_id, 70),
        22,
    )


def _relative_strength(
    sector_return: Optional[float], benchmark_return: Optional[float]
) -> Optional[float]:
    """Return the sector-to-market performance ratio over the same period."""
    if sector_return is None or benchmark_return is None:
        return None
    sector_factor = 1.0 + sector_return / 100.0
    benchmark_factor = 1.0 + benchmark_return / 100.0
    if sector_factor <= 0 or benchmark_factor <= 0:
        return None
    return sector_factor / benchmark_factor


def _prior_month_ranks(
    client: httpx.Client,
    base: str,
    headers: Dict[str, str],
    market: str,
    before: date,
) -> Dict[str, int]:
    """Read each sector's latest stored monthly rank before this refresh."""
    response = client.get(
        f"{base}/rest/v1/sector_metrics",
        params={
            "market": f"eq.{market}",
            "date": f"lt.{before.isoformat()}",
            "select": "sector,rank_month,date",
            "order": "date.desc",
            "limit": "300",
        },
        headers=headers,
        timeout=15.0,
    )
    if response.status_code >= 400:
        print(
            f"  ! {market}: prior sector ranks unavailable; rank movement will remain neutral",
            file=sys.stderr,
        )
        return {}
    prior: Dict[str, int] = {}
    for row in response.json() or []:
        sector = row.get("sector")
        try:
            rank = int(row.get("rank_month"))
        except (TypeError, ValueError):
            continue
        if sector and rank > 0 and sector not in prior:
            prior[sector] = rank
    return prior


def _pct_change_by_calendar_days(
    closes: List[Tuple[str, float]], days: int, *, tolerance_days: int = 7
) -> Optional[float]:
    """Return a calendar-period change using the nearest valid trading day.

    A one-year interval spans a variable number of trading sessions. Using a
    fixed 252-bar offset drops a valid result whenever an API window starts a
    day after the exact anniversary, so accept the nearest trading close in a
    one-week window around the target date.
    """
    if len(closes) < 2:
        return None
    try:
        latest_date = date.fromisoformat(closes[-1][0][:10])
        dated = [(date.fromisoformat(t[:10]), close) for t, close in closes[:-1]]
    except ValueError:
        return None
    target = latest_date - timedelta(days=days)
    past_date, past = min(dated, key=lambda row: abs((row[0] - target).days))
    if abs((past_date - target).days) > tolerance_days or past <= 0:
        return None
    return (closes[-1][1] / past - 1.0) * 100.0


def _money_flow(rank_change: int) -> str:
    if rank_change > 1:
        return "outflow"   # 순위 떨어짐
    if rank_change < -1:
        return "inflow"    # 순위 올라감
    return "neutral"


def _list_instruments_by_sector(
    client: httpx.Client, base: str, headers: Dict[str, str],
    gics_sectors: List[str],
) -> List[str]:
    """Return instrument_id list for US instruments matching any of the
    GICS-style sector labels."""
    out: List[str] = []
    for s in gics_sectors:
        r = client.get(
            f"{base}/rest/v1/instruments",
            params={
                "sector": f"eq.{s}",
                "country_code": "eq.US",
                "select": "id",
                "limit": "200",
            },
            headers=headers, timeout=15.0,
        )
        if r.status_code >= 400:
            continue
        for row in r.json() or []:
            if row.get("id"):
                out.append(row["id"])
    return out


def _avg_pct(values: List[Optional[float]]) -> Optional[float]:
    nums = [v for v in values if v is not None]
    if not nums:
        return None
    return sum(nums) / len(nums)


def _compute_rotation_us(
    client: httpx.Client, base: str, headers: Dict[str, str],
) -> List[Dict[str, Any]]:
    today = date.today()
    rows: List[Dict[str, Any]] = []
    metrics: List[
        Tuple[
            str,
            Optional[float],
            Optional[float],
            Optional[float],
            Optional[float],
            Optional[float],
            str,
        ]
    ] = []

    for sector, gics_labels in US_SECTORS_GROUPED:
        member_ids = _list_instruments_by_sector(client, base, headers, gics_labels)
        if not member_ids:
            print(f"  ! {sector}: no members under {gics_labels}", file=sys.stderr)
            continue
        rds, rws, rms, rqs, rys = [], [], [], [], []
        # Sample up to 30 members per sector to keep the script under
        # a minute. Polygon-ingested bars vary in depth per ticker;
        # we just drop missing closes per metric.
        for inst_id in member_ids[:30]:
            closes = _last_n_closes(client, base, headers, inst_id, 300)
            if len(closes) < 2:
                continue
            rds.append(_pct_change(closes, 1))
            rws.append(_pct_change(closes, 5))
            rms.append(_pct_change(closes, 22))
            rqs.append(_pct_change(closes, 66))
            rys.append(_pct_change_by_calendar_days(closes, 365))
        rd, rw, rm, rq, ry = (
            _avg_pct(rds),
            _avg_pct(rws),
            _avg_pct(rms),
            _avg_pct(rqs),
            _avg_pct(rys),
        )
        if rd is None and rw is None and rm is None:
            print(f"  ! {sector}: no bars for any of {len(member_ids)} members", file=sys.stderr)
            continue
        metrics.append((sector, rd, rw, rm, rq, ry, ",".join(gics_labels[:1])))

    # Rank by month return (lower index = better).
    sorted_by_month = sorted(
        metrics,
        key=lambda x: (x[3] if x[3] is not None else -9999),
        reverse=True,
    )
    rank_by_sector: Dict[str, Tuple[int, int, int]] = {}
    rank_day = sorted(metrics, key=lambda x: (x[1] if x[1] is not None else -9999), reverse=True)
    rank_week = sorted(metrics, key=lambda x: (x[2] if x[2] is not None else -9999), reverse=True)
    rank_month = sorted_by_month
    for i, m in enumerate(rank_day, 1):
        rank_by_sector.setdefault(m[0], (0, 0, 0))
        rank_by_sector[m[0]] = (i, rank_by_sector[m[0]][1], rank_by_sector[m[0]][2])
    for i, m in enumerate(rank_week, 1):
        prev = rank_by_sector[m[0]]
        rank_by_sector[m[0]] = (prev[0], i, prev[2])
    for i, m in enumerate(rank_month, 1):
        prev = rank_by_sector[m[0]]
        rank_by_sector[m[0]] = (prev[0], prev[1], i)

    benchmark_month_return = _benchmark_monthly_return(
        client, base, headers, BENCHMARK_SYMBOLS["US"]
    )
    prior_ranks = _prior_month_ranks(client, base, headers, "US", today)
    for sector, rd, rw, rm, rq, ry, etf in metrics:
        rd_rank, rw_rank, rm_rank = rank_by_sector[sector]
        prev_rank = prior_ranks.get(sector, rm_rank)
        rows.append({
            "sector": sector,
            "market": "US",
            "date": today.isoformat(),
            "return_day": rd,
            "return_week": rw,
            "return_month": rm,
            "return_quarter": rq,
            "return_year": ry,
            "rank_day": rd_rank,
            "rank_week": rw_rank,
            "rank_month": rm_rank,
            "prev_rank_month": prev_rank,
            "money_flow": _money_flow(rm_rank - prev_rank),
            "relative_strength": _relative_strength(rm, benchmark_month_return),
            "etf": etf,
        })
    return rows


def _compute_rotation_kr(
    client: httpx.Client, base: str, headers: Dict[str, str],
) -> List[Dict[str, Any]]:
    today = date.today()
    rows: List[Dict[str, Any]] = []
    metrics = []
    for sector, syms in KR_SECTORS:
        rds, rws, rms, rqs, rys = [], [], [], [], []
        for sym in syms:
            # KR instruments are stored with suffix in seed (.KS / .KQ).
            for candidate in (f"{sym}.KS", f"{sym}.KQ", sym):
                inst_id = _resolve_instrument_id(client, base, headers, candidate)
                if inst_id:
                    closes = _last_n_closes(client, base, headers, inst_id, 300)
                    if closes:
                        rds.append(_pct_change(closes, 1))
                        rws.append(_pct_change(closes, 5))
                        rms.append(_pct_change(closes, 22))
                        rqs.append(_pct_change(closes, 66))
                        rys.append(_pct_change_by_calendar_days(closes, 365))
                    break
        metrics.append(
            (
                sector,
                _avg_pct(rds),
                _avg_pct(rws),
                _avg_pct(rms),
                _avg_pct(rqs),
                _avg_pct(rys),
            )
        )

    sorted_d = sorted(metrics, key=lambda x: (x[1] if x[1] is not None else -9999), reverse=True)
    sorted_w = sorted(metrics, key=lambda x: (x[2] if x[2] is not None else -9999), reverse=True)
    sorted_m = sorted(metrics, key=lambda x: (x[3] if x[3] is not None else -9999), reverse=True)
    rank_by_sector: Dict[str, Tuple[int, int, int]] = {m[0]: (0, 0, 0) for m in metrics}
    for i, m in enumerate(sorted_d, 1):
        prev = rank_by_sector[m[0]]
        rank_by_sector[m[0]] = (i, prev[1], prev[2])
    for i, m in enumerate(sorted_w, 1):
        prev = rank_by_sector[m[0]]
        rank_by_sector[m[0]] = (prev[0], i, prev[2])
    for i, m in enumerate(sorted_m, 1):
        prev = rank_by_sector[m[0]]
        rank_by_sector[m[0]] = (prev[0], prev[1], i)

    benchmark_month_return = _benchmark_monthly_return(
        client, base, headers, BENCHMARK_SYMBOLS["KR"]
    )
    prior_ranks = _prior_month_ranks(client, base, headers, "KR", today)
    for sector, rd, rw, rm, rq, ry in metrics:
        rd_rank, rw_rank, rm_rank = rank_by_sector[sector]
        prev_rank = prior_ranks.get(sector, rm_rank)
        rows.append({
            "sector": sector,
            "market": "KR",
            "date": today.isoformat(),
            "return_day": rd,
            "return_week": rw,
            "return_month": rm,
            "return_quarter": rq,
            "return_year": ry,
            "rank_day": rd_rank,
            "rank_week": rw_rank,
            "rank_month": rm_rank,
            "prev_rank_month": prev_rank,
            "money_flow": _money_flow(rm_rank - prev_rank),
            "relative_strength": _relative_strength(rm, benchmark_month_return),
        })
    return rows


def main() -> int:
    supabase_url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not (supabase_url and service_key):
        print("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        return 1
    base = supabase_url.rstrip("/")
    headers = _sb_headers(service_key)

    with httpx.Client() as client:
        print("Computing US sector rotation …")
        us_rows = _compute_rotation_us(client, base, headers)
        print(f"  → {len(us_rows)} sectors")
        print("Computing KR sector rotation …")
        kr_rows = _compute_rotation_kr(client, base, headers)
        print(f"  → {len(kr_rows)} sectors")

        # PostgREST refuses bulk-upserts where rows have different
        # key sets. Pad each row with None for any field the other
        # market populates.
        all_rows = us_rows + kr_rows
        if not _supports_return_year(client, base, headers):
            for row in all_rows:
                row.pop("return_year", None)
        all_keys = set().union(*[set(r.keys()) for r in all_rows])
        for r in all_rows:
            for k in all_keys:
                r.setdefault(k, None)
        if not all_rows:
            print("Nothing to write", file=sys.stderr)
            return 1
        post_headers = {**headers, "Prefer": "resolution=merge-duplicates,return=representation"}
        resp = client.post(
            f"{base}/rest/v1/sector_metrics",
            params={"on_conflict": "sector,market,date"},
            headers=post_headers,
            content=json.dumps(all_rows),
            timeout=30.0,
        )
        if resp.status_code >= 400:
            print(f"upsert failed: {resp.status_code} {resp.text[:200]}", file=sys.stderr)
            return 1
        print(f"Upserted {len(resp.json())} sector_metrics rows.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
