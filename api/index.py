"""Vercel Python serverless entrypoint.

Vercel discovers `*.py` files under `api/` at the repo root and serves
them as serverless functions. We expose the FastAPI ASGI app from this
file so a single function handles the entire `/api/*` surface.

Routing: `vercel.json` rewrites `/api/(.*)` to `/api/index/$1`. Vercel's
ASGI adapter strips the `/api/index` prefix before invoking the app, so
FastAPI sees its native `/v1/...` and `/health` paths unchanged.
"""

from app.main import app  # noqa: F401  (re-exported for Vercel)
