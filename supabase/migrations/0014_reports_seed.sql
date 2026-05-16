-- PR-27 follow-up / migration 0014: seed `reports` with the same ids the
-- frontend fixture uses so /reports and /reports/{id} render from DB
-- with no second-source mismatch. Idempotent via id collisions falling
-- through (we cast deterministic UUIDs from fixture ids).
--
-- The `reports.id` column is a uuid with default gen_random_uuid(), so
-- we deterministically derive a uuid from the fixture text id using
-- uuid_generate_v5 against a fixed namespace. That keeps the same id
-- stable across re-runs and across local/remote.

create extension if not exists "uuid-ossp" with schema extensions;

-- Add a stable text slug so the frontend route /reports/{slug} can resolve
-- by human-readable id. Schema-only; existing rows get a null slug.
alter table public.reports
  add column if not exists slug text;

create unique index if not exists reports_slug_unique_idx on public.reports (slug) where slug is not null;

with namespace as (
  -- Stable namespace uuid for the finance_lab/reports seed.
  select 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid as ns
),
seed(text_id, source, title, category, summary, body_url, published_at, language, importance) as (
  values
    ('bok-monetary-2025-09',       '한국은행',     '2025년 9월 통화신용정책보고서',            '거시',  '물가 안정세 지속, 가계부채 점진적 둔화. 기준금리 동결 시사.',                          'https://www.bok.or.kr/portal/main/contents.do?menuNo=200334',                   date '2025-09-26', 'ko', 4),
    ('berkshire-13f-2025-q3',      'SEC EDGAR',    'Berkshire Hathaway · Q3 2025 13F-HR',     '공시',  'Apple 보유 비중 축소 지속, 일본 종합상사 5사 비중 확대.',                                'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001067983',     date '2025-11-14', 'en', 5),
    ('imf-weo-2025-10',            'IMF',          'World Economic Outlook · October 2025',    '거시',  '세계성장률 전망 소폭 상향, 디스인플레이션 진행 중.',                                       'https://www.imf.org/en/Publications/WEO/Issues/2025/10',                         date '2025-10-22', 'en', 4),
    ('kdi-outlook-2025-h2',        'KDI',          '2025년 하반기 경제전망',                    '거시',  '내수 회복 지연, 수출 중심 성장. 2026년 성장률 2.1% 전망.',                                'https://www.kdi.re.kr',                                                          date '2025-11-05', 'ko', 3),
    ('blackrock-ai-capex-2026',    'BlackRock',    '2026 Outlook: AI Capex Cycle',             '산업',  'AI 인프라 투자 확대 지속. 데이터센터·전력·반도체 밸류체인 비중확대.',                       'https://www.blackrock.com/institutions/en-us/insights/investment-actions',       date '2025-12-10', 'en', 4),
    ('dart-samsung-buyback-2025',  'DART',         '삼성전자 · 자기주식 취득 신탁계약 체결',    '공시',  '신탁계약 규모 10조원, 2025년 12월부터 2026년 11월까지 진행.',                              'https://dart.fss.or.kr',                                                         date '2025-11-29', 'ko', 5),
    ('oecd-outlook-118',           'OECD',         'OECD Economic Outlook 118',                '거시',  '회원국 평균 성장률 1.9%. 금리 정상화 경로 점진적 진행 전망.',                              'https://www.oecd.org/economic-outlook',                                          date '2025-12-03', 'en', 3),
    ('kpmg-ai-semiconductor-2025', 'KPMG',         'AI 반도체 산업 동향과 투자 기회',          '산업',  'HBM·CoWoS 캐파 부족 지속, 2026년 ASIC 매출 본격화.',                                       'https://home.kpmg/kr/ko/home.html',                                              date '2025-11-18', 'ko', 4)
)
insert into public.reports (id, slug, source, title, category, summary, body_url, published_at, language, importance)
select
  extensions.uuid_generate_v5(namespace.ns, seed.text_id),
  seed.text_id,
  seed.source,
  seed.title,
  seed.category,
  seed.summary,
  seed.body_url,
  seed.published_at,
  seed.language,
  seed.importance
from seed cross join namespace
on conflict (id) do update set
  slug         = excluded.slug,
  source       = excluded.source,
  title        = excluded.title,
  category     = excluded.category,
  summary      = excluded.summary,
  body_url     = excluded.body_url,
  published_at = excluded.published_at,
  language     = excluded.language,
  importance   = excluded.importance;
