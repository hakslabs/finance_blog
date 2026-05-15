-- PR-20 / migration 0006: market-data extension (schema only).
-- Extends TIER-2 raw-ingest surface per docs/design-docs/schema-master-plan.md §2.
-- No data is collected here — those rows land later when the corresponding cron
-- jobs come online. This migration only locks the table shape so other modules
-- (analysis page, dashboard indicator strip, portfolio currency normalization)
-- can wire against stable identifiers.
--
-- Tables / columns:
--   1. price_bars_daily.adj_c          : adjusted-close column for total-return charts.
--   2. corporate_actions               : splits, dividends, mergers; feeds adj_c.
--   3. fx_rates_daily                  : currency-pair EOD rates; feeds portfolio normalization.
--   4. macro_series + macro_observations : macro indicators (CPI, FFR, VIX, V-KOSPI, …).
--   5. fear_greed_daily                : standalone single-series read-locality table.
--   6. index_bars_daily                : OHLC for index entities (separate from instruments).
--
-- All tables: composite/natural keys, `source text not null`, `ingested_at timestamptz`,
-- public-read RLS, service-role writes (matches price_bars_daily pattern).

-- 1. Adjusted close on existing OHLCV table --------------------------------------

alter table public.price_bars_daily
  add column if not exists adj_c numeric(18, 6);

comment on column public.price_bars_daily.adj_c is
  'Split/dividend-adjusted close (populated by adj_c recomputation after corporate_actions changes).';

-- 2. Corporate actions ------------------------------------------------------------

create table if not exists public.corporate_actions (
  id              uuid primary key default extensions.gen_random_uuid(),
  instrument_id   uuid not null references public.instruments(id) on delete cascade,
  action_kind     text not null,
  ex_date         date not null,
  record_date     date,
  payable_date    date,
  ratio           numeric(18, 8),
  cash_amount     numeric(18, 6),
  currency        char(3),
  source          text not null,
  ingested_at     timestamptz not null default timezone('utc', now()),
  constraint corporate_actions_kind_check
    check (action_kind in ('split', 'reverse_split', 'cash_dividend', 'stock_dividend', 'merger', 'spinoff', 'rights')),
  constraint corporate_actions_currency_uppercase
    check (currency is null or currency = upper(currency)),
  constraint corporate_actions_unique_per_event
    unique (instrument_id, action_kind, ex_date)
);

create index if not exists corporate_actions_instrument_ex_date_idx
  on public.corporate_actions (instrument_id, ex_date desc);

-- 3. FX rates ---------------------------------------------------------------------

create table if not exists public.fx_rates_daily (
  base_currency  char(3) not null,
  quote_currency char(3) not null,
  t              date not null,
  rate           numeric(18, 8) not null,
  source         text not null,
  ingested_at    timestamptz not null default timezone('utc', now()),
  primary key (base_currency, quote_currency, t),
  constraint fx_rates_daily_base_uppercase  check (base_currency  = upper(base_currency)),
  constraint fx_rates_daily_quote_uppercase check (quote_currency = upper(quote_currency)),
  constraint fx_rates_daily_rate_positive   check (rate > 0),
  constraint fx_rates_daily_distinct_pair   check (base_currency <> quote_currency)
);

create index if not exists fx_rates_daily_t_idx on public.fx_rates_daily (t);

-- 4. Macro series + observations --------------------------------------------------

create table if not exists public.macro_series (
  id          uuid primary key default extensions.gen_random_uuid(),
  code        text not null,
  name_ko     text not null,
  name_en     text not null,
  frequency   text not null,
  unit        text,
  source      text not null,
  created_at  timestamptz not null default timezone('utc', now()),
  updated_at  timestamptz not null default timezone('utc', now()),
  constraint macro_series_code_unique unique (code),
  constraint macro_series_frequency_check
    check (frequency in ('daily', 'weekly', 'monthly', 'quarterly', 'annual', 'irregular')),
  constraint macro_series_code_not_blank check (length(trim(code)) > 0)
);

create trigger macro_series_set_updated_at
  before update on public.macro_series
  for each row execute function app_private.set_updated_at();

create table if not exists public.macro_observations (
  series_id    uuid not null references public.macro_series(id) on delete cascade,
  t            date not null,
  value        numeric(20, 8) not null,
  source       text not null,
  ingested_at  timestamptz not null default timezone('utc', now()),
  primary key (series_id, t)
);

create index if not exists macro_observations_t_idx
  on public.macro_observations (t);

-- 5. Fear & Greed (single-series read-locality table) ----------------------------

