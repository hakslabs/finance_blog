-- PR-27 / migration 0013: seed well-known investors into `masters`.
-- These rows give the masters list/detail pages something to render
-- before a 13F ingestion PR populates filings + filing_holdings (which
-- the master_filings view depends on).
--
-- All filer_cik values are 10-digit, zero-padded SEC CIKs. They are
-- public knowledge from data.sec.gov.

insert into public.masters (slug, name, firm, country_code, style, description, aum, aum_currency, filer_cik, homepage_url)
values
  ('buffett',  'Warren Buffett',  'Berkshire Hathaway',     'US', 'Value · Long-term compounders', 'Permanent capital · Owner-operator philosophy · Insurance float.',           300000000000.00, 'USD', '0001067983', 'https://www.berkshirehathaway.com'),
  ('munger',   'Charlie Munger',  'Daily Journal Corp.',     'US', 'Value · Concentrated',          'Concentrated long-term equity book run from the Daily Journal balance sheet.', 100000000.00,    'USD', '0000783412', 'https://www.dailyjournal.com'),
  ('burry',    'Michael Burry',   'Scion Asset Management',  'US', 'Deep value · Contrarian',       'Concentrated, contrarian, frequent options overlays.',                       150000000.00,    'USD', '0001649339', null),
  ('ackman',   'Bill Ackman',     'Pershing Square',         'US', 'Activist · Quality compounders','Concentrated quality compounders; occasional activism and macro hedges.',   15000000000.00,  'USD', '0001336528', 'https://pershingsquareholdings.com'),
  ('klarman',  'Seth Klarman',    'Baupost Group',           'US', 'Value · Margin of safety',      'Margin-of-safety value across equities, credit, real estate, and special situations.', 27000000000.00, 'USD', '0001061165', null),
  ('pabrai',   'Mohnish Pabrai',  'Pabrai Investment Funds', 'US', 'Value · Cloning',               'Long-only deep value, concentrated, Pabrai-style cloning of disclosed positions.', 700000000.00, 'USD', '0001442119', 'https://www.chaiwithpabrai.com'),
  ('einhorn',  'David Einhorn',   'Greenlight Capital',      'US', 'Long/short · Forensic',         'Long/short, forensic accounting bias, well-known short calls.',              1500000000.00,   'USD', '0001079114', 'https://www.greenlightcapital.com'),
  ('marks',    'Howard Marks',    'Oaktree Capital',         'US', 'Distressed · Credit',           'Distressed debt and credit cycles; memos cover macro and behavioral risk.', 200000000000.00, 'USD', '0001403528', 'https://www.oaktreecapital.com')
on conflict (slug) do update set
  name         = excluded.name,
  firm         = excluded.firm,
  country_code = excluded.country_code,
  style        = excluded.style,
  description  = excluded.description,
  aum          = excluded.aum,
  aum_currency = excluded.aum_currency,
  filer_cik    = excluded.filer_cik,
  homepage_url = excluded.homepage_url;

-- A small set of principles per master so the detail page shows non-empty
-- content from DB before research-paragraph ingestion exists.
insert into public.master_principles (master_id, ordinal, title, body)
select m.id, p.ordinal, p.title, p.body
from public.masters m
join (values
  ('buffett', 1::smallint, '능력의 원',           '내가 이해할 수 있는 사업만 산다.'),
  ('buffett', 2::smallint, '안전 마진',           '내재가치보다 충분히 싸게 산다.'),
  ('buffett', 3::smallint, '경제적 해자',         '경쟁우위가 지속되는 기업을 우선한다.'),
  ('burry',   1::smallint, '심층 가치',           '시장이 외면한 자산에서 비대칭 기회를 찾는다.'),
  ('burry',   2::smallint, '데이터 우선',         '내러티브보다 1차 자료를 본다.'),
  ('ackman',  1::smallint, '품질에 집중',         '소수의 고품질 기업에 집중 투자한다.'),
  ('ackman',  2::smallint, '행동주의 옵션',       '필요할 때만 거버넌스에 개입한다.'),
  ('klarman', 1::smallint, '마진 오브 세이프티', '본질가치 대비 큰 할인에서만 매수한다.'),
  ('klarman', 2::smallint, '인내 자본',           '현금 보유를 적극적인 포지션으로 본다.'),
  ('pabrai',  1::smallint, '클로닝',              '검증된 가치투자자의 포지션을 모방 학습한다.'),
  ('pabrai',  2::smallint, '집중과 인내',         '소수 종목, 장기 보유.'),
  ('einhorn', 1::smallint, '포렌식 회계',         '회계 품질이 의심되는 종목을 숏 후보로 본다.'),
  ('marks',   1::smallint, '사이클 인식',         '지금 사이클의 어디에 있는지 끊임없이 점검한다.'),
  ('marks',   2::smallint, '2차적 사고',          '컨센서스 너머의 시나리오를 본다.'),
  ('munger',  1::smallint, '역발상',              '거꾸로 생각해 실수를 먼저 제거한다.')
) as p(slug, ordinal, title, body) on p.slug = m.slug
on conflict do nothing;
