-- 0025 / stock_calendar_events
--
-- Stores per-symbol calendar events: earnings (실적발표) and dividends
-- (배당락). Macro events stay in `economic_events` (mig 0009). The
-- unified /v1/calendar endpoint reads from both.
--
-- Why a single table for earnings + dividends:
--   The frontend always queries by date range and the row count per
--   symbol is small, so a single `event_type` discriminator is simpler
--   than two parallel tables. Type-specific fields are nullable (a
--   dividend has cash_amount but no eps_estimate; an earnings row is
--   the reverse).
--
-- Why no FK to instruments(symbol):
--   The ingest may land an earnings row before the symbol is
--   backfilled into `instruments`. Soft join only.

create table if not exists public.stock_calendar_events (
  id            uuid primary key default extensions.gen_random_uuid(),
  symbol        text not null,
  event_type    text not null check (event_type in ('earnings', 'dividend')),
  scheduled_at  timestamptz not null,

  -- earnings-specific
  fiscal_period text,
  eps_estimate  numeric(14, 4),
  eps_actual    numeric(14, 4),
  revenue_estimate numeric(20, 2),
  revenue_actual numeric(20, 2),

  -- dividend-specific
  cash_amount   numeric(14, 6),
  currency      char(3),
  declaration_date date,
  record_date   date,
  pay_date      date,

  importance    smallint check (importance is null or (importance between 1 and 3)),
  source        text not null,
  ingested_at   timestamptz not null default timezone('utc', now()),

  constraint stock_calendar_events_symbol_not_blank check (length(trim(symbol)) > 0),
  constraint stock_calendar_events_unique unique (source, symbol, event_type, scheduled_at)
);

create index if not exists stock_calendar_events_scheduled_idx
  on public.stock_calendar_events (scheduled_at);
create index if not exists stock_calendar_events_symbol_idx
  on public.stock_calendar_events (symbol);
create index if not exists stock_calendar_events_type_scheduled_idx
  on public.stock_calendar_events (event_type, scheduled_at);

alter table public.stock_calendar_events enable row level security;

create policy "Stock calendar events are public read"
  on public.stock_calendar_events for select to anon, authenticated using (true);

grant select on table public.stock_calendar_events to anon, authenticated;
