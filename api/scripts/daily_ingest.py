"""Daily market-data ingest for free-tier hosting.

Keeps the dashboard showing the latest available trading day. Intended to run
from a free, reliable scheduler (GitHub Actions) because Vercel Hobby cron is
limited/unreliable, which is what let the daily bars go stale.

Free-tier reality this script is built around:
  - Polygon's free tier is DELAYED — "yesterday" is often not authorized yet,
    so we sweep the last few business days and ingest whichever are available.
    Upserts are idempotent (merge-duplicates), so re-ingesting a present day is
    harmless.
  - One Polygon call per day, spaced out to stay under the 5 req/min free cap.

Run from the `api/` directory:  uv run python scripts/daily_ingest.py
"""

from __future__ import annotations

import asyncio
from datetime import date, timedelta
from typing import Awaitable

from app.settings import get_settings
from app.jobs import refresh_us_daily, refresh_kr_daily, ingest_fear_greed


async def _safe(name: str, coro: Awaitable) -> None:
    try:
        result = await coro
        print(f"[ok]   {name}: {result}")
    except Exception as exc:  # noqa: BLE001 — log and continue; one source failing
        print(f"[fail] {name}: {exc!r}")


def _recent_business_days(n: int) -> list[date]:
    """The last `n` business days (Mon–Fri), most recent first, excluding today."""
    out: list[date] = []
    d = date.today() - timedelta(days=1)
    while len(out) < n:
        if d.weekday() < 5:  # 0=Mon … 4=Fri
            out.append(d)
        d -= timedelta(days=1)
    return out


async def main() -> None:
    settings = get_settings()

    # US daily bars — sweep recent business days; Polygon free is delayed, so
    # this catches each day as soon as it is released. ~13s spacing keeps us
    # under the free 5 req/min cap.
    for i, day in enumerate(_recent_business_days(4)):
        if i:
            await asyncio.sleep(13)
        await _safe(f"us_daily {day}", refresh_us_daily.run(settings, target=day))

    # KR daily bars — KRX EOD endpoint picks the latest published session.
    await _safe("kr_daily", refresh_kr_daily.run(settings))

    # CNN Fear & Greed history (free, unmetered).
    await _safe("fear_greed", ingest_fear_greed.run())


if __name__ == "__main__":
    asyncio.run(main())
