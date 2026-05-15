-- Manual SQL RLS check for PR-08.
-- Run after migrations + seed on a Supabase local or remote database as an admin/postgres role.
-- The script rolls back its test rows and raises an exception if owner isolation fails.

begin;

create or replace function pg_temp.assert_eq(actual bigint, expected bigint, label text)
returns void
language plpgsql
as $$
begin
  if actual is distinct from expected then
    raise exception '% expected %, got %', label, expected, actual;
  end if;
end;
$$;

create or replace function pg_temp.assert_rls_blocks(statement text, label text)
returns void
language plpgsql
as $$
begin
  execute statement;
  raise exception '% expected RLS to block statement', label;
exception
  when insufficient_privilege then
    return;
end;
$$;

insert into public.profiles (id, display_name, email)
values
  ('00000000-0000-4000-8000-000000000101', 'RLS Owner A', 'owner-a@example.local'),
  ('00000000-0000-4000-8000-000000000102', 'RLS Owner B', 'owner-b@example.local');

insert into public.watchlists (id, user_id, name, is_primary)
values
  ('10000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000101', 'Owner A', true),
  ('10000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000102', 'Owner B', true);

insert into public.watchlist_items (watchlist_id, instrument_id, position)
select '10000000-0000-4000-8000-000000000101', id, 0
from public.instruments
where symbol = 'AAPL' and exchange = 'NASDAQ';

insert into public.watchlist_items (watchlist_id, instrument_id, position)
select '10000000-0000-4000-8000-000000000102', id, 0
from public.instruments
where symbol = 'MSFT' and exchange = 'NASDAQ';

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000101', true);

select pg_temp.assert_eq((select count(*) from public.profiles), 1, 'owner A profile visibility');
select pg_temp.assert_eq((select count(*) from public.watchlists), 1, 'owner A watchlist visibility');
select pg_temp.assert_eq((select count(*) from public.watchlist_items), 1, 'owner A watchlist item visibility');

select pg_temp.assert_eq(
  (
    select count(*)
    from public.watchlists
    where id = '10000000-0000-4000-8000-000000000102'
  ),
  0,
  'owner A cannot see owner B watchlist'
);

select pg_temp.assert_rls_blocks(
  $sql$
    insert into public.watchlist_items (watchlist_id, instrument_id, position)
    select '10000000-0000-4000-8000-000000000102', id, 1
    from public.instruments
    where symbol = 'SPY' and exchange = 'NYSEARCA'
  $sql$,
  'owner A insert into owner B list'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000102', true);

select pg_temp.assert_eq((select count(*) from public.watchlists), 1, 'owner B watchlist visibility');
select pg_temp.assert_eq((select count(*) from public.watchlist_items), 1, 'owner B watchlist item visibility');

reset role;
rollback;
