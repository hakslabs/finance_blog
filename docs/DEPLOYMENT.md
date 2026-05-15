# Deployment

This is the operator runbook for getting Finance_lab onto the internet. Two services ship: the Vite/React app to **Vercel**, and the FastAPI service to **Fly.io**. Both are deployed by you, not by an agent. The agent owns the configs (`web/vercel.json`, `api/Dockerfile`, `api/fly.toml`) and this runbook; you own the secrets and the deploy CLI sessions.

**Blocking gate.** Per EP-0001 PR-12 and PR-14, the deployed URL is for **you only** until PR-14 ships real auth. The interim `X-Dev-User` header path lets anyone with the URL act as the dev user. Do not share the preview URL until PR-14 is merged.

## Architecture

```
browser  →  https://<vercel-project>.vercel.app   (Vercel static + SPA shell)
                       ↓ VITE_API_BASE_URL
              https://finance-lab-api.fly.dev     (Fly.io FastAPI service)
                       ↓ service-role key (server-only)
                  Supabase Postgres + Auth
```

Provider keys (Polygon, Alpha Vantage, Supabase service-role, JWT secret) live **only** in the Fly app's secret store. They never reach the browser. See `docs/SECURITY.md` for the rule and the rationale.

## Environment Matrix

`APP_ENV` is the single switch the backend uses to gate the dev-header path and surface docs routes.

| Variable                       | local                                  | preview (Vercel preview + Fly)         | prod (Vercel prod + Fly)               | Used by              |
| ------------------------------ | -------------------------------------- | -------------------------------------- | -------------------------------------- | -------------------- |
| `APP_ENV`                      | `local`                                | `preview`                              | `prod`                                 | api                  |
| `LOG_LEVEL`                    | `info`                                 | `info`                                 | `warn`                                 | api                  |
| `CORS_ORIGINS`                 | (defaulted; localhost only)            | `https://*-finance-lab.vercel.app`     | `https://finance-lab.vercel.app`       | api                  |
| `SUPABASE_URL`                 | `.env`                                 | Fly secret                             | Fly secret                             | api                  |
| `SUPABASE_SERVICE_ROLE_KEY`    | `.env`                                 | Fly secret                             | Fly secret                             | api                  |
| `SUPABASE_JWT_SECRET`          | (unused until PR-14)                   | Fly secret (PR-14)                     | Fly secret (PR-14)                     | api                  |
| `POLYGON_API_KEY`              | `.env`                                 | Fly secret                             | Fly secret                             | api                  |
| `ALPHA_VANTAGE_API_KEY`        | `.env`                                 | Fly secret                             | Fly secret                             | api                  |
| `VITE_API_BASE_URL`            | `http://localhost:8000`                | `https://finance-lab-api.fly.dev`      | `https://finance-lab-api.fly.dev`      | web (build-time)     |
| `VITE_DEV_USER_ID`             | `00000000-0000-4000-8000-000000000001` | **unset**                              | **unset**                              | web (build-time)     |
| `VITE_SUPABASE_URL`            | `.env`                                 | Vercel env                             | Vercel env                             | web (PR-14)          |
| `VITE_SUPABASE_ANON_KEY`       | `.env`                                 | Vercel env                             | Vercel env                             | web (PR-14)          |

Rules:

- Anything prefixed `VITE_` is **shipped to the browser bundle**. Never put a server-only secret there.
- Setting `VITE_DEV_USER_ID` outside of `local` would defeat the dev-header gate; leave it empty in Vercel preview/prod project settings.
- `CORS_ORIGINS` accepts a comma-separated list. The backend splits on commas (see `api/app/settings.py`).
- Fly secrets are write-only via `fly secrets set`. They never appear in `fly.toml` or in this repo.

See `.env.example` for the authoritative variable list and `docs/ENV.md` if a more detailed per-variable description exists.

## Vercel — Frontend

### One-time setup

