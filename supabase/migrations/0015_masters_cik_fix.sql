-- PR-28 follow-up: correct two filer_cik values so 13F ingestion finds
-- their actual filing entities (the funds), not the parent corp.
--
-- Howard Marks files under Oaktree Capital Management LP (the filing
-- entity), not the parent group corp. Pabrai files under Dalal Street LLC.

update public.masters
   set filer_cik = '0000949509'
 where slug = 'marks';

update public.masters
   set filer_cik = '0001173334'
 where slug = 'pabrai';
