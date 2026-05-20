-- 0024: align schema with the finance-lab-pro frontend
--
-- Frontend types (web/client/src/types/index.ts) drive this. New tables added
-- for: price_alerts, user_memos (covers StockDetail/Master/Report/Calendar memos
-- + MyPage journal), learn_lessons content + learn_quiz_attempts, fear_greed
-- history, master_feed_reads, admin role on profiles, calendar_events extension.

-- ── role on profiles ───────────────────────────────────────────────
alter table public.profiles
  add column if not exists role text not null default 'user'
    check (role in ('user', 'admin', 'superadmin'));
create index if not exists profiles_role_idx on public.profiles(role) where role != 'user';

-- ── price alerts ───────────────────────────────────────────────────
create table if not exists public.price_alerts (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  symbol text not null,
  alert_type text not null check (alert_type in ('target','stoploss','volume','news','earnings')),
  condition text not null,
  target_value double precision not null,
  current_value double precision,
  is_active boolean not null default true,
  triggered_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists price_alerts_user_idx on public.price_alerts(user_id);
create index if not exists price_alerts_active_idx on public.price_alerts(user_id, is_active) where is_active;
create trigger price_alerts_set_updated_at before update on public.price_alerts
  for each row execute function app_private.set_updated_at();

alter table public.price_alerts enable row level security;
create policy "price_alerts owner select" on public.price_alerts for select to authenticated using (auth.uid() = user_id);
create policy "price_alerts owner insert" on public.price_alerts for insert to authenticated with check (auth.uid() = user_id);
create policy "price_alerts owner update" on public.price_alerts for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "price_alerts owner delete" on public.price_alerts for delete to authenticated using (auth.uid() = user_id);
grant select, insert, update, delete on public.price_alerts to authenticated;

-- ── user memos / journal (polymorphic across kinds) ────────────────
-- target_kind ∈ stock|master|report|calendar_event|sector|free
create table if not exists public.user_memos (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_kind text not null check (target_kind in ('stock','master','report','calendar_event','sector','free')),
  target_ref text,                              -- ticker, master_id, report_id, event_id, sector_name (null for free)
  title text,
  body text not null,
  linked_trade_ids uuid[],                      -- MyPage journal linkage to trades
  tags text[],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_memos_body_not_blank check (length(trim(body)) > 0)
);
create index if not exists user_memos_user_idx on public.user_memos(user_id, created_at desc);
create index if not exists user_memos_target_idx on public.user_memos(user_id, target_kind, target_ref);
create trigger user_memos_set_updated_at before update on public.user_memos
  for each row execute function app_private.set_updated_at();

alter table public.user_memos enable row level security;
create policy "user_memos owner select" on public.user_memos for select to authenticated using (auth.uid() = user_id);
create policy "user_memos owner insert" on public.user_memos for insert to authenticated with check (auth.uid() = user_id);
create policy "user_memos owner update" on public.user_memos for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_memos owner delete" on public.user_memos for delete to authenticated using (auth.uid() = user_id);
grant select, insert, update, delete on public.user_memos to authenticated;

-- ── learn content (chapters + lessons) ─────────────────────────────
create table if not exists public.learn_chapters (
  id text primary key,                          -- e.g. 'basics'
  title text not null,
  description text,
  category text not null check (category in ('기초','기술적분석','가치투자','퀀트','매크로','심화')),
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create trigger learn_chapters_set_updated_at before update on public.learn_chapters
  for each row execute function app_private.set_updated_at();

create table if not exists public.learn_lessons (
  id text primary key,                          -- e.g. 'basics-intro'
  chapter_id text not null references public.learn_chapters(id) on delete cascade,
  title text not null,
  description text,
  level text not null default '입문' check (level in ('입문','초급','중급','고급')),
  read_time integer not null default 5,
  content text,                                  -- markdown
  tags text[],
  quiz jsonb,                                    -- [{q, options[], answer_idx, explain}]
  position integer not null default 0,
  is_popular boolean not null default false,
  is_locked boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists learn_lessons_chapter_idx on public.learn_lessons(chapter_id, position);
create trigger learn_lessons_set_updated_at before update on public.learn_lessons
  for each row execute function app_private.set_updated_at();

alter table public.learn_chapters enable row level security;
alter table public.learn_lessons enable row level security;
create policy "learn_chapters public read" on public.learn_chapters for select to anon, authenticated using (true);
create policy "learn_lessons public read" on public.learn_lessons for select to anon, authenticated using (true);
grant select on public.learn_chapters, public.learn_lessons to anon, authenticated;
grant all privileges on public.learn_chapters, public.learn_lessons to service_role;

-- quiz attempts
create table if not exists public.learn_quiz_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id text not null references public.learn_lessons(id) on delete cascade,
  score integer not null check (score >= 0 and score <= 100),
  total_questions integer not null,
  correct_count integer not null,
  answers jsonb,                                 -- array of selected indices
  created_at timestamptz not null default timezone('utc', now())
);
create index if not exists learn_quiz_attempts_user_idx on public.learn_quiz_attempts(user_id, lesson_id, created_at desc);
alter table public.learn_quiz_attempts enable row level security;
create policy "quiz_attempts owner select" on public.learn_quiz_attempts for select to authenticated using (auth.uid() = user_id);
create policy "quiz_attempts owner insert" on public.learn_quiz_attempts for insert to authenticated with check (auth.uid() = user_id);
grant select, insert on public.learn_quiz_attempts to authenticated;

-- ── fear/greed history (sentiment time series) ─────────────────────
create table if not exists public.fear_greed_history (
  market char(2) not null check (market in ('US','KR')),
  date date not null,
  value integer not null check (value between 0 and 100),
  vix double precision,
  adr double precision,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (market, date)
);
alter table public.fear_greed_history enable row level security;
create policy "fear_greed public read" on public.fear_greed_history for select to anon, authenticated using (true);
grant select on public.fear_greed_history to anon, authenticated;
grant all privileges on public.fear_greed_history to service_role;

-- ── master feed read state (per-user, per master_update) ───────────
create table if not exists public.master_feed_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  master_id text not null,
  update_key text not null,                      -- e.g. composite "{date}|{type}|{title}"
  read_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, master_id, update_key)
);
alter table public.master_feed_reads enable row level security;
create policy "feed_reads owner select" on public.master_feed_reads for select to authenticated using (auth.uid() = user_id);
create policy "feed_reads owner insert" on public.master_feed_reads for insert to authenticated with check (auth.uid() = user_id);
create policy "feed_reads owner delete" on public.master_feed_reads for delete to authenticated using (auth.uid() = user_id);
grant select, insert, delete on public.master_feed_reads to authenticated;

