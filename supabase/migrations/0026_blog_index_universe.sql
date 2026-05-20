-- 0026 / blog_index_universe
--
-- Junction table for index membership. The blog only covers stocks
-- that sit in one of three indexes: KOSPI200, NASDAQ100, S&P 500.
-- Stock-event ingest scripts (Finnhub earnings, Polygon dividends,
-- DART filings) and `/v1/search` filter against this table before
-- writing/returning rows.
--
-- Why a junction (not a column on `instruments`):
--   A symbol can belong to multiple indexes simultaneously (e.g. AAPL
--   is in both NASDAQ100 and S&P500). A `text[]` column would work but
--   a junction is easier to seed incrementally and gives us a clean
--   "is X in any of the blog universe" query: EXISTS (...).

create table if not exists public.blog_index_universe (
  index_code  text not null check (index_code in ('SP500', 'NDX', 'KOSPI200')),
  symbol      text not null,
  name        text,
  added_at    timestamptz not null default timezone('utc', now()),
  primary key (index_code, symbol),
  constraint blog_index_universe_symbol_not_blank check (length(trim(symbol)) > 0)
);

create index if not exists blog_index_universe_symbol_idx
  on public.blog_index_universe (symbol);

alter table public.blog_index_universe enable row level security;

create policy "Index constituents are public read"
  on public.blog_index_universe for select to anon, authenticated using (true);

grant select on table public.blog_index_universe to anon, authenticated;
