"""Seed `blog_index_universe` with KOSPI200, NASDAQ100, and S&P500 members.

Sources:
  - S&P 500    → Wikipedia "List of S&P 500 companies" (Symbol + Security)
  - NASDAQ-100 → Wikipedia "Nasdaq-100" (Ticker + Company)
  - KOSPI 200  → data.krx.co.kr OTP-backed JSON endpoint
                  (`MDCSTAT.list?bld=dbms/MDC/STAT/standard/MDCSTAT00601`)

Wikipedia is the pragmatic-source-of-truth for the US indexes since
Polygon's reference API doesn't expose index membership on the free
tier. Tables change slowly (a few constituent swaps per year), so a
weekly re-seed is plenty.

Idempotent via the (index_code, symbol) primary key; upserts go through
PostgREST with `Prefer: resolution=merge-duplicates`.

Run:
    PYTHONPATH=api python scripts/seed_blog_index_universe.py
    # selective: --indexes SP500,NDX (default all three)

Env required (.env at repo root works):
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


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


import httpx  # noqa: E402


# ──────────────────────────────────────────────────────────────────────
# Wikipedia table parser — tiny and intentionally not pulling in
# beautifulsoup/lxml. Keeps the script dependency-free.
# ──────────────────────────────────────────────────────────────────────
class _TableExtractor(HTMLParser):
    """Pulls the first <table class="wikitable ..."> on a page as a list
    of rows, where each row is a list of cell-text strings."""

    def __init__(self) -> None:
        super().__init__()
        self.tables: List[List[List[str]]] = []
        self._in_table = False
        self._depth = 0
        self._row: Optional[List[str]] = None
        self._cell: Optional[List[str]] = None
        self._target_class = "wikitable"

    def handle_starttag(self, tag: str, attrs: List[Tuple[str, Optional[str]]]) -> None:
        attr_d = dict(attrs)
        if tag == "table":
            cls = attr_d.get("class") or ""
            if self._target_class in cls and not self._in_table:
                self._in_table = True
                self._depth = 1
                self.tables.append([])
                return
            if self._in_table:
                self._depth += 1
        elif self._in_table:
            if tag == "tr":
                self._row = []
            elif tag in ("td", "th"):
                self._cell = []

    def handle_endtag(self, tag: str) -> None:
        if not self._in_table:
            return
        if tag == "table":
            self._depth -= 1
            if self._depth == 0:
                self._in_table = False
            return
        if tag == "tr" and self._row is not None:
            self.tables[-1].append(self._row)
            self._row = None
        elif tag in ("td", "th") and self._cell is not None and self._row is not None:
            self._row.append("".join(self._cell).strip())
            self._cell = None

    def handle_data(self, data: str) -> None:
        if self._cell is not None:
            self._cell.append(data)


def _fetch_text(client: httpx.Client, url: str, **kwargs: Any) -> str:
    resp = client.get(url, timeout=20.0, **kwargs)
    if resp.status_code >= 400:
        raise RuntimeError(f"GET {url} → {resp.status_code}")
    return resp.text


def fetch_sp500(client: httpx.Client) -> List[Dict[str, str]]:
    """Wikipedia: first wikitable has Symbol in col 0, Security in col 1."""
    html = _fetch_text(client, "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies",
                       headers={"User-Agent": "financelab-seeder/1.0"})
    parser = _TableExtractor()
    parser.feed(html)
    if not parser.tables:
        return []
    rows = parser.tables[0]
    out: List[Dict[str, str]] = []
    for row in rows[1:]:  # skip header
        if len(row) < 2:
            continue
        symbol = row[0].strip().upper()
        # Wikipedia formats e.g. BRK.B with a dot — Polygon uses BRK.B too.
        name = row[1].strip()
        if symbol:
            out.append({"symbol": symbol, "name": name})
    return out


def fetch_nasdaq100(client: httpx.Client) -> List[Dict[str, str]]:
    """Wikipedia Nasdaq-100 table — Ticker in col 1, Company in col 0
    (header order changed across edits; detect by matching)."""
    html = _fetch_text(client, "https://en.wikipedia.org/wiki/Nasdaq-100",
                       headers={"User-Agent": "financelab-seeder/1.0"})
    parser = _TableExtractor()
    parser.feed(html)
    if not parser.tables:
        return []
    # The constituent table is usually the LAST `wikitable sortable` —
    # iterate them and pick the one whose header has a "Ticker" column.
    for table in parser.tables:
        if not table:
            continue
        header = [c.lower() for c in table[0]]
        sym_idx = next(
            (i for i, c in enumerate(header) if "ticker" in c or "symbol" in c), None
        )
        name_idx = next(
            (i for i, c in enumerate(header) if "company" in c or "security" in c), None
        )
        if sym_idx is None:
            continue
        out: List[Dict[str, str]] = []
        for row in table[1:]:
            if len(row) <= sym_idx:
                continue
            symbol = row[sym_idx].strip().upper()
            name = row[name_idx].strip() if name_idx is not None and len(row) > name_idx else ""
            if symbol and re.fullmatch(r"[A-Z][A-Z0-9.\-]{0,6}", symbol):
                out.append({"symbol": symbol, "name": name})
        if out:
            return out
    return []


def fetch_kospi200(client: httpx.Client) -> List[Dict[str, str]]:
    """KRX data API: a two-call dance (OTP then payload) without auth."""
    otp_url = "http://data.krx.co.kr/comm/fileDn/GenerateOTP/generate.cmd"
    download_url = "http://data.krx.co.kr/comm/fileDn/download_csv/download.cmd"
    headers = {
        "User-Agent": "Mozilla/5.0 financelab-seeder/1.0",
        "Referer": "http://data.krx.co.kr/contents/MDC/MDI/mdiLoader/index.cmd",
    }
    # KOSPI200 지수 구성종목 / 코드: 1028
    otp_params = {
        "mktId": "STK",
        "indIdx": "1",
        "indIdx2": "028",
        "trdDd": time.strftime("%Y%m%d"),
        "share": "1",
        "money": "1",
        "csvxls_isNo": "false",
        "name": "fileDown",
        "url": "dbms/MDC/STAT/standard/MDCSTAT00601",
    }
    try:
        otp = client.post(otp_url, data=otp_params, headers=headers, timeout=20.0)
        if otp.status_code >= 400:
            print(f"  ! KRX OTP {otp.status_code}", file=sys.stderr)
            return []
        otp_code = otp.text.strip()
        if not otp_code:
            return []
        resp = client.post(download_url, data={"code": otp_code}, headers=headers, timeout=30.0)
        if resp.status_code >= 400:
            print(f"  ! KRX download {resp.status_code}", file=sys.stderr)
            return []
        # CSV; KRX serves euc-kr
        try:
            text = resp.content.decode("euc-kr")
        except UnicodeDecodeError:
            text = resp.text
    except httpx.HTTPError as exc:
        print(f"  ! KRX request failed: {exc}", file=sys.stderr)
        return []

    out: List[Dict[str, str]] = []
    for line in text.splitlines()[1:]:
        # Lines look like:  "005930","삼성전자","KOSPI200","..."
        parts = [c.strip().strip('"') for c in line.split(",")]
        if len(parts) < 2:
            continue
        code = parts[0]
        name = parts[1]
        if re.fullmatch(r"\d{6}", code):
            out.append({"symbol": code, "name": name})
    return out


def upsert(
    client: httpx.Client,
    supabase_url: str,
    service_key: str,
    rows: List[Dict[str, Any]],
) -> int:
    if not rows:
        return 0
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=representation",
    }
    url = f"{supabase_url.rstrip('/')}/rest/v1/blog_index_universe"
    resp = client.post(
        url,
        params={"on_conflict": "index_code,symbol"},
        headers=headers,
        content=json.dumps(rows),
        timeout=30.0,
    )
    if resp.status_code >= 400:
        print(f"  upsert failed: {resp.status_code} {resp.text[:200]}", file=sys.stderr)
        return 0
    return len(resp.json())


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--indexes", type=str, default="SP500,NDX,KOSPI200")
    args = parser.parse_args()
    wanted = {x.strip().upper() for x in args.indexes.split(",") if x.strip()}

    supabase_url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not (supabase_url and service_key):
        print("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        return 1

    fetchers = {
        "SP500": fetch_sp500,
        "NDX": fetch_nasdaq100,
        "KOSPI200": fetch_kospi200,
    }

    total = 0
    with httpx.Client(follow_redirects=True) as client:
        for code in ("SP500", "NDX", "KOSPI200"):
            if code not in wanted:
                continue
            print(f"Fetching {code} …")
            members = fetchers[code](client)
            print(f"  got {len(members)} members")
            rows = [{"index_code": code, "symbol": m["symbol"], "name": m.get("name") or None}
                    for m in members]
            n = upsert(client, supabase_url, service_key, rows)
            total += n
            print(f"  upserted {n} into blog_index_universe")

    print(f"Done. {total} rows written.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