create table if not exists public.fear_greed_daily (
  t            date primary key,
  value        smallint not null,
  classification text,
  source       text not null,
  ingested_at  timestamptz not null default timezone('utc', now()),
  constraint fear_greed_daily_value_range check (value between 0 and 100)
);

-- 6. Index OHLC bars -------------------------------------------------------------
-- Indices live in a separate catalog (see migration 0005). Their level series
-- mirrors price_bars_daily but keys off indices(id) so cross-vendor backfills
-- don't have to round-trip through `instruments`.

create table if not exists public.index_bars_daily (
  index_id     uuid not null references public.indices(id) on delete cascade,
  t            date not null,
  o            numeric(18, 6) not null,
  h            numeric(18, 6) not null,
  l            numeric(18, 6) not null,
  c            numeric(18, 6) not null,
  v            bigint,
  source       text not null,
  ingested_at  timestamptz not null default timezone('utc', now()),
  primary key (index_id, t),
  constraint index_bars_daily_high_dominates check (h >= greatest(o, c, l)),
  constraint index_bars_daily_low_dominates  check (l <= least(o, c, h)),
  constraint index_bars_daily_volume_non_negative check (v is null or v >= 0)
);

create index if not exists index_bars_daily_t_idx on public.index_bars_daily (t);

-- 7. RLS + grants -----------------------------------------------------------------

alter table public.corporate_actions   enable row level security;
alter table public.fx_rates_daily      enable row level security;
alter table public.macro_series        enable row level security;
alter table public.macro_observations  enable row level security;
alter table public.fear_greed_daily    enable row level security;
alter table public.index_bars_daily    enable row level security;

create policy "Corporate actions are public read reference data"
  on public.corporate_actions for select to anon, authenticated using (true);

create policy "FX rates are public read reference data"
  on public.fx_rates_daily for select to anon, authenticated using (true);

create policy "Macro series are public read reference data"
  on public.macro_series for select to anon, authenticated using (true);

create policy "Macro observations are public read reference data"
  on public.macro_observations for select to anon, authenticated using (true);

create policy "Fear-greed daily is public read reference data"
  on public.fear_greed_daily for select to anon, authenticated using (true);

create policy "Index bars daily are public read reference data"
  on public.index_bars_daily for select to anon, authenticated using (true);

grant select on table public.corporate_actions  to anon, authenticated;
grant select on table public.fx_rates_daily     to anon, authenticated;
grant select on table public.macro_series       to anon, authenticated;
grant select on table public.macro_observations to anon, authenticated;
grant select on table public.fear_greed_daily   to anon, authenticated;
grant select on table public.index_bars_daily   to anon, authenticated;

comment on table public.corporate_actions  is 'TIER-2 raw: splits/dividends/mergers; feeds adj_c recomputation.';
comment on table public.fx_rates_daily     is 'TIER-2 raw: EOD currency-pair rates for portfolio currency normalization.';
comment on table public.macro_series       is 'TIER-2 catalog: macro indicator definitions (CPI, FFR, VIX, V-KOSPI, …).';
comment on table public.macro_observations is 'TIER-2 raw: macro observation per (series_id, t).';
comment on table public.fear_greed_daily   is 'TIER-2 raw: CNN Fear & Greed daily series; standalone for read locality.';
comment on table public.index_bars_daily   is 'TIER-2 raw: OHLC for index entities. Separate from price_bars_daily per schema-master-plan decision 1.';

-- 8. Seed minimal index catalog --------------------------------------------------
-- Just the identifiers needed by the dashboard / analysis page (KOSPI, S&P 500,
-- KOSDAQ, NASDAQ Composite, KOSPI 200). No bars are loaded — purely so other code
-- can resolve `indices.code` → uuid without waiting for the bars ingestion PR.

insert into public.indices (code, name_ko, name_en, country_code, currency, source)
values
  ('KOSPI',     '코스피',           'KOSPI',            'KR', 'KRW', 'krx'),
  ('KOSPI200',  '코스피 200',       'KOSPI 200',        'KR', 'KRW', 'krx'),
  ('KOSDAQ',    '코스닥',           'KOSDAQ',           'KR', 'KRW', 'krx'),
  ('SPX',       'S&P 500',          'S&P 500',          'US', 'USD', 'polygon'),
  ('NDX',       '나스닥 100',       'NASDAQ 100',       'US', 'USD', 'polygon'),
  ('IXIC',      '나스닥 종합',      'NASDAQ Composite', 'US', 'USD', 'polygon'),
  ('DJI',       '다우존스',         'Dow Jones Industrial Average', 'US', 'USD', 'polygon')
on conflict (code) do nothing;
