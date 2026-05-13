# First Real Data Decision

This document fixes the single concrete data path that satisfies the "real data on screen" milestone in `ARCHITECTURE.md` and `docs/product-specs/finance-lab-mvp.md`. PR-10 implements exactly this; alternatives are out of scope until it lands.

## Choice

- **Symbol:** `AAPL` (US, in S&P 500 + Nasdaq 100).
- **Surface:** `/stocks/AAPL` price block + daily chart from 6 months of bars.
- **Provider:** **Polygon.io** via FastAPI. Specifically:
  - `GET /v2/aggs/ticker/AAPL/range/1/day/{from}/{to}` for the chart range.
  - `GET /v2/aggs/ticker/AAPL/prev` for the latest close + change.
- **Fallback provider:** Alpha Vantage (`ALPHA_VANTAGE_API_KEY`) — wired in PR-10 as a single per-symbol top-up path. KR provider (KRX OpenAPI) is irrelevant to this PR because the chosen symbol is US.
- **Endpoint:** `GET /v1/quotes/{symbol}` returns the shape defined in `docs/API.md`.
- **Cache:** in-process TTL of 60s in the FastAPI worker; no Redis, no Supabase cache table in PR-10. (Daily-bar table lands when the cron does — PR-13.)

## Why this pick

- Polygon's free tier covers EOD US data with 2 years of history. The same provider scales to the full S&P 500 + Nasdaq 100 universe via grouped-daily endpoints later (see `docs/design-docs/data-sources.md`).
- Official API, key-based, no scraping. yfinance is explicitly rejected for this project.
- One symbol, one endpoint, one surface keeps PR-10 small enough to fit a single agent session.
- Fall-back to Alpha Vantage is documented but minimally implemented in PR-10 (single retry path), so PR-10 stays scoped.

## Failure handling

- Provider error → return the most recent cached payload and set `stale: true`. UI shows `last_refreshed_at` plus a "stale" badge.
- No cache yet → return `503 upstream_unavailable` with a typed error body; UI shows an empty-state card, not a crash.
- Rate limit observed (Polygon free: 5/min) → log it server-side and degrade to cached value; do not surface raw provider errors to the browser.
- If Polygon is unreachable entirely → call Alpha Vantage for this one symbol as a last attempt before returning stale.

## Browser exposure

- No provider key reaches the browser. FastAPI is the only caller. This matches `docs/SECURITY.md` and the `VITE_` rule in `docs/ENV.md`.

## Follow-Up After PR-10 Lands

- PR-10b (informal): add a second symbol from KOSPI 200 via KRX OpenAPI (`KRX_API_KEY`) so the KR path is exercised once before the cron in PR-13 wires everything.
- PR-13 (cron): replace the in-process TTL with persisted daily bars driven by the scheduled grouped-daily fetch.
