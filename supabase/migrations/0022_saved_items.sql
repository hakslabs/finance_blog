-- PR-FE-04 / migration 0022: polymorphic bookmarks.
-- One table, kind-discriminated. target_id is text to accept both UUIDs
-- (reports/instruments/masters) and slug/numeric ids (news/guide). We lose
-- FK referential integrity here; the trade is unified API and no per-kind
-- table proliferation. saved_reports/saved_instruments are NOT dropped —
-- they remain as legacy storage and may be migrated later.

create table if not exists public.saved_items (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       text not null,
  target_id  text not null,
  note       text,
  saved_at   timestamptz not null default timezone('utc', now()),
  primary key (user_id, kind, target_id),
  constraint saved_items_kind_check
    check (kind in ('report', 'guide', 'news', 'stock', 'master'))
);

create index if not exists saved_items_user_kind_idx
  on public.saved_items (user_id, kind, saved_at desc);

alter table public.saved_items enable row level security;

create policy "Owner can select on saved_items"
  on public.saved_items for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Owner can insert on saved_items"
  on public.saved_items for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Owner can update on saved_items"
  on public.saved_items for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Owner can delete on saved_items"
  on public.saved_items for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on table public.saved_items to authenticated;
