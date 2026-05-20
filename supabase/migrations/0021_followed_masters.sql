-- PR-FE-02 / migration 0021: per-user master follows.
-- Owner-only RLS. Distinct from saved_instruments (which is for instruments,
-- not master profiles). Used by the FollowContext on the frontend.

create table if not exists public.followed_masters (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  master_id   uuid not null references public.masters(id)  on delete cascade,
  followed_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, master_id)
);

create index if not exists followed_masters_user_idx
  on public.followed_masters (user_id, followed_at desc);

alter table public.followed_masters enable row level security;

create policy "Owner can select on followed_masters"
  on public.followed_masters for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Owner can insert on followed_masters"
  on public.followed_masters for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Owner can delete on followed_masters"
  on public.followed_masters for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, delete on table public.followed_masters to authenticated;
