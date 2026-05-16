-- PR-33: seed core Korean tickers with DART corp_code so /stocks/{symbol}/filings
-- can resolve to DART filings via instruments.corp_code.
--
-- corp_code values are 8-digit DART identifiers (public knowledge from
-- opendart.fss.or.kr/api/corpCode.xml).

insert into public.instruments
  (symbol, name, exchange, asset_type, country_code, currency, sector, corp_code)
values
  ('005930.KS', 'Samsung Electronics',     'KRX', 'stock', 'KR', 'KRW', 'Information Technology', '00126380'),
  ('000660.KS', 'SK hynix',                'KRX', 'stock', 'KR', 'KRW', 'Information Technology', '00164779'),
  ('035420.KS', 'NAVER',                   'KRX', 'stock', 'KR', 'KRW', 'Communication Services', '00266961'),
  ('035720.KS', 'Kakao',                   'KRX', 'stock', 'KR', 'KRW', 'Communication Services', '00918444'),
  ('005380.KS', 'Hyundai Motor',           'KRX', 'stock', 'KR', 'KRW', 'Consumer Discretionary', '00164742'),
  ('051910.KS', 'LG Chem',                 'KRX', 'stock', 'KR', 'KRW', 'Materials',              '00356361'),
  ('068270.KS', 'Celltrion',               'KRX', 'stock', 'KR', 'KRW', 'Health Care',            '00421045'),
  ('006400.KS', 'Samsung SDI',             'KRX', 'stock', 'KR', 'KRW', 'Information Technology', '00126186'),
  ('373220.KS', 'LG Energy Solution',      'KRX', 'stock', 'KR', 'KRW', 'Industrials',            '01515323'),
  ('207940.KS', 'Samsung Biologics',       'KRX', 'stock', 'KR', 'KRW', 'Health Care',            '00877059')
on conflict (symbol, exchange) do update set
  name        = excluded.name,
  asset_type  = excluded.asset_type,
  country_code= excluded.country_code,
  currency    = excluded.currency,
  sector      = excluded.sector,
  corp_code   = excluded.corp_code;
