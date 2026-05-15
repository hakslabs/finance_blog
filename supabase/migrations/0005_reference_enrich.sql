-- PR-19 / migration 0005: reference enrichment.
-- Adds the TIER-1 reference tables and instruments extensions documented in
-- docs/design-docs/schema-master-plan.md §2. Tables here back the wireframe
-- surfaces that today read from fixtures:
--   - sectors/instrument_sector: stock-detail "섹터 내 위치", analysis "섹터 흐름".
--   - indices/index_constituents: dashboard 핵심 지표 strip (KOSPI, S&P 500, …),
--     analysis 시장 한눈에 지수 strip.
--   - company_profiles: stock-detail 회사 개요 (CEO/HQ/IR/employees).
--   - instrument_aliases: ISIN/CUSIP/FIGI cross-vendor lookups for ingestion.
--   - instruments column extensions: industry/figi/cik/corp_code/delisted_at.
--
-- All TIER-1 tables are public-read reference data + service-role-write, matching
-- the pattern set by `instruments` in migration 0001. No user-owned rows here.

-- 1. instruments column extensions ------------------------------------------------

alter table public.instruments
  add column if not exists industry     text,
  add column if not exists figi         text,
  add column if not exists cik          text,
  add column if not exists corp_code    text,
  add column if not exists delisted_at  date;

create unique index if not exists instruments_figi_unique
  on public.instruments (figi)
  where figi is not null;

create unique index if not exists instruments_cik_unique
  on public.instruments (cik)
  where cik is not null;

create unique index if not exists instruments_corp_code_unique
  on public.instruments (corp_code)
  where corp_code is not null;

-- 2. sectors + instrument_sector --------------------------------------------------

create table if not exists public.sectors (
  id           uuid primary key default extensions.gen_random_uuid(),
  code         text not null,
  name_ko      text not null,
  name_en      text not null,
  parent_id    uuid references public.sectors(id) on delete restrict,
  classification text not null default 'GICS',
  created_at   timestamptz not null default timezone('utc', now()),
  updated_at   timestamptz not null default timezone('utc', now()),
  constraint sectors_code_not_blank check (length(trim(code)) > 0),
  constraint sectors_name_ko_not_blank check (length(trim(name_ko)) > 0),
  constraint sectors_name_en_not_blank check (length(trim(name_en)) > 0),
  constraint sectors_classification_check
    check (classification in ('GICS', 'KRX', 'CUSTOM')),
  constraint sectors_code_classification_unique unique (classification, code)
);

create index if not exists sectors_parent_id_idx on public.sectors (parent_id);

create trigger sectors_set_updated_at
  before update on public.sectors
  for each row execute function app_private.set_updated_at();

create table if not exists public.instrument_sector (
  instrument_id  uuid not null references public.instruments(id) on delete cascade,
  sector_id      uuid not null references public.sectors(id) on delete restrict,
  classification text not null default 'GICS',
  is_primary     boolean not null default true,
  created_at     timestamptz not null default timezone('utc', now()),
  updated_at     timestamptz not null default timezone('utc', now()),
  primary key (instrument_id, sector_id),
  constraint instrument_sector_classification_check
    check (classification in ('GICS', 'KRX', 'CUSTOM'))
);

create unique index if not exists instrument_sector_one_primary_per_instrument
  on public.instrument_sector (instrument_id)
  where is_primary;

create index if not exists instrument_sector_sector_id_idx
  on public.instrument_sector (sector_id);

create trigger instrument_sector_set_updated_at
  before update on public.instrument_sector
  for each row execute function app_private.set_updated_at();

-- 3. indices + index_constituents -------------------------------------------------

create table if not exists public.indices (
  id            uuid primary key default extensions.gen_random_uuid(),
  code          text not null,
  name_ko       text not null,
  name_en       text not null,
  country_code  char(2) not null,
  currency      char(3) not null,
  source        text,
  created_at    timestamptz not null default timezone('utc', now()),
  updated_at    timestamptz not null default timezone('utc', now()),
  constraint indices_code_not_blank check (length(trim(code)) > 0),
  constraint indices_name_ko_not_blank check (length(trim(name_ko)) > 0),
  constraint indices_name_en_not_blank check (length(trim(name_en)) > 0),
  constraint indices_country_code_uppercase check (country_code = upper(country_code)),
  constraint indices_currency_uppercase check (currency = upper(currency)),
  constraint indices_code_unique unique (code)
);

create trigger indices_set_updated_at
  before update on public.indices
  for each row execute function app_private.set_updated_at();

