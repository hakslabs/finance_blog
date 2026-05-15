-- PR-11: portfolio data path.
-- Adds portfolios + transactions for the dev user's /portfolio page.
-- Positions are NOT stored; the backend derives holdings from
-- transactions on read using the average-cost method. See
-- docs/design-docs/prices-ingestion-schema.md for the separate
-- price_bars_daily decision (out of scope here).

create table public.portfolios (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  currency char(3) not null default 'KRW',
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint portfolios_name_not_blank check (length(trim(name)) > 0),
  constraint portfolios_currency_uppercase check (currency = upper(currency))
);

create unique index portfolios_one_primary_true_per_user
  on public.portfolios (user_id)
  where is_primary;

create index portfolios_user_id_idx on public.portfolios (user_id);

create table public.transactions (
  id uuid primary key default extensions.gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  instrument_id uuid references public.instruments(id) on delete restrict,
  type text not null,
  quantity numeric(18, 6),
  price numeric(18, 6),
  amount numeric(18, 6) not null,
  currency char(3) not null,
  note text,
  occurred_at date not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint transactions_type_check
    check (type in ('buy', 'sell', 'dividend', 'deposit')),
  constraint transactions_currency_uppercase check (currency = upper(currency)),
  -- buy/sell rows must reference an instrument and carry qty+price;
  -- dividend/deposit may carry instrument=null and qty/price=null.
  constraint transactions_trade_requires_instrument
    check (type not in ('buy', 'sell') or instrument_id is not null),
  constraint transactions_trade_requires_qty_price
    check (
      type not in ('buy', 'sell')
      or (quantity is not null and quantity > 0 and price is not null and price >= 0)
    )
);

create index transactions_portfolio_id_idx on public.transactions (portfolio_id);
create index transactions_portfolio_occurred_idx
  on public.transactions (portfolio_id, occurred_at desc);
create index transactions_instrument_id_idx
  on public.transactions (instrument_id);

create trigger portfolios_set_updated_at
  before update on public.portfolios
  for each row execute function app_private.set_updated_at();

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function app_private.set_updated_at();

create or replace function app_private.touch_portfolio_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.portfolios
  set updated_at = timezone('utc', now())
  where id = coalesce(new.portfolio_id, old.portfolio_id);

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger transactions_touch_parent
  after insert or update or delete on public.transactions
  for each row execute function app_private.touch_portfolio_updated_at();

alter table public.portfolios enable row level security;
alter table public.transactions enable row level security;

create policy "Portfolios are visible to their owner"
  on public.portfolios
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Portfolios are inserted by their owner"
  on public.portfolios
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Portfolios are updated by their owner"
  on public.portfolios
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Portfolios are deleted by their owner"
  on public.portfolios
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Transactions are visible to their portfolio owner"
  on public.transactions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.portfolios
      where portfolios.id = transactions.portfolio_id
        and portfolios.user_id = (select auth.uid())
    )
  );

create policy "Transactions are inserted by their portfolio owner"
  on public.transactions
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.portfolios
      where portfolios.id = transactions.portfolio_id
        and portfolios.user_id = (select auth.uid())
    )
  );

create policy "Transactions are updated by their portfolio owner"
  on public.transactions
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.portfolios
      where portfolios.id = transactions.portfolio_id
        and portfolios.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.portfolios
      where portfolios.id = transactions.portfolio_id
        and portfolios.user_id = (select auth.uid())
    )
  );

create policy "Transactions are deleted by their portfolio owner"
  on public.transactions
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.portfolios
      where portfolios.id = transactions.portfolio_id
        and portfolios.user_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on table public.portfolios to authenticated;
grant select, insert, update, delete on table public.transactions to authenticated;

comment on table public.portfolios is 'User-owned portfolio containers. MVP uses one primary portfolio per profile.';
comment on table public.transactions is 'Raw trade/dividend/deposit ledger. Holdings are derived in the backend; no positions table.';
