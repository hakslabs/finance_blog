# Goal Execution Plan & Status

Goal: frontend-driven backend rebuild — every page personalized + data flows
cross-page; feature-based architecture; free-tier external APIs; data verified
end-to-end.

## Phase status

- [x] **P0** Inventory + mapping
- [x] **P1** Frontend foundation (lib/supabase, lib/http, AuthContext)
- [x] **P2** DB migration 0024 (10 new tables + role column)
- [x] **P3** Backend routes (7 new + 2 rewritten for new shapes; 89 routes total)
- [~] **P4** Features + page wiring
  - [x] 17 features/ modules (service + hook + index)
  - [x] WatchlistContext, BookmarkContext, FollowContext server-synced
  - [x] AddTransactionDialog, PriceAlertDialog, EventMemoDialog components
  - [x] Portfolio: 종목추가/동기화 wired
  - [x] StockDetail: 관심종목 toggle + 알림 dialog wired
  - [ ] MyPage: Alerts/Journal/Trades/Quiz tabs (~1057 LOC page; biggest remaining)
  - [ ] Calendar: open EventMemoDialog from event detail
  - [ ] News: portfolio impact computation
  - [ ] Admin: user management + broadcast tabs
  - [ ] Analysis: macro overrides save
  - [ ] LearnDetail: quiz submit
  - [ ] Masters: feed read-state via /me/follows/feed-reads (backend endpoint also TODO)
- [~] **P5** External data ingestion
  - [x] CNN fear & greed → fear_greed_history (jobs/ingest_fear_greed.py)
  - [x] Lessons seed script (scripts/seed_lessons.py, needs Supabase env)
  - [x] Existing: stocks/13F/news jobs in api/app/jobs/
  - [ ] Run jobs against real Supabase (needs SUPABASE_* env)
  - [ ] sector_metrics computation (currently empty table)
  - [ ] master profile sync to match new mock richness
- [ ] **P6** End-to-end verification
  - [x] Backend imports OK (89 routes)
  - [x] Web typecheck + vite build OK
  - [ ] Stand up dev servers, log in via Supabase, exercise every page

## Frontend → Backend mapping (final)

| Frontend type | Backend route(s) | Table |
|---|---|---|
| Stock | /stocks, /stocks/{ticker}, /stocks/{ticker}/bars | instruments + daily_metrics |
| Master | /masters, /masters/{id} | masters + 0013 seed |
| MarketIndex | /market/indices | prices_daily (index symbols) |
| MacroIndicator | /macros | macro_series |
| NewsItem | /news | news_items |
| CalendarEvent | /events | events |
| Report | /reports, /reports/{id} | reports |
| SectorData | /sectors?market= | sector_metrics (mig 0024) |
| FearGreedData | /sentiment/fear-greed | fear_greed_history (mig 0024) |
| LearnGuide | /lessons, /lessons/{id}, /lessons/chapters | learn_lessons + learn_chapters (mig 0024) |
| Watchlist | /watchlists/me + items | watchlists + watchlist_items |
| Bookmarks (4 kinds) | /me/bookmarks (+/{kind}/{ref}) | saved_items |
| Follows | /me/follows/masters | followed_masters |
| Alert | /me/alerts | price_alerts (mig 0024) |
| Memo (5 kinds) | /me/memos | user_memos (mig 0024) |
| Portfolio holdings | /me/portfolio/holdings | portfolio_holdings |
| Trade | /me/portfolio/transactions | portfolio_transactions |
| Lesson progress | /me/lesson-progress | lesson_progress |
| Quiz attempt | /me/lessons/{id}/quiz | learn_quiz_attempts (mig 0024) |
| Preferences | /me/preferences | user_preferences (mig 0024) |
| Notification | /me/notifications | notifications |
| Admin: users | /admin/users | profiles (role gate via RLS) |
| Admin: broadcast | /admin/broadcasts | admin_broadcasts (mig 0024) |

## Architecture

```
api/app/
  routes/<domain>.py     # FastAPI router (39 files)
  repos/<domain>.py      # SQL via Supabase REST (proxy + auth pass-through)
  models/<domain>.py     # Pydantic
  jobs/<source>.py       # Cron-driven ingestion
  sources/<vendor>.py    # External API clients (alphavantage, cnn, dart,
                         #   ecos, finnhub, fred, krx, polygon, sec)
  scripts/seed_*.py      # One-shot seeds

web/client/src/
  lib/
    supabase.ts          # createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
    http.ts              # apiGet/apiPost/apiPatch/apiPut/apiDelete + 401 refresh
  features/
    _shared/useAsync.ts  # SWR-ish hook with fallback support
    <domain>/index.ts    # service + hooks (one per: stocks, masters, news,
                         #   calendar, reports, indices, macro, sectors,
                         #   fear-greed, lessons, watchlists, bookmarks,
                         #   follows, alerts, memos, portfolio, notifications,
                         #   preferences, admin)
  contexts/              # Auth + per-cross-cutting state (Watchlist/Bookmark/
                         #   Follow), all server-synced when authed
  components/            # Layout, ErrorBoundary, dialog modals
                         #   (Add*Dialog, PriceAlertDialog, EventMemoDialog)
  pages/                 # 1:1 with finance-lab-pro reference; data via
                         # feature hooks (with mock fallback for offline preview)
```

## Resume notes (for next turn)

Highest-ROI remaining work, in order:

1. **MyPage tabs** — read the 1057-line file in sections, replace each tab's
   localStorage logic with feature hooks. Reuse AddTransactionDialog and
   PriceAlertDialog. Add JournalEntryDialog component.

2. **Calendar** — replace the event-click handler with `<EventMemoDialog>`
   trigger.

3. **News portfolio impact** — News.tsx already has a `impact` field on
   NewsItem; compute on the fly from `useHoldings()` + `news.tickers[]`.

4. **Admin page** — wire user list to `adminService.users()`, role toggle,
   broadcast composer.

5. **LearnDetail quiz** — wire submit to `lessonsService.submitQuiz()`.

6. **Backend: follows feed-reads endpoint** — `POST /me/follows/feed-reads`
   referenced by frontend but not yet in routes/follows.py.

7. **sector_metrics ingestion** — compute daily from instruments+prices,
   write to sector_metrics table.

8. **Run** — set `.env` Supabase creds, `cd api && uvicorn app.main:app`,
   `cd web && npm run dev`, browser-test each personalized flow.
