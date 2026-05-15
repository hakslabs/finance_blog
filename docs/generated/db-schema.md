# Database Schema Notes

This document tracks the schema that has actually landed. Future domain sketches stay in the execution plan until a migration needs them.

## PR-08 Landed Tables

Migration: `supabase/migrations/0001_mvp_foundation.sql`

### `profiles`

Auth-ready user profile rows keyed by `id uuid`.

- Seeded dev row: `00000000-0000-4000-8000-000000000001`.
- No foreign key to `auth.users` yet. This is intentional so the PR-09 `X-Dev-User` flow can verify a seeded profile before PR-14 Supabase Auth lands.
- User-owned RLS: `authenticated` can select/insert/update only `id = auth.uid()`.

### `instruments`

Public reference table for stocks, ETFs, indexes, currencies, and macro symbols.

- Unique key: `(symbol, exchange)`.
- Seeded instruments: `AAPL`, `MSFT`, `SPY`, `005930.KS`.
- RLS is enabled. `anon` and `authenticated` have read-only access; writes remain backend/admin only.

### `watchlists`

User-owned watchlist containers.

- `user_id` references `profiles(id)` with cascade delete.
- MVP uses one primary list per user, enforced by `watchlists_one_primary_true_per_user`.
- User-owned RLS: `authenticated` can select/insert/update/delete only rows where `user_id = auth.uid()`.

### `watchlist_items`

Rows linking a watchlist to normalized instruments.

- `watchlist_id` references `watchlists(id)` with cascade delete.
- `instrument_id` references `instruments(id)` with restrict delete.
- Unique keys prevent duplicate instruments and duplicate positions inside one watchlist.
- User-owned RLS is inherited through the parent watchlist owner.
- Insert/update/delete touches the parent `watchlists.updated_at`, which PR-09 can expose as the dashboard watchlist timestamp.

## Grants And RLS

Supabase no longer guarantees new public tables are exposed to the Data API by default. PR-08 therefore includes explicit grants in the migration:

- `instruments`: `select` to `anon` and `authenticated`.
- `profiles`, `watchlists`, `watchlist_items`: `select`, `insert`, `update`, `delete` to `authenticated`.
- `service_role`: all privileges on public tables for backend/admin operations only.

All public tables have RLS enabled. There are no public write policies.

## Seed And Verification

- Seed file: `supabase/seed/instruments.sql`.
- RLS SQL check: `supabase/tests/rls_watchlists.sql`.
- Local reset: `npx supabase start && npx supabase db reset`.

## Deferred Tables

These domains are intentionally not migrated in PR-08: `portfolios`, `transactions`, `positions`, `investment_theses`, `price_bars`, `fundamentals`, `economic_events`, `managers`, `filings_13f`, `filing_holdings`, `reports`, `report_documents`, `report_summaries`, `learning_articles`, and `ingestion_runs`.

Add each table only when a later PR introduces the endpoint or data path that needs it.

## Portability Notes

Avoid coupling business logic to Supabase-specific client calls. Keep the app-level data contract in FastAPI service/repository modules so the database can later move to self-hosted infrastructure.
