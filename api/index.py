"""Vercel Python serverless entrypoint.

`vercel.json` rewrites `/api/(.*)` to `/api/index/$1`, so every request
under `/api/*` lands here. The middleware below strips the `/api/index`
prefix from the ASGI scope so FastAPI sees its native `/health`,
`/v1/...` paths.
"""

import sys
from pathlib import Path

# Vercel runs the function with cwd at repo root, so `api/` is not on sys.path.
# Locally, `cd api && uvicorn app.main:app` puts it there automatically.
sys.path.insert(0, str(Path(__file__).parent))

from app.main import app as fastapi_app  # noqa: E402


_PREFIX = "/api"


class StripPrefix:
    def __init__(self, inner, prefix):
        self.inner = inner
        self.prefix = prefix
        self.prefix_len = len(prefix)

    async def __call__(self, scope, receive, send):
        if scope["type"] in ("http", "websocket"):
            path = scope.get("path", "")
            if path.startswith(self.prefix):
                new_path = path[self.prefix_len:] or "/"
                scope = dict(scope)
                scope["path"] = new_path
                raw = scope.get("raw_path")
                if raw:
                    scope["raw_path"] = raw[self.prefix_len:] or b"/"
        await self.inner(scope, receive, send)


app = StripPrefix(fastapi_app, _PREFIX)
