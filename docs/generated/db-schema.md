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

## PR-11 Landed Tables

Migration: `supabase/migrations/0002_portfolio.sql`

### `portfolios`

User-owned portfolio containers.

- `user_id` references `profiles(id)` with cascade delete.
- One primary portfolio per user, enforced by partial unique index `portfolios_one_primary_true_per_user`.
- Default currency `KRW`; constraint enforces uppercase ISO 4217.
- User-owned RLS identical to `watchlists`.

### `transactions`

Raw ledger of buys / sells / dividends / deposits.

- `portfolio_id` references `portfolios(id)` with cascade delete.
- `instrument_id` references `instruments(id)` with restrict delete; **nullable** so `dividend` / `deposit` rows can omit it.
- Check constraints: `type ∈ ('buy','sell','dividend','deposit')`; `buy`/`sell` require both an instrument and `quantity > 0, price >= 0`.
- Indexes on `(portfolio_id, occurred_at desc)` and `(instrument_id)` for the read patterns the holdings derivation uses.
- Insert/update/delete bumps the parent `portfolios.updated_at` via the `transactions_touch_parent` trigger, so the dashboard "last updated" can surface ledger churn.
- User-owned RLS inherited via the parent portfolio's owner.

### No `positions` Table

PR-11 deliberately ships **no** `positions` table. Holdings are derived in the FastAPI route from the transaction ledger using the average-cost method on every read:

- buys: `cost_basis += qty * price`; `quantity += qty`
- sells: `avg = cost_basis / quantity`; `cost_basis -= qty * avg`; `quantity -= qty`
- dividends / deposits: ignored for holdings; surfaced in `transactions[]`

This avoids trigger or cron complexity and keeps the derivation auditable against the raw ledger. Promote to a stored snapshot only when read latency or analytics needs justify it.

## PR-13 Landed Tables

Migration: `supabase/migrations/0003_prices_ingestion.sql`. Detailed design: `docs/design-docs/prices-ingestion-schema.md`.

### `price_bars_daily`

Persisted daily OHLCV per instrument.

- Composite primary key `(instrument_id, t)` doubles as the upsert key — ingestion uses PostgREST `Prefer: resolution=merge-duplicates`.
- `t` is a `date` (exchange-local trading session), not a `timestamptz`. KR and US sessions on the same calendar date are still distinct rows because `instrument_id` differs.
- `numeric(18, 6)` preserves cent precision and survives split-adjusted backfills.
- `source` column tracks which provider wrote the row (`polygon`, `alphavantage`, etc.) so the reconciliation job can re-fetch fallback rows from the primary provider.
- Public-read RLS (`select` to `anon` + `authenticated`); writes only via `service_role`.
- No partitioning until ~10M rows (current trajectory: ~14 MB/year for 720 symbols, so this is years away).

### `ingestion_runs`

Operational ledger for the cron-driven ingestion. One row per invocation.

- Inserted at job start in `running` state, transitioned to `succeeded` / `failed` / `partial` on finish. Crashes between insert and transition leave a `running` row, which is itself an alerting signal.
- `(job_name, started_at desc)` index supports the hot read: "latest run for this job".
- `select` to `authenticated`; no public write policies (only the cron's service-role calls write).
- No JSON metadata blob by design — extend with typed columns when something becomes load-bearing.

## Deferred Tables

These domains remain unmigrated: `positions` (intentionally not added — see PR-11 above), `investment_theses`, `fundamentals`, `economic_events`, `managers`, `filings_13f`, `filing_holdings`, `reports`, `report_documents`, `report_summaries`, `learning_articles`.

Add each table only when a later PR introduces the endpoint or data path that needs it.

## Portability Notes

Avoid coupling business logic to Supabase-specific client calls. Keep the app-level data contract in FastAPI service/repository modules so the database can later move to self-hosted infrastructure.
