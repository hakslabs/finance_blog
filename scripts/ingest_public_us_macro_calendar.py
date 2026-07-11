"""Ingest upcoming US macro releases from official public schedules.

The available Finnhub key does not include its economic-calendar endpoint, and
FRED's release/dates endpoint is backward-looking. This script instead reads
the publishers' own forward schedules:

- BLS's public iCalendar feed for CPI, PPI, NFP, JOLTS, and ECI;
- BEA's public release schedule for GDP and Personal Income/PCE; and
- the Federal Reserve's FOMC meeting calendar.

It writes only scheduled dates; actual and forecast values remain the
responsibility of the data source that publishes those values after release.

Run:
    PYTHONPATH=api python scripts/ingest_public_us_macro_calendar.py
    # optional: --weeks-ahead 12 (default 12)

Env required (.env at repo root works):
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
"""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import sys
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple
from zoneinfo import ZoneInfo

import httpx


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
        os.environ.setdefault(key.strip(), value.strip('"').strip("'"))


BLS_ICAL_URL = "https://www.bls.gov/schedule/news_release/bls.ics"
BEA_SCHEDULE_URL = "https://www.bea.gov/news/schedule/"
FOMC_SCHEDULE_URL = "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm"
EASTERN = ZoneInfo("America/New_York")
HTTP_HEADERS = {
    # BLS rejects generic clients; its public schedule accepts a contact-form
    # user agent, matching the convention required by other US public APIs.
    "User-Agent": "FinanceLab/1.0 contact=hi@haklee.me",
    "Accept": "*/*",
}

# The BLS iCalendar feed has many releases. Keep only the market-moving series
# that the product presents in its macro calendar.
BLS_EVENTS: Dict[str, Tuple[str, str, int]] = {
    "Consumer Price Index": ("US_CPI", "미 CPI", 3),
    "Producer Price Index": ("US_PPI", "미 PPI", 2),
    "Employment Situation": ("US_NFP", "미 고용 (NFP)", 3),
    "Job Openings and Labor Turnover Survey": ("US_JOLTS", "미 JOLTS", 2),
    "Employment Cost Index": ("US_ECI", "미 고용비용지수", 2),
}

BEA_ROW_RE = re.compile(
    r'<td[^>]*class="scheduled-date[^\"]*"[^>]*>.*?'
    r'<div[^>]*class="release-date"[^>]*>(?P<date>.*?)</div>\s*'
    r'<small[^>]*>(?P<time>[^<]+)</small>.*?</td>.*?'
    r'<td[^>]*class="[^\"]*release-title[^\"]*"[^>]*>(?P<title>.*?)</td>',
    re.IGNORECASE | re.DOTALL,
)
FOMC_MEETING_RE = re.compile(
    r'<div class="[^\"]*fomc-meeting[^\"]*"[^>]*>.*?'
    r'<div class="[^\"]*fomc-meeting__month[^\"]*"[^>]*>\s*'
    r'<strong>(?P<month>[A-Za-z]+)</strong>.*?'
    r'<div class="[^\"]*fomc-meeting__date[^\"]*"[^>]*>(?P<days>[^<]+)</div>',
    re.IGNORECASE | re.DOTALL,
)


class CalendarIngestionError(RuntimeError):
    """An official schedule could not be read or persisted."""


