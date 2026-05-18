-- PR-32: correct Pabrai's filer_cik.
--
-- 0015 set Pabrai to CIK 0001173334 (Mohnish Pabrai personal), which
-- last filed 13F-HR in 2012 as a pre-XML .txt document — so the XML
-- parser returns 0 holdings.
--
-- Pabrai's active 13F-HR filings (2013→present) are under his fund's
-- filing entity, Dalal Street, LLC (CIK 0001549575). Verified via SEC
-- EDGAR full-text search (3-row holdings table parses cleanly).

update public.masters
   set filer_cik = '0001549575'
 where slug = 'pabrai';
