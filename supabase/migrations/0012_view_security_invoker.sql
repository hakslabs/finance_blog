-- Bugfix: recreate public.master_filings with security_invoker = true.
-- The previous definition in migration 0010 omitted the option, which Supabase's
-- linter flags ("Security Definer View") because views without security_invoker
-- enforce the creator's permissions instead of the caller's. The view is read-
-- only and reads tables that already carry public-read RLS, so behavior doesn't
-- change in practice — but making the invoker context explicit is the safer
-- default.

create or replace view public.master_filings with (security_invoker = true) as
select
  m.id              as master_id,
  m.slug            as master_slug,
  m.name            as master_name,
  f.id              as filing_id,
  f.period_end      as period_end,
  f.filed_at        as filed_at,
  fh.instrument_id  as instrument_id,
  fh.shares         as shares,
  fh.market_value   as market_value,
  fh.weight_pct     as weight_pct,
  fh.position_kind  as position_kind
from public.masters m
join public.filings f
  on f.form_kind = '13F'
 and f.filer_cik = m.filer_cik
 and m.filer_cik is not null
join public.filing_holdings fh
  on fh.filing_id = f.id;

comment on view public.master_filings is
  'TIER-3.6 derived view: quarterly 13F changes per master via filer_cik join. security_invoker=true so RLS evaluates against the caller, not the view owner.';

grant select on public.master_filings to anon, authenticated;
