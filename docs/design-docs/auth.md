# Authentication

## Decision

Use **Supabase Auth** with **Google OAuth** as the only sign-in method. Email magic link may be enabled later if a non-Google tester needs access. No password login, no other OAuth providers, no custom auth.

## Why

- Supabase is already the database. Auth comes with it for free, including JWT issuance, OAuth callback handling, and `auth.uid()` integration with RLS — so PR-08 RLS policies can be written once and not rewritten.
- Solo project, single primary user, occasional testers. Google account coverage is sufficient. Anything more is wasted setup.
- Self-hostable later (GoTrue) if the project migrates off Supabase, matching the portability invariant in `ARCHITECTURE.md`.

## Deferral Policy

Auth integration is the **last** implementation step. It does not block any data-path PR. Until it lands:

- `APP_ENV=local` enables the dev header `X-Dev-User: <uuid>`. FastAPI accepts it, looks up the row, and treats the request as authenticated as that user.
- Deployment during the dev-header era is single-user, unadvertised URL only. **Do not share a deployed URL with a second person until PR-14 (Supabase Auth) is merged.**
- The dev header is rejected when `APP_ENV != local`. This is a hard server-side check, not a UI affordance.

## Dev Header Contract (interim)

- Header: `X-Dev-User: <uuid>`
- The uuid must match a row in `profiles` seeded by the migration. PR-08 seeds one row for the developer.
- If missing or unknown, the API returns `401 unauthenticated` per `docs/API.md`.
- Frontend in dev sets this header automatically from `VITE_DEV_USER_ID` in `.env`. Production builds must error if `VITE_DEV_USER_ID` is set.

## Target State (PR-14)

- Browser uses `@supabase/supabase-js` to sign in with Google. Supabase returns a JWT.
- Frontend stores the session via Supabase's helpers and attaches `Authorization: Bearer <jwt>` to every API call.
- FastAPI verifies the JWT using the Supabase project's JWT secret (env: `SUPABASE_JWT_SECRET`). On success, request context gets `user_id = jwt.sub`.
- RLS policies use `auth.uid()` and continue to work unchanged from PR-08.
- The dev header path is deleted in the same PR. There is no overlap window where both are accepted in production.

## Operator Action Required (you)

When PR-14 begins, **you** must:

1. Create an OAuth 2.0 Client ID in Google Cloud Console (type: Web application). Authorized redirect URI is the Supabase project's `https://<ref>.supabase.co/auth/v1/callback`.
2. Paste client ID and secret into Supabase Dashboard → Auth → Providers → Google. Enable.
3. Copy `SUPABASE_JWT_SECRET` from Supabase Dashboard → Project Settings → API into `.env`.

These are dashboard-only steps; nothing lands in code. The PR's agent cannot do them.

## Out Of Scope

- Multi-tenant accounts, organizations, role-based access.
- Email/password sign-in.
- Custom session management or refresh-token rotation beyond what Supabase provides.
- Apple/GitHub/Kakao OAuth — add only when a real user requests it.
