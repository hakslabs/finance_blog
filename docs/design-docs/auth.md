# Authentication

## Decision

Use **Supabase Auth** with **Google OAuth** as the only sign-in method. Email magic link may be enabled later if a non-Google tester needs access. No password login, no other OAuth providers, no custom auth.

## Why

- Supabase is already the database. Auth comes with it for free, including JWT issuance, OAuth callback handling, and `auth.uid()` integration with RLS — so PR-08 RLS policies can be written once and not rewritten.
- Solo project, single primary user, occasional testers. Google account coverage is sufficient. Anything more is wasted setup.
- Self-hostable later (GoTrue) if the project migrates off Supabase, matching the portability invariant in `ARCHITECTURE.md`.

## Runtime Contract

- Browser uses `@supabase/supabase-js` to sign in with Google. Supabase returns a JWT.
- Frontend stores the session via Supabase's helpers and attaches `Authorization: Bearer <jwt>` to every API call.
- FastAPI verifies the JWT using the Supabase project's JWT secret (env: `SUPABASE_JWT_SECRET`). On success, request context gets `user_id = jwt.sub`.
- If the matching `profiles` row does not exist yet, the API creates a minimal row with the JWT `sub` and email before reading user-owned data. For a freshly rebuilt solo database, the first real user also claims the seeded dev watchlist and portfolio rows from `00000000-0000-4000-8000-000000000001`.
- RLS policies use `auth.uid()` and continue to work unchanged from PR-08.
- Missing or invalid bearer tokens return `401 unauthenticated` per `docs/API.md`.

## Operator Action Required (you)

To enable Google OAuth, **you** must:

1. Create an OAuth 2.0 Client ID in Google Cloud Console (type: Web application). Authorized redirect URI is the Supabase project's `https://<ref>.supabase.co/auth/v1/callback`.
2. Paste client ID and secret into Supabase Dashboard → Auth → Providers → Google. Enable.
3. Copy `SUPABASE_JWT_SECRET` from Supabase Dashboard → Project Settings → API into `.env`.

These are dashboard-only steps; nothing lands in code. The PR's agent cannot do them.

## Out Of Scope

- Multi-tenant accounts, organizations, role-based access.
- Email/password sign-in.
- Custom session management or refresh-token rotation beyond what Supabase provides.
- Apple/GitHub/Kakao OAuth — add only when a real user requests it.
