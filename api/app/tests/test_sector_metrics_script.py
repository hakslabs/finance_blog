from __future__ import annotations

import sys
from pathlib import Path
from types import SimpleNamespace


ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT))

from scripts.ingest_sector_metrics import _pct_change_by_calendar_days  # noqa: E402


def test_year_return_accepts_the_nearest_trading_day_to_the_anniversary() -> None:
    closes = [
        ("2025-07-11", 100.0),
        ("2026-07-10", 125.0),
    ]

    assert _pct_change_by_calendar_days(closes, 365) == 25.0


def test_year_return_requires_history_near_the_anniversary() -> None:
    closes = [
        ("2025-08-01", 100.0),
        ("2026-07-10", 125.0),
    ]

    assert _pct_change_by_calendar_days(closes, 365) is None


def test_us_sector_rows_include_a_real_year_return(monkeypatch) -> None:
    from scripts import ingest_sector_metrics

    monkeypatch.setattr(ingest_sector_metrics, "US_SECTORS_GROUPED", [("테스트", ["Test"])])
    monkeypatch.setattr(
        ingest_sector_metrics,
        "_list_instruments_by_sector",
        lambda *args: ["instrument-id"],
    )
    monkeypatch.setattr(
        ingest_sector_metrics,
        "_last_n_closes",
        lambda *args: [("2025-07-11", 100.0), ("2026-07-10", 125.0)],
    )

    rows = ingest_sector_metrics._compute_rotation_us(None, "", {})

    assert rows[0]["return_year"] == 25.0


def test_return_year_schema_probe_allows_older_deployments() -> None:
    from scripts import ingest_sector_metrics

    class _Client:
        def get(self, *args, **kwargs):
            return SimpleNamespace(
                status_code=400,
                text="Could not find the 'return_year' column of 'sector_metrics'",
            )

    assert not ingest_sector_metrics._supports_return_year(_Client(), "https://example", {})
