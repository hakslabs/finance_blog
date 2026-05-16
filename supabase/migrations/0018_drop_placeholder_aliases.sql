-- PR-28 follow-up to 0017: delete CUSIP aliases pointing at placeholder
-- instruments (symbol like 'CUSIP-%') for CUSIPs that now have a real
-- alias from 0017. The next 13F ingest will then resolve those CUSIPs
-- to the real ticker.
--
-- We do NOT delete the placeholder instruments themselves yet — they're
-- still referenced by existing filing_holdings rows; those get rewritten
-- on the next ingest.

delete from public.instrument_aliases a
 where a.alias_kind = 'cusip'
   and a.source = 'sec_13f'
   and exists (
     select 1 from public.instrument_aliases b
      where b.alias_kind = 'cusip'
        and b.alias_value = a.alias_value
        and b.source = 'manual_backfill'
   );

-- Also wipe the existing filing_holdings for the seeded masters so the
-- next ingest re-creates them against the real instrument ids.
delete from public.filing_holdings
 where filing_id in (
   select f.id from public.filings f
   join public.masters m on m.filer_cik = f.filer_cik
   where f.form_kind = '13F'
 );
