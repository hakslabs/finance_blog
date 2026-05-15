-- Seed data for PR-08. Loaded by `supabase db reset` through supabase/config.toml.
-- The dev profile id must match VITE_DEV_USER_ID in .env during PR-09 local development.

insert into public.profiles (id, display_name, email, locale, timezone, preferences)
values (
  '00000000-0000-4000-8000-000000000001',
  'Finance Lab Developer',
  'developer@example.local',
  'ko-KR',
  'Asia/Seoul',
  '{"default_currency":"USD"}'::jsonb
)
on conflict (id) do update
set
  display_name = excluded.display_name,
  email = excluded.email,
  locale = excluded.locale,
  timezone = excluded.timezone,
  preferences = excluded.preferences;

insert into public.instruments (symbol, name, exchange, asset_type, country_code, currency, sector)
values
  ('AAPL', 'Apple Inc.', 'NASDAQ', 'stock', 'US', 'USD', 'Information Technology'),
  ('MSFT', 'Microsoft Corporation', 'NASDAQ', 'stock', 'US', 'USD', 'Information Technology'),
  ('SPY', 'SPDR S&P 500 ETF Trust', 'NYSEARCA', 'etf', 'US', 'USD', 'ETF'),
  ('005930.KS', 'Samsung Electronics Co., Ltd.', 'KRX', 'stock', 'KR', 'KRW', 'Information Technology')
on conflict (symbol, exchange) do update
set
  name = excluded.name,
  asset_type = excluded.asset_type,
  country_code = excluded.country_code,
  currency = excluded.currency,
  sector = excluded.sector,
  is_active = true;

insert into public.watchlists (id, user_id, name, description, is_primary)
values (
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'Primary Watchlist',
  'Seeded list for PR-09 local dashboard wiring.',
  true
)
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  is_primary = excluded.is_primary;

insert into public.watchlist_items (watchlist_id, instrument_id, position, note)
select
  '10000000-0000-4000-8000-000000000001',
  instruments.id,
  seed_items.position,
  seed_items.note
from (
  values
    ('AAPL', 'NASDAQ', 0, 'Earnings quality and buyback baseline.'),
    ('MSFT', 'NASDAQ', 1, 'Cloud and AI platform compounder.'),
    ('SPY', 'NYSEARCA', 2, 'US broad-market benchmark.'),
    ('005930.KS', 'KRX', 3, 'KR sample for selected Korean stock support.')
) as seed_items(symbol, exchange, position, note)
join public.instruments
  on instruments.symbol = seed_items.symbol
 and instruments.exchange = seed_items.exchange
on conflict (watchlist_id, instrument_id) do update
set
  position = excluded.position,
  note = excluded.note;
