# Verification & Doc-Reconciliation — 2026-06-04

Live audit of "documented vs. actually implemented", run against a booted stack.
Goal: read the docs, verify behavior on the running app, document the gaps, and
implement from the docs.

## How the stack was run (reproducible)

Port `:8000` was occupied by an unrelated local Docker service, so the API ran on
`:8010` and the Vite proxy was pointed at it via a new env override:

```bash
# API (reads repo-root .env via pydantic-settings)
cd api && uv run uvicorn app.main:app --host 127.0.0.1 --port 8010
# Web (proxy /api → :8010 instead of the default :8000)
cd web && VITE_PROXY_TARGET=http://127.0.0.1:8010 npx vite --port 3000 --host 127.0.0.1
```

`web/vite.config.ts` now reads `process.env.VITE_PROXY_TARGET` (default
`http://127.0.0.1:8000`) so the API port is configurable without editing the file.

## Backend behavior — verified live (all 200 + real values)

| Endpoint                       | Result                                                        |
| ------------------------------ | ------------------------------------------------------------- |
| `/health`                      | `{"status":"ok"}`                                             |
| `/v1/market/indices`           | KOSPI 8801.49, live                                           |
| `/v1/movers?market=US` / `=KR` | real movers (CELCUITY…, LG이노텍…)                            |
| `/v1/sentiment/fear-greed`     | 54 中立, 251d history                                         |
| `/v1/sectors?market=US`        | real per-sector returns                                       |
| `/v1/macros/indicators`        | FRED DFF 3.62%, real                                          |
| `/v1/news`                     | Finnhub real (362+ rows)                                      |
| `/v1/masters`                  | 8 investors, real                                             |
| `/v1/calendar`                 | real earnings/dividend                                        |
| `/v1/stocks/AAPL/bars`         | real OHLCV                                                    |
| `/v1/stocks/AAPL/profile`      | Finnhub profile+metrics (mktcap, PE, PB, ROE, beta, EPS, 52w) |
| `/v1/reports`                  | real (BlackRock…)                                             |

## Frontend gates — verified

- `npx playwright test tests/playwright/chart-smoke.spec.ts` → **6/6 passed** against
  the live stack. (This is the gate `chart-ui-continuation.md` flagged as never run.)
- `/terminal` renders real data in every wired panel with **0 page errors**.
- `web && tsc --noEmit` clean.

## P6 "known follow-ups" — re-verified status

See PLAN.md for the updated list. Summary: 4 of the 5 original follow-ups are
**already resolved** in current code (MasterDetail holdings, Reports, News, KRX
daily). The docs had simply not been updated since the P6 snapshot.

The one genuinely-open backend item: **`sector_metrics` has no in-repo refresh job**.
`/v1/sectors` reads a populated table (live probe returns real returns), but nothing
in `api/app/jobs/` recomputes it on a schedule. A `jobs/refresh_sector_metrics.py` +
cron route + `vercel.json` entry is the remaining piece. Not a render gap today.

## Documentation gaps found & fixed in this pass

- `docs/exec-plans/active/EP-0001-mvp-foundation.md` — 22 stale `web/src` paths → `web/client/src`.
- `docs/design-docs/schema-master-plan.md` — 1 stale `web/src` path → `web/client/src`.
- `docs/FRONTEND-MAP.md` — added the `/terminal` route row and `lib/indicators.ts`;
  corrected the false "`lib/data.ts` was deleted" note (the file exists, used as a
  fallback).
- `PLAN.md` — rewrote the stale follow-up list to verified reality + added the Terminal note.

## Implementation done from docs (real-data-on-screen core belief)

- `pages/Terminal.tsx` Fundamentals panel rewired from the sparse movers row (mostly
  "—") to the live `/v1/stocks/:symbol/profile` endpoint. AAPL now shows mktcap $4.56T,
  PER 37.09x, PBR 50.98x, ROE 146.69%, div 0.35%, beta 1.09, EPS 8.27, 52w 195.07–316.94,
  industry Technology, with a `LIVE` badge. KR symbols (Finnhub US-only) show an honest
  "Finnhub 프로파일 미제공 · DART/KRX 연동 대상" state — no fabricated numbers.

## Finishing pass — 2026-06-05 (ready-to-use bar)

Full-app sweep so the product runs clean with no rough edges.

- **Bug: News `400`** — `/v1/news` capped `limit` at `le=50` but `pages/News.tsx`
  requests 60. Raised the backend cap to `le=100` (`api/app/routes/news.py`). Verified
  `limit=60` → 200 / 60 items.
- **Bug: Reports React key warning** — the report-row `.map` returned a keyless
  shorthand `<>`. Switched to `<Fragment key={report.id}>` (`pages/Reports.tsx`).
- **One-command run** — `scripts/dev.sh` + root `npm run dev` boot API + web together,
  auto-pick a free API port (8000→8010…), and wire the Vite `/api` proxy to it via the
  new `VITE_PROXY_TARGET`. README "빠른 실행" section rewritten (was describing a
  design-skeleton; now documents the real full-stack run + verify gates).
- **Regression test** — added a `/terminal` smoke test to `tests/playwright/chart-smoke.spec.ts`
  asserting all panels render, the candle canvas paints, Fundamentals shows live `$X.XXT`
  market cap, and there are zero page errors.

**Final gate run (all green):**

- 13/13 routes audited in a headless browser → **0 console errors, 0 warnings**.
- `tests/playwright/chart-smoke.spec.ts` → **7/7 passed** (6 chart + 1 terminal).
- `npm run lint` (markdownlint + `tsc --noEmit`) clean · `npm run format:check` clean ·
  `npm --prefix web run build` clean.

Note: `scripts/ingest_sector_metrics.py` already exists (the sector-metrics gap noted
above is a _scheduling/automation_ item, not a missing computation — `/v1/sectors`
serves real data today).

## Remaining (non-blocking, future scope — not on the ready-to-use path)

1. Wrap `scripts/ingest_sector_metrics.py` as a cron job for unattended refresh.
2. `ingest_fear_greed.py` KR proxy TODO (KR fear/greed currently US-shaped).
3. ~63 `CUSIP-*` placeholder instruments (needs paid CUSIP-history source).
4. Terminal: drag/resize panels + per-user layout persistence; real APIs for
   flow/L2/options; Gemini AI for the assistant (currently local rule-based).
