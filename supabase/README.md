# Supabase

PR-08 introduces the minimum database surface needed by the PR-09 dashboard watchlist path.

## Local Reset

```bash
npx supabase start
npx supabase db reset
```

The reset applies `migrations/0001_mvp_foundation.sql` and then loads `seed/instruments.sql`.

## RLS Check

Run this after migrations and seed:

```bash
docker exec -i supabase_db_finance psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/rls_watchlists.sql
```

The script runs inside a transaction and rolls back. It raises an exception if a second user can see or mutate another user's watchlist rows.

Note: `npx supabase db query < supabase/tests/rls_watchlists.sql` currently fails on CLI 2.98.2 because multi-statement input is sent as a prepared statement. Use the container `psql` command above for this verification.

## Dev User

The seeded local profile id is:

```text
00000000-0000-4000-8000-000000000001
```

Use the same value for `VITE_DEV_USER_ID` until Supabase Auth replaces the dev header in PR-14.
