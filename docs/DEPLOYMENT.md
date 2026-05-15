# Deployment

Finance_lab ships as a **single Vercel project** that hosts both the Vite/React app and the FastAPI backend (as Python serverless functions). One git push deploys everything. The daily price-bar ingestion runs as a Vercel Cron Job — there is no separate server to babysit.

The deployed app requires Supabase Auth with Google OAuth. Configure the Supabase provider and `SUPABASE_JWT_SECRET` before sharing the URL.

## Architecture

```
browser
  │
  │  same-origin requests
  ▼
https://<vercel>.vercel.app
  ├── static SPA shell                    (vite build → web/dist)
  └── /api/*  →  api/index.py             (Vercel Python function, FastAPI ASGI)
                  │
                  ├──  Supabase REST       (data: profiles, watchlists, portfolios, prices)
                  └──  Polygon / AlphaVantage (only on cache miss)

Vercel Cron Jobs (defined in vercel.json):
  daily 22:30 UTC  →  GET /api/v1/internal/cron/refresh-us-daily
                       (Vercel attaches Authorization: Bearer ${CRON_SECRET})
                       FastAPI runs the Polygon grouped-daily fetch and
                       upserts price_bars_daily.
```

Provider keys (Polygon, Alpha Vantage, Supabase service-role, JWT secret) live **only** in the Vercel project's environment variables, scoped to server-side functions. Anything browser-side is prefixed `VITE_` and considered public.

## One-time setup

1. Push the repo to GitHub.
2. https://vercel.com/new → import the repo.
3. **Framework Preset:** leave as auto-detect (Vite is detected from `web/`).
4. **Root Directory:** keep as the repo root (do not change).
5. **Build & Output Settings:** `vercel.json` at the repo root carries the build command (`cd web && npm install && npm run build`) and output directory (`web/dist`). The Vercel UI will show these as derived from the config — leave them on auto.
6. Add the environment variables in the next section.
7. Click **Deploy**.

The first deploy can take ~2 min while Vercel installs Python deps from `api/requirements.txt`. Subsequent code-only deploys are ~30s.

## Environment variables

Add these in the Vercel project → Settings → Environment Variables, applied to **Production**, **Preview**, and **Development** unless noted otherwise.

### Server-only (Python functions can read these; never reach browser)

| Variable                    | Notes                                                                                                                                                     |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `APP_ENV`                   | `preview` for preview deploys, `prod` for production.                                                                                                     |
| `SUPABASE_URL`              | Same value used locally.                                                                                                                                  |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only. Never put in a `VITE_` variable.                                                                                                             |
| `SUPABASE_JWT_SECRET`       | Required from PR-14 onward.                                                                                                                               |
| `POLYGON_API_KEY`           | US OHLCV provider.                                                                                                                                        |
| `ALPHA_VANTAGE_API_KEY`     | US OHLCV fallback.                                                                                                                                        |
| `CRON_SECRET`               | Any high-entropy string. Vercel forwards this as the `Authorization` header on every cron invocation; the FastAPI cron route rejects mismatches with 401. |

### Browser-bundled (build-time, embedded into the JS bundle)

| Variable                 | Value                                     | Notes                                                   |
| ------------------------ | ----------------------------------------- | ------------------------------------------------------- |
| `VITE_API_BASE_URL`      | `/api`                                    | Relative URL so the SPA hits its own origin's `/api/*`. |
| `VITE_SUPABASE_URL`      | Public Supabase URL                       | Used from PR-14 once the browser participates in auth.  |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (public-safe by design) | Used from PR-14.                                        |

Rules:

- Anything prefixed `VITE_` is **shipped to the browser bundle**. Never put a server-only secret there. (See `docs/SECURITY.md`.)
- `CORS_ORIGINS` from the local stack is **not needed** in Vercel — the browser and API are same-origin once deployed.

## Deploy

After the initial setup, every push to the connected branch triggers a deploy automatically:

