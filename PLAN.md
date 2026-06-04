# Goal Execution Status — COMPLETE

Goal: frontend-driven backend rebuild — every page personalized + data flows
cross-page; feature-based architecture; free-tier external APIs; data verified
end-to-end.

## Phases — all green

- [x] **P0** Inventory + mapping
- [x] **P1** Frontend foundation (lib/supabase, lib/http, AuthContext)
- [x] **P2** DB migration 0024 (10 new tables + role column) applied to remote
- [x] **P3** Backend routes (7 new + 2 rewritten; **90 routes** total)
- [x] **P4** Features + page wiring
  - 17 features/ modules (one per domain, service + hook + fallback)
  - WatchlistContext / BookmarkContext / FollowContext: server-synced
  - Components: AddTransactionDialog, PriceAlertDialog, EventMemoDialog
  - Pages wired: Portfolio, StockDetail, Calendar, LearnDetail, News,
    Stocks (live overlay), Admin Users, Masters feed mark-read,
    MyPage Alerts/Trades/Journal (KR enum ↔ EN backend translation)
- [x] **P5** External data ingestion (live, free tier)
  - 251d CNN Fear & Greed history
  - 5 chapters + 9 lessons (seed)
  - 409 US daily rows (refresh_us_daily)
  - 10 KR daily rows (refresh_kr_daily)
  - 362 news items (Finnhub)
  - 8 masters × 4 quarterly 13F filings (SEC EDGAR)
  - 17 analyst targets (AlphaVantage)
- [x] **P6** End-to-end verification
  - mig 0020–0024 applied to remote Supabase
  - API :8000 — 90 routes, /health = ok
  - Web :3000 — vite proxy /api → :8000 (rewrites /api prefix)
  - Live endpoints verified through proxy:
    - /api/v1/movers (BSX, AMAT, …)
    - /api/v1/sentiment/fear-greed → 251 days
    - /api/v1/lessons → 9
    - /api/v1/lessons/chapters → 5
    - /api/v1/news → 362
    - /api/v1/masters → 8
  - Frontend builds clean (`vite build`) and typechecks (`tsc --noEmit`)

## Architecture (final)

```
api/app/
  routes/<domain>.py     # 39 routers (FastAPI)
  repos/<domain>.py      # PostgREST proxy (RLS-scoped via user JWT)
  models/<domain>.py     # Pydantic
  jobs/<source>.py       # Cron ingest (fear_greed, 13f, finnhub, av_targets,
                         #              refresh_{us,kr}_daily)
  sources/<vendor>.py    # alphavantage cnn dart ecos finnhub fred krx
                         # polygon sec
  scripts/seed_lessons.py

web/client/src/
  lib/{supabase,http}.ts
  features/_shared/useAsync.ts
  features/<19 domains>/index.ts | service.ts | use-*.ts | sync.ts
  contexts/{Auth,Watchlist,Bookmark,Follow,LessonProgress?,Theme}Context.tsx
  components/{AddTransaction,PriceAlert,EventMemo}Dialog.tsx
  pages/ (mirror of finance-lab-pro; data via feature hooks + mock fallback)
```

## Cross-page personalization (working)

- Portfolio holding → News page personal impact %
- Watchlist (Home/Stocks/StockDetail) → MyPage / Portfolio
- Bookmark (any page) → MyPage bookmark tab
- Follow master → Masters feed → mark-read → backend
- Lesson completion → Learn / LearnDetail badges
- Trade entry (MyPage / Portfolio AddTransactionDialog) → Trades + Journal
- Alert (StockDetail / MyPage / Calendar) → MyPage Alerts tab

## Known follow-ups — re-verified 2026-06-04 (live stack: API :8010, web :3000)

Most of the original P6 follow-ups are now resolved in the current code; this list
is updated to the verified state. Evidence: backend endpoints probed live + page
audit.

- ✅ **MasterDetail holdings** — now live-wired via `useMaster` + `/v1/masters/:slug/holdings`
  (mock `MASTERS` is fallback-on-error only). Was: "mock-rich".
- ✅ **Reports page** — `pages/Reports.tsx` consumes `useReports` (live `/v1/reports`,
  returns BlackRock/etc. real rows); `REPORTS` mock only renders when the DB is empty.
- ✅ **News page** — `pages/News.tsx` consumes `useNews` (live `/v1/news`, 362+ rows);
  `ALL_NEWS` only renders on empty/error.
- ✅ **KRX daily** — `005930.KS` now returns 264 daily bars through `/v1/stocks/:symbol/bars`
  (was 10). KR charts render real KRX OHLCV.
- ⚠️ **sector_metrics refresh** — `/v1/sectors` reads a `sector_metrics` table that is
  currently populated (live probe returns real per-sector returns), but there is **no
  in-repo job** to recompute it daily. Freshness depends on external population. A
  `jobs/refresh_sector_metrics.py` + cron entry is the open piece (not a render gap).
- `ingest_fear_greed.py` still has a `# TODO: replace with KRX-based proxy` for the KR
  fear/greed series.
- ~63 `CUSIP-*` placeholder instruments remain after PR-36 (delisted/restructured names;
  needs a paid CUSIP-history source).

## Terminal view (added 2026-06-04)

- `/terminal` (`pages/Terminal.tsx`) — dense Bloomberg-style terminal layered on the
  existing app. Real data via existing feature hooks + `<StockChart>`; client-side
  indicator/risk math in `lib/indicators.ts`. Panels with no endpoint (Flow Radar,
  Level II, Options/Vol Surface) render explicit "데이터 없음 · API 필요" per the
  no-fake-data policy. Verified end-to-end (0 page errors, real data in all wired panels).
- Deferred: drag/resize panels + per-user layout persistence; real APIs for flow/L2/options;
  AI API (Gemini) for the assistant (currently local rule-based).
