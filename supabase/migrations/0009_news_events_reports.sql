-- PR-23 / migration 0009: news, economic events, reports (schema only).
-- TIER-3.5 surface per schema-master-plan §2. Public-read RLS + service-role writes.
--   - news_items + news_instruments
--   - economic_events (FOMC / NFP / earnings macro events)
--   - reports + report_tickers (the /reports page surface)

create table if not exists public.news_items (
  id          uuid primary key default extensions.gen_random_uuid(),
  source      text not null,
  external_id text,
  title       text not null,
  url         text,
  summary     text,
  language    text not null default 'ko',
  sentiment   text,
  published_at timestamptz not null,
  ingested_at timestamptz not null default timezone('utc', now()),
  constraint news_items_title_not_blank check (length(trim(title)) > 0),
  constraint news_items_sentiment_check
    check (sentiment is null or sentiment in ('positive', 'neutral', 'negative')),
  constraint news_items_unique_external unique (source, external_id)
);

create index if not exists news_items_published_idx
  on public.news_items (published_at desc);

create table if not exists public.news_instruments (
  news_id       uuid not null references public.news_items(id) on delete cascade,
  instrument_id uuid not null references public.instruments(id) on delete cascade,
  relevance     numeric(5, 4),
  primary key (news_id, instrument_id),
  constraint news_instruments_relevance_range
    check (relevance is null or (relevance >= 0 and relevance <= 1))
);

create index if not exists news_instruments_instrument_idx
  on public.news_instruments (instrument_id);

create table if not exists public.economic_events (
  id           uuid primary key default extensions.gen_random_uuid(),
  calendar_code text not null,
  title        text not null,
  country_code char(2),
  importance   smallint,
  scheduled_at timestamptz not null,
  actual_value text,
  forecast_value text,
  previous_value text,
  unit         text,
  source       text not null,
  ingested_at  timestamptz not null default timezone('utc', now()),
  constraint economic_events_title_not_blank check (length(trim(title)) > 0),
  constraint economic_events_importance_range
    check (importance is null or (importance between 1 and 3)),
  constraint economic_events_country_uppercase
    check (country_code is null or country_code = upper(country_code)),
  constraint economic_events_unique_calendar
    unique (source, calendar_code, scheduled_at)
);

create index if not exists economic_events_scheduled_idx
  on public.economic_events (scheduled_at);
create index if not exists economic_events_country_idx
  on public.economic_events (country_code);

create table if not exists public.reports (
  id           uuid primary key default extensions.gen_random_uuid(),
  source       text not null,
  title        text not null,
  category     text,
  summary      text,
  body_url     text,
  published_at date not null,
  language     text not null default 'ko',
  importance   smallint,
  ingested_at  timestamptz not null default timezone('utc', now()),
  constraint reports_title_not_blank check (length(trim(title)) > 0),
  constraint reports_importance_range
    check (importance is null or (importance between 1 and 5))
);

create index if not exists reports_published_idx
  on public.reports (published_at desc);
create index if not exists reports_category_idx
  on public.reports (category);

create table if not exists public.report_tickers (
  report_id     uuid not null references public.reports(id) on delete cascade,
  instrument_id uuid not null references public.instruments(id) on delete cascade,
  primary key (report_id, instrument_id)
);

create index if not exists report_tickers_instrument_idx
  on public.report_tickers (instrument_id);

alter table public.news_items       enable row level security;
alter table public.news_instruments enable row level security;
alter table public.economic_events  enable row level security;
alter table public.reports          enable row level security;
alter table public.report_tickers   enable row level security;

create policy "News items are public read"       on public.news_items       for select to anon, authenticated using (true);
create policy "News instruments are public read" on public.news_instruments for select to anon, authenticated using (true);
create policy "Economic events are public read"  on public.economic_events  for select to anon, authenticated using (true);
create policy "Reports are public read"          on public.reports          for select to anon, authenticated using (true);
create policy "Report tickers are public read"   on public.report_tickers   for select to anon, authenticated using (true);

grant select on table public.news_items       to anon, authenticated;
grant select on table public.news_instruments to anon, authenticated;
grant select on table public.economic_events  to anon, authenticated;
grant select on table public.reports          to anon, authenticated;
grant select on table public.report_tickers   to anon, authenticated;
