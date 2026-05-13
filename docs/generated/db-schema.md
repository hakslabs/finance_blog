# Database Schema Notes

This is an initial domain sketch, not a final migration.

## Core Tables

- `profiles`: user profile and preferences.
- `watchlists`: user-owned watchlist containers.
- `watchlist_items`: symbols tracked by a user.
- `portfolios`: user-owned portfolio containers.
- `transactions`: buy, sell, dividend, cash, and adjustment records.
- `positions`: derived or snapshotted holdings.
- `investment_theses`: thesis notes, target conditions, and review state.
- `instruments`: stocks, ETFs, indexes, currencies, and macro symbols.
- `price_bars`: historical OHLCV data.
- `fundamentals`: financial statement and ratio data.
- `economic_events`: calendar events, releases, and indicators.
- `managers`: 13F investors or institutions.
- `filings_13f`: filing metadata.
- `filing_holdings`: 13F holding rows.
- `reports`: report metadata.
- `report_documents`: parsed text and source references.
- `report_summaries`: generated summaries and model metadata.
- `learning_articles`: financial statement, economic term, and investing study content.
- `ingestion_runs`: scheduled job status and provenance.

## Ownership

User-owned tables should include `user_id`. Public market/reference tables may not need user ownership but should still avoid unsafe write access.

## Portability Notes

Avoid coupling business logic to Supabase-specific client calls. Keep the app-level data contract in FastAPI/service modules so the database can later move to self-hosted infrastructure.

