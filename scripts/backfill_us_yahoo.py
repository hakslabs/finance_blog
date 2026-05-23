"""Per-symbol US daily-bar backfill via Yahoo Finance chart v8.

Polygon's free tier caps the lookback at ~2 years, which leaves stocks
short of the 5-year history the chart UI expects. Yahoo Finance's v8
chart endpoint is free, no API key, returns 5+ years of unadjusted
daily OHLCV per ticker in one call.

Loops every active US instrument, fetches the full window, upserts into
`price_bars_daily` with source='yahoo'. Idempotent — re-running won't
duplicate. Polite 0.4s throttle between symbols.

Run:
    PYTHONPATH=api ./api/.venv/bin/python scripts/backfill_us_yahoo.py

Optional:
    --years 7        How many years back to request (default 5)
    --limit 50       Cap the number of symbols (for testing)
"""

from __future__ import annotations

import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List

# Load .env from repo root
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

sys.path.insert(0, str(ROOT / "api"))

import httpx  # noqa: E402
from app.settings import Settings  # noqa: E402


SLEEP_BETWEEN_S = 0.4
USER_AGENT = "Mozilla/5.0 (compatible; finance-blog-backfill/1.0)"
YAHOO_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"


def _arg_int(name: str, default: int) -> int:
    for i, a in enumerate(sys.argv):
        if a == name and i + 1 < len(sys.argv):
            return int(sys.argv[i + 1])
        if a.startswith(f"{name}="):
            return int(a.split("=", 1)[1])
    return default


def _supabase_headers(settings: Settings) -> Dict[str, str]:
    return {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Accept": "application/json",
    }


async def _fetch_us_instruments(settings: Settings) -> List[Dict[str, str]]:
    """All active US instruments. Pages through PostgREST 1000-row cap."""
    base = settings.supabase_url.rstrip("/")
    headers = _supabase_headers(settings)
    out: List[Dict[str, str]] = []
    async with httpx.AsyncClient(timeout=15.0, headers=headers) as client:
        offset = 0
        while True:
            r = await client.get(
                f"{base}/rest/v1/instruments",
                params={
                    "select": "id,symbol",
                    "country_code": "eq.US",
                    "is_active": "eq.true",
                    "order": "symbol.asc",
                    "limit": "1000",
                    "offset": str(offset),
                },
            )
            r.raise_for_status()
            rows = r.json()
            if not rows:
                break
            out.extend(rows)
            offset += len(rows)
            if len(rows) < 1000:
                break
    return out


async def _fetch_yahoo_bars(client: httpx.AsyncClient, symbol: str, years: int) -> List[Dict[str, Any]]:
    end = int(datetime.now(tz=timezone.utc).timestamp())
    start = int((datetime.now(tz=timezone.utc) - timedelta(days=years * 366)).timestamp())
    r = await client.get(
        YAHOO_URL.format(symbol=symbol),
        params={"period1": str(start), "period2": str(end), "interval": "1d"},
        headers={"User-Agent": USER_AGENT},
    )
    if r.status_code >= 400:
        return []
    try:
        body = r.json()
    except ValueError:
        return []
    err = body.get("chart", {}).get("error")
    if err:
        return []
    results = body.get("chart", {}).get("result") or []
    if not results:
        return []
    res = results[0]
    ts = res.get("timestamp") or []
    quotes = (res.get("indicators", {}).get("quote") or [{}])[0]
    opens = quotes.get("open") or []
    highs = quotes.get("high") or []
    lows = quotes.get("low") or []
    closes = quotes.get("close") or []
    volumes = quotes.get("volume") or []
    bars: List[Dict[str, Any]] = []
    for i, t in enumerate(ts):
        o = opens[i] if i < len(opens) else None
        h = highs[i] if i < len(highs) else None
        lo = lows[i] if i < len(lows) else None
        c = closes[i] if i < len(closes) else None
        v = volumes[i] if i < len(volumes) else None
        # Skip days where Yahoo emits null (holidays/data gaps).
        if None in (o, h, lo, c):
            continue
        d = datetime.fromtimestamp(t, tz=timezone.utc).date()
        bars.append({"t": d.isoformat(), "o": float(o), "h": float(h), "l": float(lo), "c": float(c), "v": int(v or 0)})
    return bars


async def _upsert(client: httpx.AsyncClient, settings: Settings, rows: List[Dict[str, Any]]) -> None:
    if not rows:
        return
    base = settings.supabase_url.rstrip("/")
    headers = {
        **_supabase_headers(settings),
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    # PostgREST tolerates ~10k row payloads fine; one ticker's 5y = ~1300 rows.
    r = await client.post(f"{base}/rest/v1/price_bars_daily", json=rows, headers=headers, timeout=20.0)
    if r.status_code >= 400:
        raise RuntimeError(f"upsert failed {r.status_code}: {r.text[:200]}")


async def main() -> int:
    settings = Settings()
    if not (settings.supabase_url and settings.supabase_service_role_key):
        print("Supabase env missing — aborting.", file=sys.stderr)
        return 2

    years = _arg_int("--years", 5)
    limit = _arg_int("--limit", 0)

    insts = await _fetch_us_instruments(settings)
    if limit > 0:
        insts = insts[:limit]
    print(f"Backfilling {len(insts)} US symbols, {years}y window, via Yahoo chart v8")

    total_rows = 0
    ok = 0
    empty = 0
    failed = 0
    async with httpx.AsyncClient(timeout=15.0) as client:
        for i, inst in enumerate(insts, start=1):
            symbol = inst["symbol"]
            try:
                bars = await _fetch_yahoo_bars(client, symbol, years)
                if not bars:
                    empty += 1
                    print(f"  [{i}/{len(insts)}] {symbol}: empty", flush=True)
                else:
                    rows = [{**b, "instrument_id": inst["id"], "source": "yahoo"} for b in bars]
                    await _upsert(client, settings, rows)
                    total_rows += len(rows)
                    ok += 1
                    if i % 25 == 0 or i == len(insts):
                        print(f"  [{i}/{len(insts)}] {symbol}: {len(rows)} rows · running total {total_rows}", flush=True)
            except Exception as exc:  # noqa: BLE001
                failed += 1
                print(f"  [{i}/{len(insts)}] {symbol}: FAILED — {exc!r}", file=sys.stderr, flush=True)
            await asyncio.sleep(SLEEP_BETWEEN_S)
    print(f"Done. ok={ok}, empty={empty}, failed={failed}, rows={total_rows}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
