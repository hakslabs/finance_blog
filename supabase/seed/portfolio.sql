-- PR-11: dev portfolio + sample transactions for verification.
-- Idempotent: re-running replaces the dev primary portfolio's rows.

with dev_profile as (
  select id from public.profiles
  where id = '00000000-0000-4000-8000-000000000001'
), upserted as (
  insert into public.portfolios (id, user_id, name, currency, is_primary)
  select '20000000-0000-4000-8000-000000000001', id, 'Primary Portfolio', 'USD', true
  from dev_profile
  on conflict (id) do update
    set name = excluded.name,
        currency = excluded.currency,
        is_primary = excluded.is_primary
  returning id
)
select * from upserted;

delete from public.transactions
where portfolio_id = '20000000-0000-4000-8000-000000000001';

with inst as (
  select symbol, id from public.instruments
)
insert into public.transactions
  (portfolio_id, instrument_id, type, quantity, price, amount, currency, note, occurred_at)
values
  ('20000000-0000-4000-8000-000000000001',
   (select id from inst where symbol = 'AAPL'),
   'buy', 10, 150.00, 1500.00, 'USD', 'Initial AAPL position', '2026-02-15'),
  ('20000000-0000-4000-8000-000000000001',
   (select id from inst where symbol = 'AAPL'),
   'buy', 5, 180.00, 900.00, 'USD', 'AAPL top-up', '2026-04-10'),
  ('20000000-0000-4000-8000-000000000001',
   (select id from inst where symbol = 'MSFT'),
   'buy', 8, 380.00, 3040.00, 'USD', 'MSFT entry', '2026-03-01'),
  ('20000000-0000-4000-8000-000000000001',
   (select id from inst where symbol = 'MSFT'),
   'sell', 3, 420.00, 1260.00, 'USD', 'MSFT trim', '2026-05-05'),
  ('20000000-0000-4000-8000-000000000001',
   (select id from inst where symbol = 'AAPL'),
   'dividend', 15, 0.24, 3.60, 'USD', 'AAPL Q1 dividend', '2026-04-15'),
  ('20000000-0000-4000-8000-000000000001',
   null,
   'deposit', null, null, 2000.00, 'USD', 'Monthly funding', '2026-05-01');
