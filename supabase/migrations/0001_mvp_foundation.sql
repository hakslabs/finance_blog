-- PR-08: minimum schema for the first dashboard watchlist data path.
-- Keep this migration intentionally small; portfolio, reports, 13F, and prices land later.

create schema if not exists app_private;
revoke all on schema app_private from public;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key,
  display_name text not null,
  email text,
  locale text not null default 'ko-KR',
  timezone text not null default 'Asia/Seoul',
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_display_name_not_blank check (length(trim(display_name)) > 0),
  constraint profiles_locale_not_blank check (length(trim(locale)) > 0),
  constraint profiles_timezone_not_blank check (length(trim(timezone)) > 0)
);

create table public.instruments (
  id uuid primary key default extensions.gen_random_uuid(),
  symbol text not null,
  name text not null,
  exchange text not null,
  asset_type text not null default 'stock',
  country_code char(2) not null,
  currency char(3) not null,
  sector text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint instruments_symbol_uppercase check (symbol = upper(symbol)),
  constraint instruments_symbol_not_blank check (length(trim(symbol)) > 0),
  constraint instruments_name_not_blank check (length(trim(name)) > 0),
  constraint instruments_asset_type_check check (asset_type in ('stock', 'etf', 'index', 'currency', 'macro')),
  constraint instruments_country_code_uppercase check (country_code = upper(country_code)),
  constraint instruments_currency_uppercase check (currency = upper(currency)),
  constraint instruments_symbol_exchange_unique unique (symbol, exchange)
);

create table public.watchlists (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint watchlists_name_not_blank check (length(trim(name)) > 0)
);

create unique index watchlists_one_primary_true_per_user
  on public.watchlists (user_id)
  where is_primary;

create table public.watchlist_items (
  id uuid primary key default extensions.gen_random_uuid(),
  watchlist_id uuid not null references public.watchlists(id) on delete cascade,
  instrument_id uuid not null references public.instruments(id) on delete restrict,
  position integer not null default 0,
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint watchlist_items_position_non_negative check (position >= 0),
  constraint watchlist_items_unique_instrument unique (watchlist_id, instrument_id),
  constraint watchlist_items_unique_position unique (watchlist_id, position)
);

create index watchlists_user_id_idx on public.watchlists (user_id);
create index watchlist_items_watchlist_id_idx on public.watchlist_items (watchlist_id);
create index watchlist_items_instrument_id_idx on public.watchlist_items (instrument_id);
create index instruments_symbol_idx on public.instruments (symbol);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function app_private.set_updated_at();

create trigger instruments_set_updated_at
  before update on public.instruments
  for each row execute function app_private.set_updated_at();

create trigger watchlists_set_updated_at
  before update on public.watchlists
  for each row execute function app_private.set_updated_at();

create trigger watchlist_items_set_updated_at
  before update on public.watchlist_items
  for each row execute function app_private.set_updated_at();

create or replace function app_private.touch_watchlist_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.watchlists
  set updated_at = timezone('utc', now())
  where id = coalesce(new.watchlist_id, old.watchlist_id);

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger watchlist_items_touch_parent
  after insert or update or delete on public.watchlist_items
  for each row execute function app_private.touch_watchlist_updated_at();

alter table public.profiles enable row level security;
alter table public.instruments enable row level security;
alter table public.watchlists enable row level security;
alter table public.watchlist_items enable row level security;

create policy "Profiles are visible to their owner"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Profiles are inserted by their owner"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "Profiles are updated by their owner"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Instruments are public read reference data"
  on public.instruments
  for select
  to anon, authenticated
  using (true);

create policy "Watchlists are visible to their owner"
  on public.watchlists
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Watchlists are inserted by their owner"
  on public.watchlists
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Watchlists are updated by their owner"
  on public.watchlists
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Watchlists are deleted by their owner"
  on public.watchlists
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Watchlist items are visible to their watchlist owner"
  on public.watchlist_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.watchlists
      where watchlists.id = watchlist_items.watchlist_id
        and watchlists.user_id = (select auth.uid())
    )
  );

create policy "Watchlist items are inserted by their watchlist owner"
  on public.watchlist_items
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.watchlists
      where watchlists.id = watchlist_items.watchlist_id
        and watchlists.user_id = (select auth.uid())
    )
  );

create policy "Watchlist items are updated by their watchlist owner"
  on public.watchlist_items
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.watchlists
      where watchlists.id = watchlist_items.watchlist_id
        and watchlists.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.watchlists
      where watchlists.id = watchlist_items.watchlist_id
        and watchlists.user_id = (select auth.uid())
    )
  );

create policy "Watchlist items are deleted by their watchlist owner"
  on public.watchlist_items
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.watchlists
      where watchlists.id = watchlist_items.watchlist_id
        and watchlists.user_id = (select auth.uid())
    )
  );

grant usage on schema public to anon, authenticated, service_role;
grant select on table public.instruments to anon, authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.watchlists to authenticated;
grant select, insert, update, delete on table public.watchlist_items to authenticated;
grant all privileges on all tables in schema public to service_role;

comment on table public.profiles is 'Auth-ready user profile rows. PR-08 intentionally does not FK to auth.users so the dev-header seed can exist before PR-14.';
comment on table public.instruments is 'Public reference instruments used by watchlists and later quote ingestion.';
comment on table public.watchlists is 'User-owned watchlist containers. MVP uses one primary watchlist per profile.';
comment on table public.watchlist_items is 'User-owned watchlist entries linked to normalized instruments.';
