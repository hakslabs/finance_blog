from __future__ import annotations

import sys
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT))

from scripts.ingest_public_us_macro_calendar import (  # noqa: E402
    parse_bea_schedule,
    parse_bls_ical,
    parse_fomc_schedule,
)


def test_parse_bls_ical_keeps_curated_events_and_converts_eastern_to_utc() -> None:
    payload = """BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART;TZID=US-Eastern:20260714T083000
SUMMARY:Consumer Price Index
END:VEVENT
BEGIN:VEVENT
DTSTART;TZID=US-Eastern:20260714T083000
SUMMARY:Real Earnings
END:VEVENT
END:VCALENDAR
"""

    rows = parse_bls_ical(payload, date(2026, 7, 11), date(2026, 7, 20))

    assert rows == [
        {
            "calendar_code": "US_CPI",
            "title": "미 CPI",
            "country_code": "US",
            "importance": 3,
            "scheduled_at": "2026-07-14T12:30:00+00:00",
            "source": "bls",
        }
    ]


def test_parse_bea_schedule_keeps_gdp_and_pce_rows() -> None:
    payload = """
<td class="scheduled-date no-wrap"><div class="release-date">July 30</div>
<small class="text-muted">8:30 AM</small></td><td>News</td>
<td class="release-title views-field">GDP (Advance Estimate), 2nd Quarter 2026</td>
<td class="scheduled-date no-wrap"><div class="release-date">July 30</div>
<small class="text-muted">8:30 AM</small></td><td>News</td>
<td class="release-title views-field">Personal Income and Outlays, June 2026</td>
"""

    rows = parse_bea_schedule(payload, date(2026, 7, 11), date(2026, 8, 1), 2026)

    assert [(row["calendar_code"], row["scheduled_at"]) for row in rows] == [
        ("US_GDP", "2026-07-30T12:30:00+00:00"),
        ("US_PCE", "2026-07-30T12:30:00+00:00"),
    ]


def test_parse_fomc_schedule_uses_the_last_meeting_day() -> None:
    payload = """
<h4><a id="42828">2026 FOMC Meetings</a></h4>
<div class="row fomc-meeting"><div class="fomc-meeting__month"><strong>July</strong></div>
<div class="fomc-meeting__date">28-29</div></div>
"""

    rows = parse_fomc_schedule(payload, date(2026, 7, 11), date(2026, 8, 1))

    assert rows[0]["calendar_code"] == "US_FOMC"
    assert rows[0]["scheduled_at"] == "2026-07-29T18:00:00+00:00"
