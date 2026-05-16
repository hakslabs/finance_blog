-- PR-28 follow-up: backfill CUSIP→instrument aliases for major US
-- stocks so the SEC 13F ingester resolves to real instruments instead
-- of CUSIP-<digits> placeholders. Run before the next ingest_13f cron
-- to clean up Buffett/Klarman/etc. holdings rows.
--
-- CUSIPs are public reference data. Sources: SEC 13F filings, OpenFIGI.

insert into public.instruments (symbol, name, exchange, asset_type, country_code, currency, sector)
values
  ('AAPL', 'Apple Inc.',                         'NASDAQ', 'stock', 'US', 'USD', 'Information Technology'),
  ('BAC',  'Bank of America Corp',               'NYSE',   'stock', 'US', 'USD', 'Financials'),
  ('AXP',  'American Express',                   'NYSE',   'stock', 'US', 'USD', 'Financials'),
  ('KO',   'Coca-Cola Co',                       'NYSE',   'stock', 'US', 'USD', 'Consumer Staples'),
  ('CVX',  'Chevron Corp',                       'NYSE',   'stock', 'US', 'USD', 'Energy'),
  ('OXY',  'Occidental Petroleum',               'NYSE',   'stock', 'US', 'USD', 'Energy'),
  ('KHC',  'Kraft Heinz',                        'NASDAQ', 'stock', 'US', 'USD', 'Consumer Staples'),
  ('MCO',  'Moody''s Corp',                      'NYSE',   'stock', 'US', 'USD', 'Financials'),
  ('SIRI', 'Sirius XM Holdings',                 'NASDAQ', 'stock', 'US', 'USD', 'Communication Services'),
  ('VRSN', 'Verisign',                           'NASDAQ', 'stock', 'US', 'USD', 'Information Technology'),
  ('CHTR', 'Charter Communications',             'NASDAQ', 'stock', 'US', 'USD', 'Communication Services'),
  ('LSXMK','Liberty Sirius XM Group',            'NASDAQ', 'stock', 'US', 'USD', 'Communication Services'),
  ('KR',   'Kroger Co',                          'NYSE',   'stock', 'US', 'USD', 'Consumer Staples'),
  ('LPX',  'Louisiana-Pacific',                  'NYSE',   'stock', 'US', 'USD', 'Materials'),
  ('NU',   'Nu Holdings',                        'NYSE',   'stock', 'US', 'USD', 'Financials'),
  ('JPM',  'JPMorgan Chase',                     'NYSE',   'stock', 'US', 'USD', 'Financials'),
  ('GOOG', 'Alphabet Inc Class C',               'NASDAQ', 'stock', 'US', 'USD', 'Communication Services'),
  ('GOOGL','Alphabet Inc Class A',               'NASDAQ', 'stock', 'US', 'USD', 'Communication Services'),
  ('META', 'Meta Platforms',                     'NASDAQ', 'stock', 'US', 'USD', 'Communication Services'),
  ('MSFT', 'Microsoft Corp',                     'NASDAQ', 'stock', 'US', 'USD', 'Information Technology'),
  ('NVDA', 'NVIDIA Corp',                        'NASDAQ', 'stock', 'US', 'USD', 'Information Technology'),
  ('AMZN', 'Amazon.com',                         'NASDAQ', 'stock', 'US', 'USD', 'Consumer Discretionary'),
  ('TSLA', 'Tesla Inc',                          'NASDAQ', 'stock', 'US', 'USD', 'Consumer Discretionary'),
  ('BRK.B','Berkshire Hathaway Class B',         'NYSE',   'stock', 'US', 'USD', 'Financials'),
  ('GLD',  'SPDR Gold Trust',                    'NYSEARCA','etf',  'US', 'USD', 'Commodities'),
  ('UBER', 'Uber Technologies',                  'NYSE',   'stock', 'US', 'USD', 'Industrials'),
  ('DPZ',  'Domino''s Pizza',                    'NYSE',   'stock', 'US', 'USD', 'Consumer Discretionary'),
  ('HD',   'Home Depot',                         'NYSE',   'stock', 'US', 'USD', 'Consumer Discretionary'),
  ('UNH',  'UnitedHealth Group',                 'NYSE',   'stock', 'US', 'USD', 'Health Care'),
  ('CMG',  'Chipotle Mexican Grill',             'NYSE',   'stock', 'US', 'USD', 'Consumer Discretionary'),
  ('NKE',  'Nike Inc',                           'NYSE',   'stock', 'US', 'USD', 'Consumer Discretionary'),
  ('FERG', 'Ferguson Enterprises',               'NYSE',   'stock', 'US', 'USD', 'Industrials'),
  ('SEG',  'Seagate Technology',                 'NASDAQ', 'stock', 'US', 'USD', 'Information Technology'),
  ('LBRDA','Liberty Broadband Class A',          'NASDAQ', 'stock', 'US', 'USD', 'Communication Services'),
  ('LBRDK','Liberty Broadband Class C',          'NASDAQ', 'stock', 'US', 'USD', 'Communication Services'),
  ('FWONK','Liberty Media Formula One C',        'NASDAQ', 'stock', 'US', 'USD', 'Communication Services'),
  ('CHV',  'Charter Holdings',                   'NASDAQ', 'stock', 'US', 'USD', 'Communication Services')
on conflict (symbol, exchange) do update set
  name = excluded.name, sector = excluded.sector;

-- CUSIP → instrument_id aliases. Subquery to pull current row id.
insert into public.instrument_aliases (instrument_id, alias_kind, alias_value, source)
select i.id, 'cusip', a.cusip, 'manual_backfill'
from (values
  ('AAPL',  '037833100'),
  ('BAC',   '060505104'),
  ('AXP',   '025816109'),
  ('KO',    '191216100'),
  ('CVX',   '166764100'),
  ('OXY',   '674599105'),
  ('KHC',   '500754106'),
  ('MCO',   '615369105'),
  ('SIRI',  '829933100'),
  ('VRSN',  '92343E102'),
  ('CHTR',  '16119P108'),
  ('LSXMK', '531229854'),
  ('KR',    '501044101'),
  ('LPX',   '546347105'),
  ('NU',    'G6683N103'),
  ('JPM',   '46625H100'),
  ('GOOG',  '02079K107'),
  ('GOOGL', '02079K305'),
  ('META',  '30303M102'),
  ('MSFT',  '594918104'),
  ('NVDA',  '67066G104'),
  ('AMZN',  '023135106'),
  ('TSLA',  '88160R101'),
  ('BRK.B', '084670702'),
  ('GLD',   '78463V107'),
  ('UBER',  '90353T100'),
  ('DPZ',   '25754A201'),
  ('HD',    '437076102'),
  ('UNH',   '91324P102'),
  ('CMG',   '169656105'),
  ('NKE',   '654106103'),
  ('FERG',  'G3445A107'),
  ('SEG',   'G7945E105'),
  ('LBRDA', '530307107'),
  ('LBRDK', '530307305'),
  ('FWONK', '531229862')
) as a(symbol, cusip)
join public.instruments i on i.symbol = a.symbol and i.country_code = 'US'
on conflict (alias_kind, alias_value) do nothing;
