# API Contract

Single source of truth for the FastAPI surface that `web/` consumes. Every endpoint added in PR-07 onward must be defined here **before** code lands. Frontend and backend agents read from this doc, so a field name disagreement is a doc bug, not a code bug.

## Conventions

### Base

- Local dev base URL: `http://localhost:8000`
- Prefix every endpoint with `/v1/`. Bump to `/v2/` only when a breaking change is unavoidable.

### Auth

- Production (lands in PR-14, the **final** PR): `Authorization: Bearer <supabase-jwt>`. Backend verifies with `SUPABASE_JWT_SECRET` and extracts `user_id` from `jwt.sub`.
- Interim (PR-09 through PR-13): `X-Dev-User: <uuid>`. Accepted **only** when `APP_ENV=local`. See `docs/design-docs/auth.md` for the full contract and deferral rationale.
- Endpoints that require auth list `Auth: required` below. Public endpoints list `Auth: none`.

### Response Shapes

- All responses are JSON objects, never bare arrays. Lists go inside `{ "items": [...] }` so future pagination metadata can be added without breaking clients.
- Timestamps are ISO 8601 UTC strings, fields suffix `_at`. Example: `last_refreshed_at: "2026-05-12T09:00:00Z"`.
- Money and prices are JSON numbers in MVP. Currency is a separate `currency` field (ISO 4217). Switch to decimal-strings only when precision actually bites.
- Symbols are uppercase, exchange-qualified when needed (`AAPL`, `005930.KS`).

### Errors

All non-2xx responses use this shape:

```json
{
  "error": {
    "code": "string_enum",
    "message": "human-readable",
    "details": { }
  }
}
```

Standard codes:

| HTTP | code | When |
| --- | --- | --- |
| 400 | `bad_request` | Validation error on input. `details` lists the failing fields. |
| 401 | `unauthenticated` | Missing/invalid JWT. |
| 403 | `forbidden` | Authenticated but not allowed (RLS or scope). |
| 404 | `not_found` | Resource does not exist or is invisible to this user. |
| 429 | `rate_limited` | Upstream provider throttled or our own limit. |
| 503 | `upstream_unavailable` | External data source failed and no cache is usable. |

### Stale Data Flag

Endpoints that serve cached external data may return `stale: true` alongside the payload when the latest fetch failed and the response is a fallback. Frontend renders a "stale" badge plus `last_refreshed_at`. See `docs/design-docs/first-real-data.md`.

### Versioning Rules

- Additive (new optional fields, new endpoints): safe, no version bump.
- Renames or removals: bump to `/v2/`, keep `/v1/` alive for one release.
- Field semantics change (e.g. price now in cents): treat as breaking, bump version.

---

## Endpoints

### `GET /health`

- Auth: none.
- Purpose: liveness check, used by deploy and uptime probes.
- 200 response: `{ "status": "ok", "version": "0.1.0" }`.

### `GET /v1/watchlists/me`  *(PR-09)*

- Auth: required.
- Purpose: return the signed-in user's primary watchlist for the dashboard.
- Query params: none (MVP supports one watchlist per user).

200 response:

```json
{
  "watchlist": {
    "id": "uuid",
    "name": "string",
    "updated_at": "iso8601",
    "items": [
      {
        "symbol": "AAPL",
        "name": "Apple Inc.",
        "exchange": "NASDAQ",
        "currency": "USD",
        "last_price": 187.42,
        "last_price_at": "iso8601",
        "note": "optional user note or null"
      }
    ]
  }
}
```

Notes:

- `last_price` and `last_price_at` are nullable. In PR-09 they may always be null; PR-10 fills them once the quote source is wired.
- Empty watchlist returns `items: []`, not 404.

Errors: `401 unauthenticated`.

### `GET /v1/quotes/{symbol}`  *(PR-10)*

- Auth: required.
- Purpose: latest quote and recent OHLCV bars for one symbol. Backs the stock detail page.
- Path param: `symbol` — uppercase, exchange-qualified if non-US.
- Query params:
  - `interval` — one of `1d`, `1h`. Default `1d`.
  - `range` — one of `1mo`, `3mo`, `6mo`, `1y`, `5y`. Default `6mo`.

200 response:

```json
{
  "symbol": "AAPL",
  "currency": "USD",
  "last": 187.42,
  "change": 1.23,
  "change_pct": 0.66,
  "as_of": "iso8601",
  "bars": [
    { "t": "iso8601", "o": 186.1, "h": 188.0, "l": 185.8, "c": 187.42, "v": 50123400 }
  ],
  "last_refreshed_at": "iso8601",
  "stale": false
}
```

Errors:

- `404 not_found` — unknown symbol.
- `429 rate_limited` — provider throttled; client may retry after `Retry-After` seconds.
- `503 upstream_unavailable` — provider down and no cache; UI shows empty-state card.

### `GET /v1/portfolios/me`  *(PR-11, sketch — refine in that PR)*

- Auth: required.
- Returns the user's portfolio summary, holdings, and recent transactions. Final shape decided when PR-11 starts; reserve the endpoint name now so PR-09/10 don't collide.

---

## Adding A New Endpoint

1. Add a section to this file with method, path, auth, params, success shape, error shape.
2. Add the Pydantic model in `api/app/models/` and the route in `api/app/routes/`.
3. Add a typed wrapper in `web/src/lib/api-client.ts`.
4. The PR description must link to the section here.

If the frontend and backend disagree on a field, fix this doc first, then both sides.