- Push to `main` → production deploy at `https://<project>.vercel.app`.
- Push to any other branch → preview deploy at `https://<project>-<hash>-<scope>.vercel.app`.

Manual deploy from CLI also works:

```sh
npm i -g vercel
vercel             # preview
vercel --prod      # production
```

## Vercel Cron

`vercel.json` declares one cron job:

```jsonc
"crons": [
  {
    "path": "/api/v1/internal/cron/refresh-us-daily",
    "schedule": "30 22 * * 1-5"   // 22:30 UTC, Mon–Fri (~18:30 ET ≈ post-market close)
  }
]
```

Vercel sends a `GET` to this path with `Authorization: Bearer ${CRON_SECRET}`. The FastAPI route runs the Polygon grouped-daily fetch (1 API call covering all US-listed symbols), filters to tracked instruments, upserts into `price_bars_daily`, and writes a row to `ingestion_runs`.

The job is **idempotent** via the composite primary key `(instrument_id, t)` — re-running for the same date is safe.

**Cron job constraints on Hobby tier:**

- Up to 2 cron jobs total (we use 1).
- Daily granularity (one trigger per day per job).
- Function timeout: 10s. The current job fits well under this since it's one fetch + one batched upsert.

## Verify

After the first deploy:

```sh
# Static + SPA
curl -sS https://<project>.vercel.app/ | head        # serves index.html

# API health
curl -sS https://<project>.vercel.app/api/health     # {"status":"ok",...}

# API auth gate
curl -sS -o /dev/null -w "%{http_code}\n" \
  https://<project>.vercel.app/api/v1/watchlists/me   # 401

# Cron auth gate
curl -sS https://<project>.vercel.app/api/v1/internal/cron/refresh-us-daily
# → 401 unauthenticated (no bearer) or 503 cron_disabled (env var missing)
```

Then in the browser at the deployed URL:

- Google sign-in should land back on the dashboard, and `WatchlistCard` should render rows for the signed-in user's profile.
- `/stocks/AAPL` chart renders from `price_bars_daily` (populated by the cron, or seeded once via the manual backfill below).
- `/portfolio` shows the signed-in user's portfolio.

DevTools → Network → check the JS bundle's source: searching for `POLYGON_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ALPHA_VANTAGE_API_KEY`, or `SUPABASE_JWT_SECRET` must yield **zero** hits.

## Manual ingestion / backfill

The cron handles steady-state. For the first deploy or for ad-hoc backfills:

```sh
# From your laptop, with .env loaded:
cd api
uv run python -m app.jobs.refresh_us_daily          # writes yesterday's bars
```

For multi-day backfill, throttle to Polygon's free-tier 5/min ceiling:

```sh
uv run python -c "
import asyncio, time
from datetime import date, timedelta
from app.jobs.refresh_us_daily import run
from app.settings import get_settings

async def main():
    s = get_settings()
    for i in range(60):
        target = date.today() - timedelta(days=i + 1)
        try:
            print(await run(s, target=target))
        except Exception as e:
            print(target, 'fail', e)
        await asyncio.sleep(13)   # respect 5/min

asyncio.run(main())
"
```

## Rollback

- **Frontend or backend regression:** Vercel dashboard → Deployments → previous deployment → **Promote to Production**. Instant. Both the SPA bundle and the Python function roll back atomically because they ship together.
- **Migration regression:** revert the offending migration via `psql` against `SUPABASE_DB_URL`, or push a forward fix. Supabase has no built-in migration rollback for hosted projects.

## Out Of Scope (deferred)

- Custom domain (CNAME + cert): post-PR-14.
- Observability (Sentry, Logflare): wire `SENTRY_DSN_API` later when ingestion failures start mattering.
- KR price ingestion via KRX OpenAPI: a second cron + job lands when the KR data path is in scope.
- Long backfills (>5 days) as Vercel functions: 10s timeout is too tight; keep backfills on the laptop.
