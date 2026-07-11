from __future__ import annotations

import asyncio
from types import SimpleNamespace


def test_ingest_13f_persists_sec_report_date(monkeypatch) -> None:
    from app.jobs import ingest_13f

    class _Client:
        async def delete(self, *args, **kwargs):
            return None

    captured: list[tuple[str, list[dict]]] = []

    async def fake_fetch_information_table(*args, **kwargs):
        return [
            {
                "cusip": "037833100",
                "name": "Apple Inc.",
                "shares": 10.0,
                "value_usd": 2000,
                "put_call": None,
            }
        ]

    async def fake_upsert(client, settings, path, rows, **kwargs):
        captured.append((path, rows))
        return [{"id": "filing-id"}] if path == "filings" else []

    async def fake_resolve(*args, **kwargs):
        return "instrument-id"

    monkeypatch.setattr(ingest_13f.sec, "fetch_information_table", fake_fetch_information_table)
    monkeypatch.setattr(ingest_13f, "_sb_upsert", fake_upsert)
    monkeypatch.setattr(ingest_13f, "_resolve_or_create_instrument", fake_resolve)

    result = asyncio.run(
        ingest_13f._ingest_one_accession(
            _Client(),
            SimpleNamespace(
                supabase_url="https://example.supabase.co",
                supabase_service_role_key="service-role",
            ),
            {"name": "Berkshire Hathaway"},
            {
                "accession": "0001193125-26-226661",
                "filed_at": "2026-05-15",
                "report_date": "2026-03-31",
                "url": "https://www.sec.gov/example",
            },
            "1067983",
            "FinanceLab/1.0 contact=hi@haklee.me",
        )
    )

    filing_row = next(rows[0] for path, rows in captured if path == "filings")
    assert result["status"] == "ok"
    assert filing_row["period_end"] == "2026-03-31"


def test_ingest_13f_main_returns_nonzero_for_a_master_error(monkeypatch) -> None:
    from app import settings as settings_module
    from app.jobs import ingest_13f

    async def fake_run(settings):
        return {
            "masters": 1,
            "results": [
                {"slug": "buffett", "status": "ok", "filings": []},
                {"slug": "munger", "status": "error", "error": "upstream"},
            ],
        }

    monkeypatch.setattr(settings_module, "get_settings", lambda: object())
    monkeypatch.setattr(ingest_13f, "run", fake_run)

    exit_code, _ = ingest_13f.main()

    assert exit_code == 1
