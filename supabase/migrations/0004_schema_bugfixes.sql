-- PR-18 / migration 0004: schema bug fixes carried from docs/design-docs/schema-master-plan.md §8.
-- Five corrections, all backward-compatible with existing data:
--   1. watchlist_items_unique_position → deferrable initially deferred so reorder swaps don't fail.
--   2. profiles.id → FK to auth.users(id) on delete cascade (PR-08 deferred this pending PR-14).
--   3. transactions.amount → consistency check vs quantity*price for buy/sell rows.
--   4. transactions.instrument_id → null only allowed for 'deposit' rows.
--   5. price_bars_daily → OHLC sanity checks (h >= max(o,c,l), l <= min(o,c,h), v >= 0).

-- 1. Watchlist position uniqueness must defer to end-of-statement so two-row swap updates pass.
alter table public.watchlist_items
  drop constraint if exists watchlist_items_unique_position;

alter table public.watchlist_items
  add constraint watchlist_items_unique_position
  unique (watchlist_id, position)
  deferrable initially deferred;

-- 2. Tie profiles.id to auth.users(id). Existing profile rows that have no matching
--    auth.users row would block this — they shouldn't exist in production (PR-14 dropped
--    the dev-header path) but we guard against orphaned dev rows by deleting them first.
delete from public.profiles
  where id not in (select id from auth.users);

alter table public.profiles
  drop constraint if exists profiles_id_fkey;

alter table public.profiles
  add constraint profiles_id_fkey
  foreign key (id) references auth.users(id) on delete cascade;

comment on table public.profiles is
  'Auth-ready user profile rows; profiles.id FKs to auth.users(id) since PR-18.';

-- 3 & 4. Tighten transactions constraints.
-- Existing constraints to keep:
--   - transactions_trade_requires_instrument: buy/sell require instrument_id.
--   - transactions_trade_requires_qty_price:  buy/sell require qty>0 and price>=0.
-- New constraint: amount must equal quantity*price for buy/sell (within rounding tolerance).
-- New constraint: only 'deposit' rows may have instrument_id null.
alter table public.transactions
  drop constraint if exists transactions_amount_matches_qty_price;

alter table public.transactions
  add constraint transactions_amount_matches_qty_price
  check (
    type not in ('buy', 'sell')
    or quantity is null
    or price is null
    or abs(amount - quantity * price) <= 0.01
  );

alter table public.transactions
  drop constraint if exists transactions_instrument_required_unless_deposit;

alter table public.transactions
  add constraint transactions_instrument_required_unless_deposit
  check (type = 'deposit' or instrument_id is not null);

-- 5. OHLC sanity checks on the daily bars table.
alter table public.price_bars_daily
  drop constraint if exists price_bars_daily_high_dominates;

alter table public.price_bars_daily
  add constraint price_bars_daily_high_dominates
  check (h >= greatest(o, c, l));

alter table public.price_bars_daily
  drop constraint if exists price_bars_daily_low_dominates;

alter table public.price_bars_daily
  add constraint price_bars_daily_low_dominates
  check (l <= least(o, c, h));

alter table public.price_bars_daily
  drop constraint if exists price_bars_daily_volume_non_negative;

alter table public.price_bars_daily
  add constraint price_bars_daily_volume_non_negative
  check (v >= 0);
