"""One-shot 2026 YTD backfill of US daily bars.

Loops through every trading day from 2026-01-02 up to (yesterday US/Eastern)
and calls api.app.jobs.refresh_us_daily.run() per date. Each call pulls
Polygon's grouped-daily endpoint (1 call → ~12k US symbols), filters to the
seeded `instruments` rows, and upserts into `price_bars_daily`. Idempotent
via the composite PK so reruns are safe.

Respects Polygon free-tier rate limit (~5 calls/min) by sleeping 13s between
calls. On 429 it backs off 60s and retries once.

Run:
    cd <repo>
    PYTHONPATH=api python scripts/backfill_us_ytd.py
"""

from __future__ import annotations

import asyncio
import os
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

# Load .env from the repo root before importing the app.
ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = ROOT / ".env"
if ENV_FILE.exists():
    for raw in ENV_FILE.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        value = value.strip()
        # Strip trailing `# inline comment` if the value is unquoted.
        if value and not value.startswith(("'", '"')):
            hash_idx = value.find(" #")
            if hash_idx >= 0:
                value = value[:hash_idx].rstrip()
        value = value.strip('"').strip("'")
        os.environ.setdefault(key.strip(), value)

sys.path.insert(0, str(ROOT / "api"))

from app.jobs.refresh_us_daily import IngestionError, run  # noqa: E402
from app.settings import Settings  # noqa: E402


SLEEP_BETWEEN_CALLS_S = 13.0  # 5 calls/min on Polygon free tier
RATE_LIMIT_BACKOFF_S = 60.0
START_DATE = date(2026, 1, 2)


def _trading_days(start: date, end: date):
    cur = start
    while cur <= end:
        # 0=Mon … 4=Fri
        if cur.weekday() < 5:
            yield cur
        cur += timedelta(days=1)


async def main() -> int:
    settings = Settings()
    if not settings.polygon_api_key:
        print("POLYGON_API_KEY missing — aborting.", file=sys.stderr)
        return 1

    end = (datetime.now(tz=timezone.utc) - timedelta(days=1)).date()
    days = list(_trading_days(START_DATE, end))
    print(f"Backfilling {len(days)} weekday(s) from {days[0]} to {days[-1]}")

    succeeded = 0
    skipped_empty = 0
    written = 0

    for i, day in enumerate(days, start=1):
        for attempt in (1, 2):
            try:
                result = await run(settings, target=day)
                seen = result.get("symbols_seen", 0)
                rows = result.get("rows_written", 0)
                written += rows
                succeeded += 1
                if seen == 0:
                    skipped_empty += 1
                print(f"  [{i}/{len(days)}] {day}: seen={seen}, written={rows}")
                break
            except IngestionError as exc:
                msg = str(exc)
                if "rate_limited" in msg and attempt == 1:
                    print(f"  [{i}/{len(days)}] {day}: rate-limited, backing off {RATE_LIMIT_BACKOFF_S}s")
                    await asyncio.sleep(RATE_LIMIT_BACKOFF_S)
                    continue
                print(f"  [{i}/{len(days)}] {day}: FAILED — {msg}", file=sys.stderr)
                break
            except Exception as exc:  # noqa: BLE001
                print(f"  [{i}/{len(days)}] {day}: UNCAUGHT — {exc!r}", file=sys.stderr)
                break

        if i < len(days):
            await asyncio.sleep(SLEEP_BETWEEN_CALLS_S)

    print(
        f"\nDone. succeeded={succeeded}/{len(days)} "
        f"(empty days={skipped_empty}) rows_written_total={written}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
