-- PR-21 / migration 0007: fundamentals (schema only).
-- Adds TIER-3 derived-input tables per docs/design-docs/schema-master-plan.md §2:
--   - financial_statements + financial_lines (long format with line-code book)
--   - key_ratios_quarterly (wide cache derived from financial_lines)
--   - analyst_estimates + consensus_snapshots
--   - earnings_events
-- All public-read RLS + service-role writes. No row collection here.

create table if not exists public.financial_statements (
  id              uuid primary key default extensions.gen_random_uuid(),
  instrument_id   uuid not null references public.instruments(id) on delete cascade,
  statement_kind  text not null,
  period_kind     text not null,
  fiscal_year     smallint not null,
  fiscal_period   smallint not null,
  period_end      date not null,
  currency        char(3) not null,
  restated        boolean not null default false,
  source          text not null,
  ingested_at     timestamptz not null default timezone('utc', now()),
  constraint financial_statements_kind_check
    check (statement_kind in ('income', 'balance', 'cashflow')),
  constraint financial_statements_period_kind_check
    check (period_kind in ('quarterly', 'annual', 'ttm')),
  constraint financial_statements_fiscal_period_range
    check (fiscal_period between 0 and 4),
  constraint financial_statements_currency_uppercase
    check (currency = upper(currency)),
  constraint financial_statements_unique_period
    unique (instrument_id, statement_kind, period_kind, fiscal_year, fiscal_period)
);

create index if not exists financial_statements_instrument_period_idx
  on public.financial_statements (instrument_id, period_end desc);

create table if not exists public.financial_line_codes (
  code        text primary key,
  statement_kind text not null,
  name_ko     text not null,
  name_en     text not null,
  standard    text not null default 'GAAP',
  constraint financial_line_codes_kind_check
    check (statement_kind in ('income', 'balance', 'cashflow')),
  constraint financial_line_codes_standard_check
    check (standard in ('GAAP', 'IFRS', 'KIFRS', 'CUSTOM'))
);

create table if not exists public.financial_lines (
  statement_id uuid not null references public.financial_statements(id) on delete cascade,
  line_code    text not null references public.financial_line_codes(code) on delete restrict,
  value        numeric(24, 4),
  primary key (statement_id, line_code)
);

create index if not exists financial_lines_line_code_idx
  on public.financial_lines (line_code);

create table if not exists public.key_ratios_quarterly (
  instrument_id   uuid not null references public.instruments(id) on delete cascade,
  fiscal_year     smallint not null,
  fiscal_period   smallint not null,
  period_end      date not null,
  per             numeric(18, 6),
  pbr             numeric(18, 6),
  psr             numeric(18, 6),
  pcr             numeric(18, 6),
  roe             numeric(18, 6),
  roa             numeric(18, 6),
  debt_ratio      numeric(18, 6),
  current_ratio   numeric(18, 6),
  dividend_yield  numeric(18, 6),
  source          text not null,
  ingested_at     timestamptz not null default timezone('utc', now()),
  primary key (instrument_id, fiscal_year, fiscal_period),
  constraint key_ratios_quarterly_fiscal_period_range
    check (fiscal_period between 0 and 4)
);

create index if not exists key_ratios_quarterly_period_idx
  on public.key_ratios_quarterly (period_end desc);

create table if not exists public.analyst_estimates (
  id            uuid primary key default extensions.gen_random_uuid(),
  instrument_id uuid not null references public.instruments(id) on delete cascade,
  analyst       text not null,
  fiscal_year   smallint not null,
  fiscal_period smallint not null,
  metric        text not null,
  value         numeric(24, 6) not null,
  currency      char(3),
  rating        text,
  target_price  numeric(18, 6),
  asof          date not null,
  source        text not null,
  ingested_at   timestamptz not null default timezone('utc', now()),
  constraint analyst_estimates_fiscal_period_range
    check (fiscal_period between 0 and 4),
  constraint analyst_estimates_currency_uppercase
    check (currency is null or currency = upper(currency)),
  constraint analyst_estimates_metric_check
    check (metric in ('eps', 'revenue', 'ebitda', 'fcf', 'target_price', 'rating')),
  constraint analyst_estimates_unique unique (instrument_id, analyst, fiscal_year, fiscal_period, metric, asof)
);

create index if not exists analyst_estimates_instrument_asof_idx
  on public.analyst_estimates (instrument_id, asof desc);

create table if not exists public.consensus_snapshots (
  instrument_id uuid not null references public.instruments(id) on delete cascade,
  fiscal_year   smallint not null,
  fiscal_period smallint not null,
  metric        text not null,
  asof          date not null,
  mean          numeric(24, 6),
  median        numeric(24, 6),
  std           numeric(24, 6),
  n             smallint,
  source        text not null,
  ingested_at   timestamptz not null default timezone('utc', now()),
  primary key (instrument_id, fiscal_year, fiscal_period, metric, asof),
  constraint consensus_snapshots_fiscal_period_range
    check (fiscal_period between 0 and 4),
  constraint consensus_snapshots_metric_check
    check (metric in ('eps', 'revenue', 'ebitda', 'fcf', 'target_price'))
);

create index if not exists consensus_snapshots_asof_idx
  on public.consensus_snapshots (instrument_id, asof desc);

create table if not exists public.earnings_events (
  id            uuid primary key default extensions.gen_random_uuid(),
  instrument_id uuid not null references public.instruments(id) on delete cascade,
  fiscal_year   smallint not null,
  fiscal_period smallint not null,
  announced_at  timestamptz,
  period_end    date,
  eps_actual    numeric(18, 6),
  eps_consensus numeric(18, 6),
  revenue_actual  numeric(24, 4),
  revenue_consensus numeric(24, 4),
  surprise_pct  numeric(18, 6),
  guidance_change text,
  source        text not null,
  ingested_at   timestamptz not null default timezone('utc', now()),
  constraint earnings_events_unique unique (instrument_id, fiscal_year, fiscal_period),
  constraint earnings_events_fiscal_period_range
    check (fiscal_period between 0 and 4)
);

create index if not exists earnings_events_announced_idx
  on public.earnings_events (announced_at desc);

alter table public.financial_statements  enable row level security;
alter table public.financial_line_codes  enable row level security;
alter table public.financial_lines       enable row level security;
alter table public.key_ratios_quarterly  enable row level security;
alter table public.analyst_estimates     enable row level security;
alter table public.consensus_snapshots   enable row level security;
alter table public.earnings_events       enable row level security;

create policy "Financial statements are public read" on public.financial_statements
  for select to anon, authenticated using (true);
create policy "Financial line codes are public read" on public.financial_line_codes
  for select to anon, authenticated using (true);
create policy "Financial lines are public read" on public.financial_lines
  for select to anon, authenticated using (true);
create policy "Key ratios quarterly are public read" on public.key_ratios_quarterly
  for select to anon, authenticated using (true);
create policy "Analyst estimates are public read" on public.analyst_estimates
  for select to anon, authenticated using (true);
create policy "Consensus snapshots are public read" on public.consensus_snapshots
  for select to anon, authenticated using (true);
create policy "Earnings events are public read" on public.earnings_events
  for select to anon, authenticated using (true);

grant select on table public.financial_statements  to anon, authenticated;
grant select on table public.financial_line_codes  to anon, authenticated;
grant select on table public.financial_lines       to anon, authenticated;
grant select on table public.key_ratios_quarterly  to anon, authenticated;
grant select on table public.analyst_estimates     to anon, authenticated;
grant select on table public.consensus_snapshots   to anon, authenticated;
grant select on table public.earnings_events       to anon, authenticated;
