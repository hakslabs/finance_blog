-- PR-25 / migration 0011: user state (schema only).
-- TIER-4 per schema-master-plan §2. Owner-only RLS on every table:
--   saved_reports, saved_instruments, position_theses + conditions,
--   memos (polymorphic), alerts, notifications, todos, activity_log, screens.
-- All FKs point at public.profiles(id); cascade on user delete.

create table if not exists public.saved_reports (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  report_id  uuid not null references public.reports(id) on delete cascade,
  folder     text,
  note       text,
  saved_at   timestamptz not null default timezone('utc', now()),
  primary key (user_id, report_id)
);

create index if not exists saved_reports_user_folder_idx
  on public.saved_reports (user_id, folder);

create table if not exists public.saved_instruments (
  user_id       uuid not null references public.profiles(id) on delete cascade,
  instrument_id uuid not null references public.instruments(id) on delete cascade,
  folder        text,
  note          text,
  saved_at      timestamptz not null default timezone('utc', now()),
  primary key (user_id, instrument_id)
);

create index if not exists saved_instruments_user_folder_idx
  on public.saved_instruments (user_id, folder);

create table if not exists public.position_theses (
  id            uuid primary key default extensions.gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  instrument_id uuid not null references public.instruments(id) on delete cascade,
  thesis        text not null,
  conviction    smallint,
  target_price  numeric(18, 6),
  stop_price    numeric(18, 6),
  created_at    timestamptz not null default timezone('utc', now()),
  updated_at    timestamptz not null default timezone('utc', now()),
  constraint position_theses_thesis_not_blank check (length(trim(thesis)) > 0),
  constraint position_theses_conviction_range
    check (conviction is null or (conviction between 1 and 5)),
  constraint position_theses_unique_per_user unique (user_id, instrument_id)
);

create trigger position_theses_set_updated_at
  before update on public.position_theses
  for each row execute function app_private.set_updated_at();

create table if not exists public.position_thesis_conditions (
  id         uuid primary key default extensions.gen_random_uuid(),
  thesis_id  uuid not null references public.position_theses(id) on delete cascade,
  kind       text not null,
  body       text not null,
  triggered  boolean not null default false,
  triggered_at timestamptz,
  ordinal    smallint not null default 0,
  constraint position_thesis_conditions_kind_check
    check (kind in ('thesis', 'trigger', 'invalidate')),
  constraint position_thesis_conditions_body_not_blank check (length(trim(body)) > 0)
);

create index if not exists position_thesis_conditions_thesis_idx
  on public.position_thesis_conditions (thesis_id);

create table if not exists public.memos (
  id          uuid primary key default extensions.gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  target_kind text not null,
  target_id   uuid,
  body        text not null,
  created_at  timestamptz not null default timezone('utc', now()),
  updated_at  timestamptz not null default timezone('utc', now()),
  constraint memos_target_kind_check
    check (target_kind in ('instrument', 'transaction', 'report', 'master', 'news', 'filing')),
  constraint memos_body_not_blank check (length(trim(body)) > 0)
);

create index if not exists memos_user_target_idx
  on public.memos (user_id, target_kind, target_id);

create trigger memos_set_updated_at
  before update on public.memos
  for each row execute function app_private.set_updated_at();

create table if not exists public.alerts (
  id            uuid primary key default extensions.gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  instrument_id uuid references public.instruments(id) on delete cascade,
  kind          text not null,
  operator      text not null,
  threshold     numeric(20, 6) not null,
  enabled       boolean not null default true,
  triggered_at  timestamptz,
  created_at    timestamptz not null default timezone('utc', now()),
  updated_at    timestamptz not null default timezone('utc', now()),
  constraint alerts_kind_check
    check (kind in ('price', 'rsi', 'ma_cross', 'volume', 'macro', 'custom')),
  constraint alerts_operator_check
    check (operator in ('lt', 'lte', 'gt', 'gte', 'eq', 'cross_up', 'cross_down'))
);

create index if not exists alerts_user_enabled_idx
  on public.alerts (user_id, enabled);

create trigger alerts_set_updated_at
  before update on public.alerts
  for each row execute function app_private.set_updated_at();