-- ── sector_metrics (precomputed daily) ─────────────────────────────
create table if not exists public.sector_metrics (
  sector text not null,
  market char(2) not null check (market in ('US','KR')),
  date date not null,
  return_day double precision,
  return_week double precision,
  return_month double precision,
  return_quarter double precision,
  rank_day integer,
  rank_week integer,
  rank_month integer,
  prev_rank_month integer,
  money_flow text check (money_flow in ('inflow','outflow','neutral')),
  relative_strength double precision,
  etf text,
  code text,
  primary key (sector, market, date)
);
alter table public.sector_metrics enable row level security;
create policy "sector_metrics public read" on public.sector_metrics for select to anon, authenticated using (true);
grant select on public.sector_metrics to anon, authenticated;
grant all privileges on public.sector_metrics to service_role;

-- ── admin notifications broadcast ──────────────────────────────────
create table if not exists public.admin_broadcasts (
  id uuid primary key default extensions.gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete set null,
  title text not null,
  body text not null,
  audience text not null default 'all' check (audience in ('all','free','premium')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);
alter table public.admin_broadcasts enable row level security;
create policy "broadcasts admin select" on public.admin_broadcasts for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin')));
create policy "broadcasts admin insert" on public.admin_broadcasts for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin')));
create policy "broadcasts admin delete" on public.admin_broadcasts for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin')));
grant select, insert, delete on public.admin_broadcasts to authenticated;

-- ── login audit (admin login history view) ─────────────────────────
create table if not exists public.login_audit (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  occurred_at timestamptz not null default timezone('utc', now()),
  ip inet,
  user_agent text,
  country text,
  status text not null default 'success' check (status in ('success','failed'))
);
create index if not exists login_audit_user_idx on public.login_audit(user_id, occurred_at desc);
alter table public.login_audit enable row level security;
create policy "login_audit admin select" on public.login_audit for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin')));
create policy "login_audit owner select" on public.login_audit for select to authenticated using (auth.uid() = user_id);
grant select, insert on public.login_audit to authenticated;

-- ── user_preferences (per-user UI/feature prefs) ───────────────────
create table if not exists public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  last_market char(2) check (last_market in ('US','KR')),
  preferred_indicators text[],                   -- StockDetail enabled indicators
  preferred_timeframe text,
  dismissed_notice_ids text[],
  macro_overrides jsonb,                         -- Analysis page edits
  updated_at timestamptz not null default timezone('utc', now())
);
create trigger user_prefs_set_updated_at before update on public.user_preferences
  for each row execute function app_private.set_updated_at();
alter table public.user_preferences enable row level security;
create policy "prefs owner all" on public.user_preferences for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.user_preferences to authenticated;

comment on table public.price_alerts is '0024: per-user price/volume/news/earnings alerts (MyPage Alerts tab, StockDetail bell)';
comment on table public.user_memos is '0024: per-user notes across stocks/masters/reports/calendar/sectors (StockDetail journal, Calendar memos, MyPage Journal)';
comment on table public.learn_lessons is '0024: lesson content store (Learn/LearnDetail); was inline in frontend mock';
comment on table public.user_preferences is '0024: per-user UI state (last market, enabled indicators, macro overrides)';
