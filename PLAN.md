# Goal Execution Plan

Frontend is now a pristine mirror of `../finance-lab-pro` (mock-only). Goal:
build backend + wire it so every page is fully functional, personalized state
flows organically across pages, and reference data is populated from free
external APIs.

## Frontend → Backend mapping

| Frontend type (types/index.ts) | Backend home | Status |
|---|---|---|
| `MarketIndex` | view over `prices_daily` for index symbols | reuse `routes/market.py` |
| `Stock` | `instruments` + `daily_metrics` + `fundamentals` | reshape via view |
| `SectorData` | derived from instruments + sector mapping | NEW computed view |
| `MacroIndicator` | `macro_series` table | reshape `routes/macros.py` |
| `NewsItem` | `news_items` | reshape; add `impact` computation |
| `CalendarEvent` | `events` table | reshape; add memo join |
| `Master` + `MasterHolding` | `masters` + `master_holdings` (from 13F) | reshape via view |
| `Report` | `reports` | reshape |
| `PortfolioHolding` | `portfolio_holdings` | exists (mig 0002) |
| `Trade` | `portfolio_transactions` | exists (mig 0002), extend |
| `Alert` | NEW `price_alerts` | mig 0024 |
| `FearGreedData` | NEW `sentiment_history` | mig 0024 (or reuse sentiment.py) |
| `LearnGuide` | NEW `lessons` content table | mig 0024 |
| User memos/journal | NEW `memos`, `journal_entries` | mig 0024 |
| Quiz attempts | NEW `lesson_quiz_attempts` | mig 0024 |
| Notifications | existing `notifications` | reuse |
| Admin: users mgmt | NEW `admin_role` flag on profiles | mig 0025 |

## Feature-based architecture

Backend:
```
api/app/
  models/<domain>.py        # Pydantic shapes (= frontend types verbatim)
  repos/<domain>.py         # SQL + Supabase access
  routes/<domain>.py        # FastAPI router
  ingest/<source>.py        # external API ingestion (yfinance, FRED, EDGAR)
```

Frontend:
```
web/client/src/
  features/<domain>/
    service.ts              # apiGet/apiPost wrappers
    use-<domain>.ts         # SWR-like hook
    types.ts                # re-export from @/types or extend
    index.ts                # public surface
  contexts/                 # auth + cross-cutting (watchlist/bookmarks/follows)
  pages/                    # page shells — read from feature hooks
  lib/
    supabase.ts
    http.ts
```

## Phased execution

- [x] **P0** Inventory + plan
- [ ] **P1** Frontend foundation: lib/supabase, lib/http, env, AuthContext
- [ ] **P2** DB migration 0024 (alerts, memos, journal, quiz, lessons content, fear_greed_history)
- [ ] **P3** Backend routes — reference data: stocks, masters, news, calendar, reports, indices, sectors, macro, fear-greed
- [ ] **P4** Backend routes — user state: watchlist, bookmarks(4 types), follows, portfolio, trades, memos, journal, alerts, lessons-progress, quiz-attempts
- [ ] **P5** Frontend features/ + hooks for every domain
- [ ] **P6** Wire every page; replace toast-stubs with real CRUD; add missing dialogs (Portfolio add-stock/sync, MyPage alert/trade/journal dialogs, Calendar memo dialog, News impact, Admin CRUD)
- [ ] **P7** Data ingestion (free tier): yfinance for prices/fundamentals, FRED for macro, SEC EDGAR for 13F, RSS for news, lessons seeded from in-repo content
- [ ] **P8** Cron orchestration via existing `routes/cron.py`
- [ ] **P9** Run app, exercise every page, verify cross-page personalization, capture data