create table if not exists public.notifications (
  id          uuid primary key default extensions.gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  kind        text not null,
  title       text not null,
  body        text,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default timezone('utc', now()),
  constraint notifications_title_not_blank check (length(trim(title)) > 0)
);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, read_at) where read_at is null;
create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create table if not exists public.todos (
  id          uuid primary key default extensions.gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  body        text,
  done        boolean not null default false,
  due_at      timestamptz,
  created_at  timestamptz not null default timezone('utc', now()),
  updated_at  timestamptz not null default timezone('utc', now()),
  constraint todos_title_not_blank check (length(trim(title)) > 0)
);

create index if not exists todos_user_done_idx
  on public.todos (user_id, done);

create trigger todos_set_updated_at
  before update on public.todos
  for each row execute function app_private.set_updated_at();

create table if not exists public.activity_log (
  id          uuid primary key default extensions.gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  kind        text not null,
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default timezone('utc', now())
);

create index if not exists activity_log_user_created_idx
  on public.activity_log (user_id, created_at desc);

create table if not exists public.screens (
  id          uuid primary key default extensions.gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  filters     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default timezone('utc', now()),
  updated_at  timestamptz not null default timezone('utc', now()),
  constraint screens_name_not_blank check (length(trim(name)) > 0),
  constraint screens_unique_name_per_user unique (user_id, name)
);

create trigger screens_set_updated_at
  before update on public.screens
  for each row execute function app_private.set_updated_at();

alter table public.saved_reports             enable row level security;
alter table public.saved_instruments         enable row level security;
alter table public.position_theses           enable row level security;
alter table public.position_thesis_conditions enable row level security;
alter table public.memos                     enable row level security;
alter table public.alerts                    enable row level security;
alter table public.notifications             enable row level security;
alter table public.todos                     enable row level security;
alter table public.activity_log              enable row level security;
alter table public.screens                   enable row level security;

-- Owner-only policies for direct user_id tables.
do $$
declare t text;
begin
  for t in select unnest(array[
    'saved_reports','saved_instruments','position_theses','memos',
    'alerts','notifications','todos','activity_log','screens'
  ])
  loop
    execute format($p$create policy "Owner can select on %1$I"
      on public.%1$I for select to authenticated using ((select auth.uid()) = user_id);$p$, t);
    execute format($p$create policy "Owner can insert on %1$I"
      on public.%1$I for insert to authenticated with check ((select auth.uid()) = user_id);$p$, t);
    execute format($p$create policy "Owner can update on %1$I"
      on public.%1$I for update to authenticated
      using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);$p$, t);
    execute format($p$create policy "Owner can delete on %1$I"
      on public.%1$I for delete to authenticated using ((select auth.uid()) = user_id);$p$, t);
  end loop;
end$$;

-- position_thesis_conditions: scope via parent thesis's user_id.
create policy "Owner can select thesis conditions"
  on public.position_thesis_conditions for select to authenticated
  using (exists (select 1 from public.position_theses pt
                 where pt.id = position_thesis_conditions.thesis_id
                   and pt.user_id = (select auth.uid())));

create policy "Owner can insert thesis conditions"
  on public.position_thesis_conditions for insert to authenticated
  with check (exists (select 1 from public.position_theses pt
                      where pt.id = position_thesis_conditions.thesis_id
                        and pt.user_id = (select auth.uid())));

create policy "Owner can update thesis conditions"
  on public.position_thesis_conditions for update to authenticated
  using (exists (select 1 from public.position_theses pt
                 where pt.id = position_thesis_conditions.thesis_id
                   and pt.user_id = (select auth.uid())))
  with check (exists (select 1 from public.position_theses pt
                      where pt.id = position_thesis_conditions.thesis_id
                        and pt.user_id = (select auth.uid())));

create policy "Owner can delete thesis conditions"
  on public.position_thesis_conditions for delete to authenticated
  using (exists (select 1 from public.position_theses pt
                 where pt.id = position_thesis_conditions.thesis_id
                   and pt.user_id = (select auth.uid())));

grant select, insert, update, delete on table public.saved_reports             to authenticated;
grant select, insert, update, delete on table public.saved_instruments         to authenticated;
grant select, insert, update, delete on table public.position_theses           to authenticated;
grant select, insert, update, delete on table public.position_thesis_conditions to authenticated;
grant select, insert, update, delete on table public.memos                     to authenticated;
grant select, insert, update, delete on table public.alerts                    to authenticated;
grant select, insert, update, delete on table public.notifications             to authenticated;
grant select, insert, update, delete on table public.todos                     to authenticated;
grant select, insert, update, delete on table public.activity_log              to authenticated;
grant select, insert, update, delete on table public.screens                   to authenticated;
