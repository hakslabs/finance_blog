from __future__ import annotations

import sys
from datetime import date
from pathlib import Path
from types import SimpleNamespace


ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT))

from scripts.ingest_sector_metrics import (  # noqa: E402
    _pct_change_by_calendar_days,
    _prior_month_ranks,
    _relative_strength,
)


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


def test_relative_strength_uses_the_same_period_market_return() -> None:
    assert _relative_strength(5.0, 2.0) == 1.05 / 1.02
    assert _relative_strength(None, 2.0) is None
    assert _relative_strength(5.0, None) is None


def test_prior_month_ranks_uses_the_latest_row_for_each_sector() -> None:
    class _Client:
        def get(self, *args, **kwargs):
            return SimpleNamespace(
                status_code=200,
                json=lambda: [
                    {"sector": "기술", "rank_month": 2, "date": "2026-07-10"},
                    {"sector": "기술", "rank_month": 5, "date": "2026-07-09"},
                    {"sector": "금융", "rank_month": 4, "date": "2026-07-10"},
                ],
            )

    assert _prior_month_ranks(
        _Client(), "https://example", {}, "US", date(2026, 7, 11)
    ) == {"기술": 2, "금융": 4}


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
    monkeypatch.setattr(
        ingest_sector_metrics,
        "_benchmark_monthly_return",
        lambda *args: None,
    )
    monkeypatch.setattr(ingest_sector_metrics, "_prior_month_ranks", lambda *args: {})

    rows = ingest_sector_metrics._compute_rotation_us(None, "", {})

    assert rows[0]["return_year"] == 25.0


def test_us_sector_rows_include_market_relative_strength(monkeypatch) -> None:
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
        lambda *args: [
            (f"2026-06-{day:02d}", 100.0 + day - 1) for day in range(1, 24)
        ],
    )
    monkeypatch.setattr(
        ingest_sector_metrics,
        "_benchmark_monthly_return",
        lambda *args: 2.0,
    )
    monkeypatch.setattr(ingest_sector_metrics, "_prior_month_ranks", lambda *args: {})

    rows = ingest_sector_metrics._compute_rotation_us(None, "", {})

    assert rows[0]["relative_strength"] == 1.22 / 1.02


def test_us_sector_rows_use_prior_rank_for_flow_direction(monkeypatch) -> None:
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
        lambda *args: [
            (f"2026-06-{day:02d}", 100.0 + day - 1) for day in range(1, 24)
        ],
    )
    monkeypatch.setattr(
        ingest_sector_metrics,
        "_benchmark_monthly_return",
        lambda *args: 2.0,
    )
    monkeypatch.setattr(
        ingest_sector_metrics,
        "_prior_month_ranks",
        lambda *args: {"테스트": 3},
    )

    rows = ingest_sector_metrics._compute_rotation_us(None, "", {})

    assert rows[0]["prev_rank_month"] == 3
    assert rows[0]["money_flow"] == "inflow"


def test_return_year_schema_probe_allows_older_deployments() -> None:
    from scripts import ingest_sector_metrics

    class _Client:
        def get(self, *args, **kwargs):
            return SimpleNamespace(
                status_code=400,
                text="Could not find the 'return_year' column of 'sector_metrics'",
            )

    assert not ingest_sector_metrics._supports_return_year(_Client(), "https://example", {})