1. `npm i -g vercel` (or `npx vercel ...` works without install).
2. From the repo root, run `vercel link` and answer:
   - Scope: your account / team.
   - Project name: `finance-lab` (or whatever you'll use as the canonical domain).
   - Root directory: **`web`** (this is the critical answer — the repo is a monorepo).
3. The link writes `.vercel/` (gitignored).

`web/vercel.json` declares the framework preset (`vite`), build/install commands, output directory (`dist`), the SPA catch-all rewrite, and an asset cache header. You do not need to set these in the Vercel UI; the JSON wins.

### Environment variables

In the Vercel project dashboard → Settings → Environment Variables, add at least:

- `VITE_API_BASE_URL` — set to your Fly app's URL (see next section). Apply to **Preview** and **Production**.

Do **not** add `VITE_DEV_USER_ID` to Vercel.

### Deploy

```sh
# Preview (every push to a non-main branch gets one automatically when GitHub is connected)
vercel

# Production
vercel --prod
```

Output URL prints on the last line. Open it; the dashboard's `WatchlistCard` should hit the Fly backend.

## Fly.io — Backend

### One-time setup

```sh
brew install flyctl              # or curl -L https://fly.io/install.sh | sh
fly auth login                   # opens browser
cd api
fly launch --no-deploy           # accepts api/fly.toml; pick "yes" to keep existing config
```

`fly launch` will ask whether to create a Postgres or Redis; answer **no** to both. We use Supabase for storage and an in-process TTL cache.

If `fly launch` rewrites `fly.toml` to a different `app` name (because `finance-lab-api` is taken globally), keep the name it chose — it's globally unique across Fly. Update `VITE_API_BASE_URL` in Vercel to match.

### Set secrets

```sh
fly secrets set \
  SUPABASE_URL="https://<ref>.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="<...>" \
  POLYGON_API_KEY="<...>" \
  ALPHA_VANTAGE_API_KEY="<...>" \
  CORS_ORIGINS="https://finance-lab.vercel.app,https://finance-lab-git-main-<scope>.vercel.app"
# When PR-14 lands, add:
# SUPABASE_JWT_SECRET="<...>"
```

Verify with `fly secrets list` (names only — values never read back).

### Deploy

```sh
fly deploy
```

The build runs `api/Dockerfile`: stage 1 resolves dependencies via `uv sync --frozen`, stage 2 carries only `/opt/venv` + `app/`. First deploy takes ~2 minutes; subsequent code-only deploys are ~30 seconds because Fly caches the dependency layer.

### Verify

```sh
fly status                                                            # Machines: started
curl -sS https://<app>.fly.dev/health                                  # → {"status":"ok",...}
curl -sS https://<app>.fly.dev/v1/watchlists/me                        # → 401 (no auth header in prod)
fly logs                                                              # tail recent logs
```

The dev header **must** be rejected on Fly because `APP_ENV=prod` in the Dockerfile. A `200` from `/v1/watchlists/me` with an `X-Dev-User` header would be a deployment bug — file an issue and roll back.

## End-to-End Verification

Once both sides are deployed:

1. Visit the Vercel preview URL.
2. Dashboard `WatchlistCard` should render the **same** 4 instruments seen locally (AAPL/MSFT/SPY/005930.KS). If it shows the empty state or a 401, the browser is hitting the backend without an authenticated request — expected behavior until PR-14. The data path itself is verified by exercising the endpoint with a server-side `curl` while authenticated, not by the public preview.
3. `/stocks/AAPL` chart should render — that endpoint is read-only and not yet gated.

Acceptance is met when:

- Frontend reachable on a Vercel preview URL.
- Backend reachable on the Fly URL (`/health` returns 200).
- Frontend bundle in the browser DevTools network tab contains **no** provider keys (search for `POLYGON_` / `SUPABASE_SERVICE_ROLE_KEY` in the JS — must not be present).

## Rollback

- **Frontend:** Vercel dashboard → Deployments → previous deployment → "Promote to Production". Instant.
- **Backend:** `fly releases` to list, `fly releases rollback <version>` to revert. Takes ~30s.

## Out Of Scope (deferred)

- Custom domain (CNAME + cert): post-PR-14.
- Observability stack (Sentry, Logflare): PR-13 may add a `SENTRY_DSN_API` when ingestion failures start mattering.
- CI-driven deploy (GitHub Actions calling `vercel deploy` / `fly deploy`): the manual loop is fine for the solo phase. Revisit when a second contributor joins.
- Auto-deploy from `main`: deliberately disabled until PR-14 lifts the single-user gate.
