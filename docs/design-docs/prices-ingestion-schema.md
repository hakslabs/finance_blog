# Prices & Ingestion Schema — Forward Design Sketch

Forward-looking design for the tables that will accumulate stock data and the operational rows that track ingestion. **No migration ships from this doc.** The actual SQL lands per the EP-0001 staging rule: `price_bars_daily` with PR-10, `ingestion_runs` with PR-13. This file exists so the operational shape is decided once, before either PR opens, so reviews on those PRs argue about implementation not design.

Inputs that anchor the shape:

- Universe: ~520 US + ~200 KR = ~720 symbols, EOD only (`docs/design-docs/data-sources.md`).
- Daily cron cost: 1 Polygon grouped-daily + 1–2 KRX calls. **Bulk writes per day, not per-symbol writes.**
- Backfill: 2 years × 720 symbols ≈ 360k rows one-time.
- Free-tier storage budget: 500 MB. Annual growth ~18 MB. Storage is not the binding constraint; **query latency on the stock detail page is.**
- Read pattern (PR-10): `GET /v1/quotes/{symbol}` returns the latest close + `range` (default 6mo) of daily bars for one symbol. So the hot query is `WHERE instrument_id = ? AND t BETWEEN ? AND ? ORDER BY t`.

## `price_bars_daily` (PR-10)

The single OHLCV table for the MVP. Daily granularity only — intraday is explicitly out of scope per `data-sources.md`.

```sql
create table public.price_bars_daily (
  instrument_id uuid not null references public.instruments(id) on delete cascade,
  t             date not null,                       -- trading session date in instrument-local exchange tz
  o             numeric(18, 6) not null,
  h             numeric(18, 6) not null,
  l             numeric(18, 6) not null,
  c             numeric(18, 6) not null,
  v             bigint not null,
  source        text not null,                       -- 'polygon' | 'alphavantage' | 'krx' | 'pykrx'
  ingested_at   timestamptz not null default timezone('utc', now()),
  primary key (instrument_id, t)
);

create index price_bars_daily_t_idx on public.price_bars_daily (t);
```

Design choices and the reasoning behind each:

- **Composite PK `(instrument_id, t)`** — natural key, also gives a clustered-style ordering on disk so the `WHERE instrument_id = ? ORDER BY t` query is a single index range scan. No surrogate `id uuid` because nothing references this row.
- **`t date`, not `timestamptz`** — daily bars are calendar-day facts, not instants. KR and US sessions on the same calendar `t` are still different rows because `instrument_id` differs.
- **`numeric(18,6)`** — preserves cent precision and survives split-adjusted backfills. `float8` would work for charts but loses on aggregation.
- **`source text`** — tracks which provider wrote the row. Required for the fallback story: if Alpha Vantage tops up a Polygon gap, we need to know that row is from the fallback so PR-13's reconciliation can re-fetch it.
- **`ingested_at`** — separate from `t`. Lets us answer "when did we learn this bar?" without joining `ingestion_runs`. Cheap and removes one common join.
- **No `adj_close`** — out of scope for MVP per the spec; Polygon's `adjusted=true` flag returns adjusted OHLC directly, so we store the adjusted values and document `source` semantics rather than carrying both. If/when corporate actions become a feature, add an `adj_*` set of columns then.
- **Upsert key** is the PK. Daily cron uses `INSERT ... ON CONFLICT (instrument_id, t) DO UPDATE SET ...` so re-runs of the same day are idempotent (important for retry and for the case where the EOD bar is corrected the next morning).
- **No partitioning in MVP.** Math: 720 symbols × 250 days/year × ~80 B row ≈ 14 MB/year. Partitioning by year buys nothing at this volume and adds operational surface (constraint exclusion, partition maintenance). Revisit when the table crosses ~10 M rows or when intraday is added. Document the trigger so future-us doesn't agonize over it.
- **Secondary index `(t)`** — supports the "give me the latest grouped-daily batch we wrote" read used by ingestion verification and the future market-overview screen. Not strictly required for PR-10 itself but cheap.

### RLS

- `select` to `anon, authenticated` — prices are public reference data, same posture as `instruments`.
- No insert/update/delete policies; only `service_role` writes (via the backend ingestion job).

### Why this is a separate table from `instruments`

`instruments` is slowly-changing reference data (~720 rows, hand-curated). `price_bars_daily` grows daily. Mixing them would force every read of an instrument to scan past its history. Separation is obvious here; calling it out so the review of PR-10 doesn't relitigate it.

## `ingestion_runs` (PR-13)

Operational table. One row per scheduled job invocation. The dashboard's `last_refreshed_at` chip reads from this; the cron's failure path also writes here, so the UI degrades to "stale, last good at X" without crashing.