create table if not exists public.index_constituents (
  index_id      uuid not null references public.indices(id) on delete cascade,
  instrument_id uuid not null references public.instruments(id) on delete restrict,
  since         date not null,
  until         date,
  weight        numeric(10, 6),
  created_at    timestamptz not null default timezone('utc', now()),
  updated_at    timestamptz not null default timezone('utc', now()),
  constraint index_constituents_period_valid check (until is null or until >= since),
  constraint index_constituents_weight_range
    check (weight is null or (weight >= 0 and weight <= 100)),
  primary key (index_id, instrument_id, since)
);

create index if not exists index_constituents_instrument_id_idx
  on public.index_constituents (instrument_id);

create index if not exists index_constituents_active_idx
  on public.index_constituents (index_id)
  where until is null;

create trigger index_constituents_set_updated_at
  before update on public.index_constituents
  for each row execute function app_private.set_updated_at();

-- 4. company_profiles -------------------------------------------------------------

create table if not exists public.company_profiles (
  instrument_id uuid primary key references public.instruments(id) on delete cascade,
  description   text,
  ceo           text,
  founded_year  integer,
  employees     integer,
  hq_city       text,
  hq_country    char(2),
  website       text,
  ir_url        text,
  logo_url      text,
  created_at    timestamptz not null default timezone('utc', now()),
  updated_at    timestamptz not null default timezone('utc', now()),
  constraint company_profiles_employees_non_negative
    check (employees is null or employees >= 0),
  constraint company_profiles_founded_year_sane
    check (founded_year is null or (founded_year >= 1700 and founded_year <= extract(year from current_date)::int)),
  constraint company_profiles_hq_country_uppercase
    check (hq_country is null or hq_country = upper(hq_country))
);

create trigger company_profiles_set_updated_at
  before update on public.company_profiles
  for each row execute function app_private.set_updated_at();

-- 5. instrument_aliases -----------------------------------------------------------

create table if not exists public.instrument_aliases (
  id            uuid primary key default extensions.gen_random_uuid(),
  instrument_id uuid not null references public.instruments(id) on delete cascade,
  alias_kind    text not null,
  alias_value   text not null,
  source        text,
  created_at    timestamptz not null default timezone('utc', now()),
  updated_at    timestamptz not null default timezone('utc', now()),
  constraint instrument_aliases_kind_check
    check (alias_kind in ('isin', 'cusip', 'sedol', 'ric', 'bloomberg', 'symbol', 'name')),
  constraint instrument_aliases_value_not_blank
    check (length(trim(alias_value)) > 0),
  constraint instrument_aliases_kind_value_unique unique (alias_kind, alias_value)
);

create index if not exists instrument_aliases_instrument_id_idx
  on public.instrument_aliases (instrument_id);

create trigger instrument_aliases_set_updated_at
  before update on public.instrument_aliases
  for each row execute function app_private.set_updated_at();

-- 6. RLS + grants -----------------------------------------------------------------

alter table public.sectors             enable row level security;
alter table public.instrument_sector   enable row level security;
alter table public.indices             enable row level security;
alter table public.index_constituents  enable row level security;
alter table public.company_profiles    enable row level security;
alter table public.instrument_aliases  enable row level security;

create policy "Sectors are public read reference data"
  on public.sectors for select to anon, authenticated using (true);

create policy "Instrument-sector links are public read reference data"
  on public.instrument_sector for select to anon, authenticated using (true);

create policy "Indices are public read reference data"
  on public.indices for select to anon, authenticated using (true);

create policy "Index constituents are public read reference data"
  on public.index_constituents for select to anon, authenticated using (true);

create policy "Company profiles are public read reference data"
  on public.company_profiles for select to anon, authenticated using (true);

create policy "Instrument aliases are public read reference data"
  on public.instrument_aliases for select to anon, authenticated using (true);

grant select on table public.sectors            to anon, authenticated;
grant select on table public.instrument_sector  to anon, authenticated;
grant select on table public.indices            to anon, authenticated;
grant select on table public.index_constituents to anon, authenticated;
grant select on table public.company_profiles   to anon, authenticated;
grant select on table public.instrument_aliases to anon, authenticated;

comment on table public.sectors            is 'TIER-1 GICS/KRX sector taxonomy. Service-role writes; public read.';
comment on table public.instrument_sector  is 'TIER-1 mapping: each instrument carries one primary sector + optional secondaries.';
comment on table public.indices            is 'TIER-1 indices catalog (KOSPI, S&P 500, …). Separate from instruments per schema-master-plan decision 1.';
comment on table public.index_constituents is 'TIER-1 index membership with (since, until) periods for historical attribution.';
comment on table public.company_profiles   is 'TIER-1 1:1 enrichment for stock-kind instruments (CEO/HQ/IR/employees).';
comment on table public.instrument_aliases is 'TIER-1 cross-vendor identifier crosswalk (ISIN/CUSIP/FIGI/symbols).';
