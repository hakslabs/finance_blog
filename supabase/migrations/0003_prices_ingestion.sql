-- PR-13: persisted daily OHLCV + ingestion ledger.
-- Design: docs/design-docs/prices-ingestion-schema.md.

create table public.price_bars_daily (
  instrument_id uuid not null references public.instruments(id) on delete cascade,
  t             date not null,
  o             numeric(18, 6) not null,
  h             numeric(18, 6) not null,
  l             numeric(18, 6) not null,
  c             numeric(18, 6) not null,
  v             bigint not null,
  source        text not null,
  ingested_at   timestamptz not null default timezone('utc', now()),
  primary key (instrument_id, t)
);

create index price_bars_daily_t_idx on public.price_bars_daily (t);

alter table public.price_bars_daily enable row level security;

create policy "Price bars are public read reference data"
  on public.price_bars_daily
  for select
  to anon, authenticated
  using (true);

grant select on table public.price_bars_daily to anon, authenticated;

create table public.ingestion_runs (
  id            uuid primary key default extensions.gen_random_uuid(),
  job_name      text not null,
  source        text not null,
  status        text not null,
  started_at    timestamptz not null default timezone('utc', now()),
  finished_at   timestamptz,
  symbols_seen  integer,
  rows_written  integer,
  error         text,
  constraint ingestion_runs_status_check
    check (status in ('running', 'succeeded', 'failed', 'partial'))
);

create index ingestion_runs_job_started_idx
  on public.ingestion_runs (job_name, started_at desc);

alter table public.ingestion_runs enable row level security;

create policy "Ingestion runs are visible to authenticated users"
  on public.ingestion_runs
  for select
  to authenticated
  using (true);

grant select on table public.ingestion_runs to authenticated;

comment on table public.price_bars_daily is 'Daily OHLCV per instrument. Composite PK (instrument_id, t) doubles as the upsert key. Source-tagged for fallback reconciliation.';
comment on table public.ingestion_runs is 'Operational ledger for scheduled ingestion. One row per cron invocation; surfaces last_refreshed_at to the UI.';
