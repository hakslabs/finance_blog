-- PR-22 / migration 0008: filings & holdings (schema only).
-- TIER-3 raw filings + derived holdings per schema-master-plan §2.
--   - filings: SEC EDGAR + DART headers (10-K/10-Q/8-K/13F/DART/etc.)
--   - filing_holdings: 13F line items; joins back up to master_filings view in PR-24.
--   - institutional_holders: latest per-holder snapshot per instrument.
--   - insider_trades: Form 4 / DART insider equivalent.
-- Public-read RLS + service-role writes.

create table if not exists public.filings (
  id             uuid primary key default extensions.gen_random_uuid(),
  filer_kind     text not null,
  filer_name     text not null,
  filer_cik      text,
  filer_corp_code text,
  instrument_id  uuid references public.instruments(id) on delete set null,
  form_kind      text not null,
  accession_no   text,
  filed_at       timestamptz not null,
  period_end     date,
  source         text not null,
  url            text,
  summary        text,
  ingested_at    timestamptz not null default timezone('utc', now()),
  constraint filings_filer_kind_check
    check (filer_kind in ('issuer', 'institution', 'insider', 'other')),
  constraint filings_form_kind_check
    check (form_kind in ('10K','10Q','8K','13F','13D','13G','S-1','S-4','DEF14A','4','DART','OTHER')),
  constraint filings_filer_name_not_blank check (length(trim(filer_name)) > 0),
  constraint filings_unique_accession unique (source, accession_no)
);

create index if not exists filings_instrument_filed_idx
  on public.filings (instrument_id, filed_at desc);
create index if not exists filings_form_kind_idx
  on public.filings (form_kind);
create index if not exists filings_filer_cik_idx
  on public.filings (filer_cik) where filer_cik is not null;

create table if not exists public.filing_holdings (
  filing_id      uuid not null references public.filings(id) on delete cascade,
  instrument_id  uuid not null references public.instruments(id) on delete restrict,
  shares         numeric(24, 4) not null,
  market_value   numeric(24, 4),
  currency       char(3),
  weight_pct     numeric(10, 6),
  position_kind  text not null default 'long',
  reported_at    date,
  primary key (filing_id, instrument_id),
  constraint filing_holdings_position_kind_check
    check (position_kind in ('long', 'short', 'put', 'call')),
  constraint filing_holdings_currency_uppercase
    check (currency is null or currency = upper(currency)),
  constraint filing_holdings_weight_range
    check (weight_pct is null or (weight_pct >= 0 and weight_pct <= 100))
);

create index if not exists filing_holdings_instrument_idx
  on public.filing_holdings (instrument_id);

create table if not exists public.institutional_holders (
  instrument_id uuid not null references public.instruments(id) on delete cascade,
  holder_name   text not null,
  holder_cik    text,
  asof          date not null,
  shares        numeric(24, 4) not null,
  ownership_pct numeric(10, 6),
  value         numeric(24, 4),
  currency      char(3),
  source        text not null,
  ingested_at   timestamptz not null default timezone('utc', now()),
  primary key (instrument_id, holder_name, asof),
  constraint institutional_holders_currency_uppercase
    check (currency is null or currency = upper(currency)),
  constraint institutional_holders_ownership_range
    check (ownership_pct is null or (ownership_pct >= 0 and ownership_pct <= 100))
);

create index if not exists institutional_holders_asof_idx
  on public.institutional_holders (instrument_id, asof desc);

create table if not exists public.insider_trades (
  id            uuid primary key default extensions.gen_random_uuid(),
  instrument_id uuid not null references public.instruments(id) on delete cascade,
  person        text not null,
  role          text,
  trade_kind    text not null,
  shares        numeric(24, 4) not null,
  price         numeric(18, 6),
  value         numeric(24, 4),
  currency      char(3),
  traded_at     date not null,
  filed_at      timestamptz,
  filing_id     uuid references public.filings(id) on delete set null,
  source        text not null,
  ingested_at   timestamptz not null default timezone('utc', now()),
  constraint insider_trades_trade_kind_check
    check (trade_kind in ('buy', 'sell', 'option_exercise', 'grant', 'other')),
  constraint insider_trades_currency_uppercase
    check (currency is null or currency = upper(currency))
);

create index if not exists insider_trades_instrument_traded_idx
  on public.insider_trades (instrument_id, traded_at desc);

alter table public.filings              enable row level security;
alter table public.filing_holdings      enable row level security;
alter table public.institutional_holders enable row level security;
alter table public.insider_trades       enable row level security;

create policy "Filings are public read"          on public.filings              for select to anon, authenticated using (true);
create policy "Filing holdings are public read"  on public.filing_holdings      for select to anon, authenticated using (true);
create policy "Institutional holders are public read" on public.institutional_holders for select to anon, authenticated using (true);
create policy "Insider trades are public read"   on public.insider_trades       for select to anon, authenticated using (true);

grant select on table public.filings              to anon, authenticated;
grant select on table public.filing_holdings      to anon, authenticated;
grant select on table public.institutional_holders to anon, authenticated;
grant select on table public.insider_trades       to anon, authenticated;