```sql
create table public.ingestion_runs (
  id            uuid primary key default extensions.gen_random_uuid(),
  job_name      text not null,                       -- 'us_grouped_daily' | 'kr_kospi200_daily' | ...
  source        text not null,                       -- provider tag, matches price_bars_daily.source
  status        text not null,                       -- 'running' | 'succeeded' | 'failed' | 'partial'
  started_at    timestamptz not null default timezone('utc', now()),
  finished_at   timestamptz,
  symbols_seen  integer,                             -- rows in the provider payload before filter
  rows_written  integer,                             -- rows upserted into price_bars_daily
  error         text,                                -- short reason, no stack
  constraint ingestion_runs_status_check
    check (status in ('running', 'succeeded', 'failed', 'partial'))
);

create index ingestion_runs_job_started_idx
  on public.ingestion_runs (job_name, started_at desc);
```

Design choices:

- **`status` enum-as-check** instead of a Postgres enum type — easier to extend in a later migration without `ALTER TYPE`. The set is small and stable.
- **`started_at` / `finished_at` both nullable-by-meaning** — `started_at` is set when we insert the row in `running` state, `finished_at` is set on transition. A row stuck in `running` for >1h is itself a signal (alerting hook for post-MVP).
- **No JSON metadata blob.** Tempting, but it grows into a debugging crutch. If a job needs structured detail, add a typed column. Keep the row narrow.
- **`source` redundant with `job_name`?** Not quite — `job_name` is the logical job ("US EOD refresh"), `source` is the provider that actually served the data on this run. They diverge when the fallback fires, and that's exactly when we want to know.
- **Index on `(job_name, started_at desc)`** — the only hot query is "give me the latest run for job X" (used by the dashboard chip and by the cron itself to compute the next backfill window).
- **RLS:** `select` to `authenticated` (so the UI can read its own freshness), no write policies; only `service_role` writes.
- **Pruning:** keep all rows in MVP. ~3 jobs/day × 365 = ~1k rows/year. Prune at 100k+ rows or after 2 years, whichever first; codify when it matters, not now.

### Why the cron writes a row before doing the work

A row inserted in `running` state up-front means:

1. Crash mid-run still leaves a trace. Without this we'd have silent failures whenever the process dies between fetch and insert.
2. The dashboard's "last attempt" chip can show "running since X" honestly.
3. The success path is one UPDATE, not an insert that races the next cron tick.

## Operational concerns answered now

These are the questions a future-PR review would otherwise raise; pinning answers here:

- **Backfill strategy.** A separate `python -m app.jobs.backfill --from 2024-01-01 --to 2025-12-31` script that writes to the same `price_bars_daily` table and emits `ingestion_runs` rows tagged `job_name='us_backfill'`. The schedule cron and the backfill cron are the same code path with different date windows; same upsert semantics make this safe.
- **Idempotency.** Re-running any job for any window is safe because of the `(instrument_id, t)` upsert. The cron does not need to know the last-success watermark; it computes the target window from "yesterday's session date" and runs.
- **Multi-source row provenance.** When Alpha Vantage tops up a Polygon gap, the row's `source` flips to `alphavantage`. The reconciliation job (post-MVP) walks rows where `source != 'polygon'` and tries to re-fetch from primary. Documented so we don't need a separate "fallback rows" table.
- **Time zone.** `t date` is the **exchange-local trading date**. `AAPL` 2026-05-14 in US/Eastern and `005930.KS` 2026-05-14 in Asia/Seoul both stored as `2026-05-14`. The instrument-local interpretation lives in the application layer; the DB only stores the calendar date. This avoids a class of off-by-one bugs around UTC midnight.
- **Stock splits / dividends.** Out of scope. Polygon returns split-adjusted bars when requested; we store those. When/if a corporate-actions feature lands, add columns rather than a new table — the split factor applies per `(instrument_id, t)` which is the existing PK.
- **Why not a TimescaleDB hypertable.** Free Supabase doesn't include Timescale, and the query volume doesn't need it. The table shape (composite PK on `(entity_id, time)`) is the same shape Timescale would impose, so a future migration to a hypertable is a `CREATE TABLE ... AS SELECT` away.
- **Sequencing in the read path.** `GET /v1/quotes/{symbol}` in PR-10 starts as in-process TTL over the provider; **it does not read from `price_bars_daily`**. The table starts empty and only gets populated when PR-13 lands the cron. PR-10's job is just to ship the table so PR-13 can write to it.

## What this doc does NOT decide

Listed so the staged-schema convention is respected:

- `corporate_actions` shape — wait until a feature needs it.
- `intraday_bars` — explicitly out of scope; revisit only if real-time scope changes.
- `portfolios`, `transactions`, `positions` — PR-11 owns these and they're independent of prices.
- 13F / filings tables — post-MVP.
- Materialized views for "latest close per instrument" — not needed until the watchlist starts joining live prices; revisit when it does.

## Triggers to revise this doc

Revise (don't extend silently) when any of these become true:

- `price_bars_daily` crosses 10 M rows → reconsider partitioning.
- Intraday data is added to scope → new table, not a column on the daily one.
- A second non-OHLCV time-series enters scope (e.g. macro indicators) → consider a `timeseries(domain, key, t, value)` shape rather than a third bespoke table.
- Provider count grows past three → consider promoting `source` to a typed reference table.
