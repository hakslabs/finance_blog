# Environment Variables

Single matrix of every env variable Finance_lab uses. `.env.example` is the copy-paste template; this doc is the **operations manual** — where each value comes from, who consumes it, whether it is browser-safe, and what breaks when it is missing.

If a new variable is introduced, add a row here in the same PR. If a row says "browser-safe: no" and someone tries to prefix it `VITE_`, this doc is the authority that says stop.

## Conventions

- Root `.env` is shared by `web/` and `api/` (see `docs/design-docs/repo-layout.md`).
- `VITE_`-prefixed variables are baked into the browser bundle by Vite. Anything not prefixed is server-only.
- Provider keys live server-side only, regardless of "secret-ness." If a browser needs to reach a provider, it goes through FastAPI.
- "First PR" column says when the variable first becomes required. Until that PR, leaving it empty is fine.

## Matrix

### App config

| Variable            | Used by | Browser-safe   | Source                               | First PR | Required           | Missing behavior                                     |
| ------------------- | ------- | -------------- | ------------------------------------ | -------- | ------------------ | ---------------------------------------------------- |
| `APP_ENV`           | api     | no             | you (`local` / `preview` / `prod`)   | PR-07    | yes                | API refuses to start; controls dev-header acceptance |
| `LOG_LEVEL`         | api     | no             | you (`debug`/`info`/`warn`/`error`)  | PR-07    | no, default `info` | log verbosity only                                   |
| `VITE_API_BASE_URL` | web     | yes (URL only) | you (`http://localhost:8000` in dev) | PR-09    | yes                | every API call fails                                 |

### Supabase

| Variable                    | Used by                  | Browser-safe         | Source                                                       | First PR | Required                                | Missing behavior                |
| --------------------------- | ------------------------ | -------------------- | ------------------------------------------------------------ | -------- | --------------------------------------- | ------------------------------- |
| `SUPABASE_URL`              | api                      | no                   | Supabase Dashboard → Settings → API → Project URL            | PR-08    | yes                                     | DB access fails                 |
| `SUPABASE_SERVICE_ROLE_KEY` | api                      | **no, never**        | Supabase Dashboard → Settings → API → service_role           | PR-10    | yes                                     | ingest / RLS-bypass writes fail |
| `SUPABASE_DB_URL`           | supabase CLI, migrations | no                   | Supabase Dashboard → Settings → Database → Connection string | PR-08    | yes                                     | `supabase db push` fails        |
| `SUPABASE_PROJECT_REF`      | supabase CLI / MCP       | no                   | dashboard URL (`https://app.supabase.com/project/<ref>`)     | PR-08    | yes                                     | CLI cannot target project       |
| `SUPABASE_ACCESS_TOKEN`     | supabase CLI             | no                   | https://app.supabase.com/account/tokens                      | PR-08    | yes for CLI ops                         | CLI auth fails                  |
| `VITE_SUPABASE_URL`         | web                      | yes                  | same URL as `SUPABASE_URL`                                   | PR-08    | yes once browser uses Supabase directly | client init fails               |
| `VITE_SUPABASE_ANON_KEY`    | web                      | yes (anon is public) | Supabase Dashboard → Settings → API → anon                   | PR-08    | yes once browser uses Supabase directly | client init fails               |
| `SUPABASE_JWT_SECRET`       | api                      | no                   | Supabase Dashboard → Settings → API → JWT Secret             | PR-14    | yes at PR-14                            | real auth verification fails    |
| `VITE_DEV_USER_ID`          | web                      | yes (dev only)       | uuid you choose, seeded by PR-08                             | PR-09    | yes in dev                              | dev header empty → 401          |

### Auth (PR-14)

Google OAuth client ID/secret are pasted into the **Supabase Dashboard**, not the app `.env`. No app variables for those.

### Vercel (deployment, PR-12)

| Variable            | Used by           | Browser-safe | Source                                      | First PR | Required           | Missing behavior            |
| ------------------- | ----------------- | ------------ | ------------------------------------------- | -------- | ------------------ | --------------------------- |
| `VERCEL_TOKEN`      | CI / `vercel` CLI | no           | https://vercel.com/account/tokens           | PR-12    | yes for CI deploys | manual `vercel deploy` only |
| `VERCEL_ORG_ID`     | CI                | no           | `vercel link` writes `.vercel/project.json` | PR-12    | yes for CI         | scope ambiguity             |
| `VERCEL_PROJECT_ID` | CI                | no           | same as above                               | PR-12    | yes for CI         | scope ambiguity             |

### Backend hosting (open question — finalized in PR-12)

Picked target (Render / Fly / NAS) adds 1–2 variables. Examples:

