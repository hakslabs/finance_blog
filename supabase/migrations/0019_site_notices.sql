-- Site-wide notice banner. Public read, admin write (via service-role
-- only — no UI yet). One row per notice; the dashboard reads the most
-- recent.

create table if not exists public.site_notices (
  id          uuid primary key default extensions.gen_random_uuid(),
  tag         text not null default '공지사항',
  title       text not null,
  description text,
  published_at timestamptz not null default timezone('utc', now()),
  is_active   boolean not null default true,
  constraint site_notices_title_not_blank check (length(trim(title)) > 0)
);

create index if not exists site_notices_published_idx
  on public.site_notices (published_at desc) where is_active;

alter table public.site_notices enable row level security;

create policy "Site notices are public read"
  on public.site_notices for select to anon, authenticated using (true);

grant select on table public.site_notices to anon, authenticated;

insert into public.site_notices (tag, title, description) values
  ('업데이트', '대시보드 라이브 데이터 — 시세·뉴스·공시·매크로',
   'KRX/Polygon 일봉, Finnhub 뉴스·재무·컨센서스, SEC/DART 공시, FRED/CNN 매크로/심리 지표가 실시간으로 흐릅니다.')
on conflict do nothing;