def _clean_html(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", value))).strip()


def _to_iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


def _in_window(dt: datetime, start: date, end: date) -> bool:
    return start <= dt.date() <= end


def _row(
    *, source: str, code: str, title: str, importance: int, scheduled_at: datetime
) -> Dict[str, Any]:
    return {
        "calendar_code": code,
        "title": title,
        "country_code": "US",
        "importance": importance,
        "scheduled_at": _to_iso(scheduled_at),
        "source": source,
    }


def _unfold_ical_lines(payload: str) -> Iterable[str]:
    """Unfold RFC 5545 continuation lines without a calendar dependency."""
    current = ""
    for line in payload.replace("\r\n", "\n").split("\n"):
        if line.startswith((" ", "\t")):
            current += line[1:]
        else:
            if current:
                yield current
            current = line
    if current:
        yield current


def parse_bls_ical(payload: str, start: date, end: date) -> List[Dict[str, Any]]:
    """Extract curated upcoming BLS events from the official iCalendar feed."""
    rows: List[Dict[str, Any]] = []
    summary: str | None = None
    starts_at: datetime | None = None
    in_event = False
    for line in _unfold_ical_lines(payload):
        if line == "BEGIN:VEVENT":
            in_event = True
            summary = None
            starts_at = None
            continue
        if line == "END:VEVENT":
            if in_event and summary in BLS_EVENTS and starts_at and _in_window(starts_at, start, end):
                code, title, importance = BLS_EVENTS[summary]
                rows.append(
                    _row(
                        source="bls",
                        code=code,
                        title=title,
                        importance=importance,
                        scheduled_at=starts_at,
                    )
                )
            in_event = False
            continue
        if not in_event:
            continue
        if line.startswith("SUMMARY:"):
            summary = line.removeprefix("SUMMARY:").strip()
            continue
        match = re.match(r"DTSTART(?:;[^:]+)?:([0-9]{8}T[0-9]{6})$", line)
        if match:
            starts_at = datetime.strptime(match.group(1), "%Y%m%dT%H%M%S").replace(tzinfo=EASTERN)
    return rows


def _bea_event(title: str) -> Tuple[str, str, int] | None:
    if title.startswith("GDP ("):
        return "US_GDP", "미 GDP", 2
    if title.startswith("Personal Income and Outlays"):
        return "US_PCE", "미 PCE", 3
    return None


def parse_bea_schedule(payload: str, start: date, end: date, year: int) -> List[Dict[str, Any]]:
    """Extract GDP and PCE release dates from BEA's current-year schedule."""
    rows: List[Dict[str, Any]] = []
    for match in BEA_ROW_RE.finditer(payload):
        event = _bea_event(_clean_html(match.group("title")))
        if not event:
            continue
        try:
            release_at = datetime.strptime(
                f"{year} {_clean_html(match.group('date'))} {_clean_html(match.group('time'))}",
                "%Y %B %d %I:%M %p",
            ).replace(tzinfo=EASTERN)
        except ValueError:
            continue
        if not _in_window(release_at, start, end):
            continue
        code, title, importance = event
        rows.append(
            _row(
                source="bea",
                code=code,
                title=title,
                importance=importance,
                scheduled_at=release_at,
            )
        )
    return rows


def parse_fomc_schedule(payload: str, start: date, end: date) -> List[Dict[str, Any]]:
    """Extract FOMC decision dates from the Federal Reserve's meeting page."""
    rows: List[Dict[str, Any]] = []
    for match in FOMC_MEETING_RE.finditer(payload):
        years = re.findall(r"(\d{4})\s+FOMC Meetings", payload[: match.start()], re.IGNORECASE)
        days = re.findall(r"\d+", match.group("days"))
        if not years or not days:
            continue
        try:
            meeting_at = datetime(
                int(years[-1]),
                datetime.strptime(match.group("month"), "%B").month,
                int(days[-1]),
                14,
                tzinfo=EASTERN,
            )
        except ValueError:
            continue
        if not _in_window(meeting_at, start, end):
            continue
        rows.append(
            _row(
                source="federal_reserve",
                code="US_FOMC",
                title="FOMC 회의",
                importance=3,
                scheduled_at=meeting_at,
            )
        )
    return rows


def _fetch_text(client: httpx.Client, url: str) -> str:
    response = client.get(url, timeout=30.0)
    response.raise_for_status()
    return response.text


def upsert_rows(
    client: httpx.Client, supabase_url: str, service_key: str, rows: List[Dict[str, Any]]
) -> int:
    if not rows:
        return 0
    response = client.post(
        f"{supabase_url.rstrip('/')}/rest/v1/economic_events",
        params={"on_conflict": "source,calendar_code,scheduled_at"},
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=representation",
        },
        content=json.dumps(rows),
        timeout=30.0,
    )
    response.raise_for_status()
    return len(response.json())


def purge_future_fred_rows(
    client: httpx.Client, supabase_url: str, service_key: str, start: date
) -> int:
    """Remove malformed forward entries left by the deprecated FRED schedule path."""
    response = client.delete(
        f"{supabase_url.rstrip('/')}/rest/v1/economic_events",
        params={"source": "eq.fred", "scheduled_at": f"gte.{start.isoformat()}T00:00:00Z"},
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Prefer": "return=representation",
        },
        timeout=30.0,
    )
    response.raise_for_status()
    return len(response.json())


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--weeks-ahead", type=int, default=12)
    args = parser.parse_args()

    supabase_url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not (supabase_url and service_key):
        print("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        return 1

    start = date.today()
    end = start + timedelta(weeks=args.weeks_ahead)
    print(f"Pulling official US macro schedules {start} -> {end}")

    rows: List[Dict[str, Any]] = []
    failures: List[str] = []
    with httpx.Client(headers=HTTP_HEADERS, follow_redirects=True) as client:
        sources = (
            ("BLS", BLS_ICAL_URL, lambda text: parse_bls_ical(text, start, end)),
            ("BEA", BEA_SCHEDULE_URL, lambda text: parse_bea_schedule(text, start, end, start.year)),
            ("Federal Reserve", FOMC_SCHEDULE_URL, lambda text: parse_fomc_schedule(text, start, end)),
        )
        for name, url, parser_fn in sources:
            try:
                source_rows = parser_fn(_fetch_text(client, url))
            except (httpx.HTTPError, CalendarIngestionError) as exc:
                failures.append(name)
                print(f"  ! {name}: {exc}", file=sys.stderr)
                continue
            rows.extend(source_rows)
            print(f"  - {name}: {len(source_rows)} events")

        deduped = {
            (row["source"], row["calendar_code"], row["scheduled_at"]): row for row in rows
        }
        written = upsert_rows(client, supabase_url, service_key, list(deduped.values()))
        purged = (
            purge_future_fred_rows(client, supabase_url, service_key, start)
            if rows
            else 0
        )

    print(f"Done. Upserted {written} macro rows; removed {purged} deprecated FRED rows.")
    if failures:
        print(f"Failed official sources: {', '.join(failures)}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
