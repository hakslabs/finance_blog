"""One-shot historical backfill of KR daily bars (KOSPI + KOSDAQ).

Mirrors backfill_us_ytd.py but for the KR market. Loops through every
trading day from `--start` (default: 365 days ago) up to (yesterday) and
calls api.app.jobs.refresh_kr_daily.run() per date. Each call pulls KRX
`sto/stk_bydd_trd` (one API call covers the full universe), filters to
seeded `instruments` (country_code='KR'), and upserts into
`price_bars_daily`. Idempotent.

KRX OpenAPI is gentler than Polygon — small sleep (1.5s) between
calls is plenty.

Run (1-year default):
    PYTHONPATH=api python scripts/backfill_kr_ytd.py

Custom range:
    PYTHONPATH=api python scripts/backfill_kr_ytd.py --start 2025-05-21
"""

from __future__ import annotations

import asyncio
import os
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path


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

from app.jobs.refresh_kr_daily import IngestionError, run  # noqa: E402
from app.settings import Settings  # noqa: E402


SLEEP_BETWEEN_CALLS_S = 1.5


def _resolve_start_date() -> date:
    """`--start YYYY-MM-DD` if provided, else 365 days back from today."""
    for i, arg in enumerate(sys.argv):
        if arg == "--start" and i + 1 < len(sys.argv):
            return date.fromisoformat(sys.argv[i + 1])
        if arg.startswith("--start="):
            return date.fromisoformat(arg.split("=", 1)[1])
    return (datetime.now(tz=timezone.utc) - timedelta(days=365)).date()


def _trading_days(start: date, end: date):
    cur = start
    while cur <= end:
        if cur.weekday() < 5:
            yield cur
        cur += timedelta(days=1)


async def main() -> int:
    settings = Settings()
    if not settings.krx_api_key:
        print("KRX_API_KEY missing — aborting.", file=sys.stderr)
        return 1

    start = _resolve_start_date()
    end = date.today() - timedelta(days=1)
    days = list(_trading_days(start, end))
    print(f"Backfilling {len(days)} KR trading day(s) from {days[0]} to {days[-1]}")

    succeeded = 0
    written = 0
    skipped_empty = 0
    for i, day in enumerate(days, start=1):
        try:
            result = await run(settings, target=day)
            seen = result.get("symbols_seen", 0)
            rows = result.get("rows_written", 0)
            written += rows
            succeeded += 1
            if seen == 0:
                skipped_empty += 1
            print(f"  [{i}/{len(days)}] {day}: seen={seen}, written={rows}")
        except IngestionError as exc:
            print(f"  [{i}/{len(days)}] {day}: FAILED — {exc}", file=sys.stderr)
        except Exception as exc:  # noqa: BLE001
            print(f"  [{i}/{len(days)}] {day}: UNCAUGHT — {exc!r}", file=sys.stderr)
        await asyncio.sleep(SLEEP_BETWEEN_CALLS_S)

    print(f"Done. {succeeded}/{len(days)} succeeded, {skipped_empty} empty, {written} rows total")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