- Render: `RENDER_API_KEY` (only if using CI deploys).
- Fly: `FLY_API_TOKEN`.

Add the chosen row when PR-12 begins.

### Market data providers

| Variable                | Used by                 | Browser-safe | Source                                        | First PR              | Required                              | Missing behavior                                     |
| ----------------------- | ----------------------- | ------------ | --------------------------------------------- | --------------------- | ------------------------------------- | ---------------------------------------------------- |
| `POLYGON_API_KEY`       | api                     | no           | https://polygon.io/dashboard/signup           | PR-10                 | yes                                   | US daily OHLCV pipeline disabled                     |
| `KRX_API_KEY`           | api                     | no           | http://openapi.krx.co.kr (~1 day approval)    | PR-10                 | yes                                   | KR daily OHLCV pipeline disabled                     |
| `ALPHA_VANTAGE_API_KEY` | api, `alphavantage` MCP | no           | https://www.alphavantage.co/support/#api-key  | PR-10 (fallback)      | optional; required when Polygon fails | US fallback unavailable                              |
| `SEC_USER_AGENT`        | api                     | no           | you — `"Finance_lab Research <hi@haklee.me>"` | post-MVP (filings)    | yes for EDGAR calls                   | SEC rejects with 403                                 |
| `DART_API_KEY`          | api                     | no           | https://opendart.fss.or.kr/                   | post-MVP (KR filings) | yes                                   | KR filings/financials unavailable                    |
| `KIS_APP_KEY`           | api                     | no           | https://apiportal.koreainvestment.com/        | deferred              | optional                              | KIS path disabled (acceptable per `data-sources.md`) |
| `KIS_APP_SECRET`        | api                     | no           | same as above                                 | deferred              | optional                              | same                                                 |

### Macro providers

| Variable       | Used by | Browser-safe | Source                                            | First PR                        | Required         | Missing behavior               |
| -------------- | ------- | ------------ | ------------------------------------------------- | ------------------------------- | ---------------- | ------------------------------ |
| `FRED_API_KEY` | api     | no           | https://fred.stlouisfed.org/docs/api/api_key.html | post-MVP (dashboard indicators) | yes for US macro | indicators show stale or empty |
| `ECOS_API_KEY` | api     | no           | https://ecos.bok.or.kr/api/ (~1 day approval)     | post-MVP (KR macro)             | yes for KR macro | KR indicators unavailable      |

### Observability (deferred)

| Variable              | Used by | Browser-safe        | Source                         | First PR | Required | Missing behavior             |
| --------------------- | ------- | ------------------- | ------------------------------ | -------- | -------- | ---------------------------- |
| `SENTRY_DSN_API`      | api     | no                  | https://sentry.io/ project DSN | deferred | optional | no server-side error capture |
| `VITE_SENTRY_DSN_WEB` | web     | yes (DSN is public) | same                           | deferred | optional | no client-side error capture |

Add observability rows only when an EP picks the tool.

## Procurement Checklist

Things you (the human) should sign up for or generate. Do these before the dependent PR starts:

- [ ] Supabase project created → grab `SUPABASE_URL`, anon key, service_role, DB URL, project ref, JWT secret, personal access token. **Needed by PR-08.**
- [ ] **Polygon.io key → `POLYGON_API_KEY`. Instant signup. US daily pipeline depends on it.**
- [ ] **KRX OpenAPI key → `KRX_API_KEY`. ~1 day approval — apply now.** KR daily pipeline depends on it.
- [ ] **ECOS key → `ECOS_API_KEY`. ~1 day approval — apply now.**
- [ ] Alpha Vantage key → `ALPHA_VANTAGE_API_KEY`. Instant. US fallback + already used by the `alphavantage` MCP.
- [ ] DART key → `DART_API_KEY`. Instant.
- [ ] FRED key → `FRED_API_KEY`. Instant.
- [ ] Pick `SEC_USER_AGENT` string. No signup.
- [ ] Vercel personal token, link the project once → `VERCEL_TOKEN`/`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID`. **Needed by PR-12.**
- [ ] Google OAuth client (for PR-14 only). Defer until that PR is next.
- [ ] KIS OpenAPI (deferred per `data-sources.md`). Skip unless re-evaluated.

## Browser-Safety Rule

Before adding a `VITE_` prefix to any variable, ask: **does the browser need this, and would I be okay finding this value in a public GitHub bundle search?** If the answer to the second is no, the prefix is wrong. Supabase anon key is fine (it is designed to be public). Service role key, JWT secret, and any provider key are never fine.

## When `.env` And This Doc Disagree

This doc wins. Update `.env.example` to match, and call out the drift in the PR description.
