-- Annual sector returns are computed from the nearest valid trading day to
-- the one-year calendar anniversary. Nullable preserves honest output while
-- a newly listed instrument has insufficient history.
alter table public.sector_metrics
  add column if not exists return_year double precision;
