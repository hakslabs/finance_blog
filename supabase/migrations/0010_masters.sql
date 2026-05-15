-- PR-24 / migration 0010: masters (schema only).
-- TIER-3.6 per schema-master-plan §2: investor masters and their static metadata.
-- Quarterly holdings reuse filings + filing_holdings from migration 0008 via a
-- master_filings view; no separate holdings table per the recorded decision.

create table if not exists public.masters (
  id           uuid primary key default extensions.gen_random_uuid(),
  slug         text not null,
  name         text not null,
  firm         text,
  country_code char(2),
  style        text,
  description  text,
  aum          numeric(24, 2),
  aum_currency char(3),
  birth_year   smallint,
  photo_url    text,
  homepage_url text,
  filer_cik    text,
  created_at   timestamptz not null default timezone('utc', now()),
  updated_at   timestamptz not null default timezone('utc', now()),
  constraint masters_slug_unique unique (slug),
  constraint masters_slug_not_blank check (length(trim(slug)) > 0),
  constraint masters_name_not_blank check (length(trim(name)) > 0),
  constraint masters_country_uppercase
    check (country_code is null or country_code = upper(country_code)),
  constraint masters_aum_currency_uppercase
    check (aum_currency is null or aum_currency = upper(aum_currency))
);

create index if not exists masters_filer_cik_idx on public.masters (filer_cik) where filer_cik is not null;

create trigger masters_set_updated_at
  before update on public.masters
  for each row execute function app_private.set_updated_at();

create table if not exists public.master_principles (
  master_id   uuid not null references public.masters(id) on delete cascade,
  ordinal     smallint not null,
  title       text not null,
  body        text,
  primary key (master_id, ordinal),
  constraint master_principles_ordinal_positive check (ordinal >= 1),
  constraint master_principles_title_not_blank check (length(trim(title)) > 0)
);

create table if not exists public.master_books (
  id         uuid primary key default extensions.gen_random_uuid(),
  master_id  uuid not null references public.masters(id) on delete cascade,
  ordinal    smallint not null,
  title      text not null,
  url        text,
  year       smallint,
  constraint master_books_unique_per_master unique (master_id, ordinal),
  constraint master_books_title_not_blank check (length(trim(title)) > 0)
);

create table if not exists public.master_strategies (
  master_id   uuid not null references public.masters(id) on delete cascade,
  ordinal     smallint not null,
  title       text not null,
  body        text,
  primary key (master_id, ordinal),
  constraint master_strategies_ordinal_positive check (ordinal >= 1),
  constraint master_strategies_title_not_blank check (length(trim(title)) > 0)
);

-- master_filings view: quarterly 13F changes by joining filings + filing_holdings
-- back to masters via filer_cik. Read-only; reuses existing RLS via underlying tables.
create or replace view public.master_filings as
select
  m.id              as master_id,
  m.slug            as master_slug,
  m.name            as master_name,
  f.id              as filing_id,
  f.period_end      as period_end,
  f.filed_at        as filed_at,
  fh.instrument_id  as instrument_id,
  fh.shares         as shares,
  fh.market_value   as market_value,
  fh.weight_pct     as weight_pct,
  fh.position_kind  as position_kind
from public.masters m
join public.filings f
  on f.form_kind = '13F'
 and f.filer_cik = m.filer_cik
 and m.filer_cik is not null
join public.filing_holdings fh
  on fh.filing_id = f.id;

comment on view public.master_filings is
  'TIER-3.6 derived view: quarterly 13F changes per master via filer_cik join.';

alter table public.masters            enable row level security;
alter table public.master_principles  enable row level security;
alter table public.master_books       enable row level security;
alter table public.master_strategies  enable row level security;

create policy "Masters are public read"            on public.masters           for select to anon, authenticated using (true);
create policy "Master principles are public read"  on public.master_principles for select to anon, authenticated using (true);
create policy "Master books are public read"       on public.master_books      for select to anon, authenticated using (true);
create policy "Master strategies are public read"  on public.master_strategies for select to anon, authenticated using (true);

grant select on table public.masters            to anon, authenticated;
grant select on table public.master_principles  to anon, authenticated;
grant select on table public.master_books       to anon, authenticated;
grant select on table public.master_strategies  to anon, authenticated;
grant select on public.master_filings           to anon, authenticated;
