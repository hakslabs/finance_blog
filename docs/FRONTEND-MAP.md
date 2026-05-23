# Frontend Module Map

Index of `web/client/src/`. Read this before adding or wiring a new file. When any file under `web/client/src/` is added, renamed, removed, or has its prop signature changed, update the relevant entry in the same PR.

## Routes → Pages → Backend

Defined in `App.tsx` (each page is `React.lazy`-loaded so it ships as its own JS chunk under a single `<Suspense>` boundary). Cross-domain composition happens in the page; feature modules stay isolated.

| Route             | Page                     | Feature modules used                                                    | Backend endpoints                                                                                                                         |
| ----------------- | ------------------------ | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `/`               | `pages/Home.tsx`         | `notices`, `sentiment`, `market`, `macros`, `movers`, `news`, `events`  | `/v1/notices`, `/v1/sentiment/fear-greed`, `/v1/market/breadth`, `/v1/macros/indicators`, `/v1/movers`, `/v1/news`, `/v1/events/economic` |
| `/news`           | `pages/News.tsx`         | `news`                                                                  | `/v1/news`                                                                                                                                |
| `/calendar`       | `pages/Calendar.tsx`     | `events`                                                                | `/v1/events/economic`                                                                                                                     |
| `/analysis`       | `pages/Analysis.tsx`     | `macros`, `market`, `sentiment`                                         | `/v1/macros/indicators`, `/v1/market/breadth`, `/v1/sentiment/fear-greed`                                                                 |
| `/masters`        | `pages/Masters.tsx`      | `masters`                                                               | `/v1/masters`                                                                                                                             |
| `/masters/:id`    | `pages/MasterDetail.tsx` | `masters`                                                               | `/v1/masters/:slug`, `/v1/masters/:slug/holdings`, `/v1/masters/:slug/quarter-changes`                                                    |
| `/stocks`         | `pages/Stocks.tsx`       | `movers`                                                                | `/v1/movers`                                                                                                                              |
| `/stocks/:ticker` | `pages/StockDetail.tsx`  | `quotes`, `stocks`, `news`                                              | `/v1/quotes/:symbol`, `/v1/stocks/:symbol/{profile,consensus,holders,next-earning,filings}`, `/v1/news?symbol=`                           |
| `/reports`        | `pages/Reports.tsx`      | `reports`                                                               | `/v1/reports`                                                                                                                             |
| `/reports/:id`    | `pages/ReportDetail.tsx` | `reports`                                                               | `/v1/reports/:id`                                                                                                                         |
| `/learn`          | `pages/Learn.tsx`        | (none — preview page until backend exists)                              | future: `/v1/learn`                                                                                                                       |
| `/learn/:id`      | `pages/LearnDetail.tsx`  | (none — preview page until backend exists)                              | future: `/v1/learn/:id`                                                                                                                   |
| `/mypage`         | `pages/MyPage.tsx`       | `masters`, `reports` (BookmarksTab lookup); contexts for the other tabs | future: `/v1/portfolios/me`, `/v1/watchlists/me`                                                                                          |
| `/portfolio`      | `pages/Portfolio.tsx`    | (auth-required placeholder)                                             | future: `/v1/portfolios/me`                                                                                                               |
| `/admin`          | `pages/Admin.tsx`        | (mock fixtures — not surfaced in nav)                                   | future: admin endpoints                                                                                                                   |

Layout (`components/Layout.tsx`) reads two feature modules directly: `movers` (top scrolling ticker bar) and `notices` (bell dropdown).

## Feature Modules (`features/<domain>/`)

Each module owns three files plus a barrel `index.ts`:

- `types.ts` — mirrors the FastAPI Pydantic model in `api/app/models/<domain>.py`.
- `service.ts` — thin fetcher wrappers around `lib/http.apiGet`, return unwrapped payload.
- `use-<domain>.ts` — React hooks returning `{ data, loading, error }`.

All 11 modules below are wired to real production data:

| Module       | Hooks                                                                                               | Backend                                                               |
| ------------ | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `masters/`   | `useMastersList`, `useMasterDetail`, `useMasterHoldings`, `useMasterQuarters`                       | `/v1/masters[, /:slug, /:slug/holdings, /:slug/quarter-changes]`      |
| `news/`      | `useNewsList`                                                                                       | `/v1/news`                                                            |
| `reports/`   | `useReportsList`, `useReportDetail`                                                                 | `/v1/reports[, /:id]`                                                 |
| `events/`    | `useEconomicEvents`                                                                                 | `/v1/events/economic`                                                 |
| `movers/`    | `useMovers`                                                                                         | `/v1/movers`                                                          |
| `macros/`    | `useMacroIndicators`                                                                                | `/v1/macros/indicators`                                               |
| `market/`    | `useBreadth`                                                                                        | `/v1/market/breadth`                                                  |
| `notices/`   | `useNotices`                                                                                        | `/v1/notices`                                                         |
| `sentiment/` | `useFearGreed`                                                                                      | `/v1/sentiment/fear-greed`                                            |
| `quotes/`    | `useQuote(symbol, range)`                                                                           | `/v1/quotes/:symbol?range=`                                           |
| `stocks/`    | `useStockProfile`, `useStockConsensus`, `useStockHolders`, `useStockNextEarning`, `useStockFilings` | `/v1/stocks/:symbol/{profile,consensus,holders,next-earning,filings}` |

Pending modules (backend exists, frontend wiring requires Supabase JWT in `localStorage.supabase_jwt`):

- `watchlists/` → `/v1/watchlists/me` — for MyPage WatchlistTab + Home watchlist row.
- `portfolios/` → `/v1/portfolios/me` — for Portfolio page.
- `activity/` → `/v1/activity` — for activity feed.

## Contexts (`contexts/`)

LocalStorage-backed user-private state. These remain until a backend domain replaces them.

| Context            | Storage key            | Replaces with                         |
| ------------------ | ---------------------- | ------------------------------------- |
| `AuthContext`      | `financelab_user`      | Supabase auth UI + JWT cookie/storage |
| `WatchlistContext` | `financelab_watchlist` | `features/watchlists`                 |
| `BookmarkContext`  | `financelab_bookmarks` | `features/bookmarks` (no backend yet) |
| `FollowContext`    | `financelab_follows`   | `features/follows` (no backend yet)   |
| `ThemeContext`     | `theme`                | n/a                                   |

## lib/

- `http.ts` — `apiGet`, `ApiError`. Adds `Authorization` from `localStorage.supabase_jwt` when present. Single source of fetch behavior.
- `utils.ts` — `cn()` Tailwind class composer (shadcn convention).

`lib/data.ts` was deleted (no callers after Portfolio / Stocks / StockDetail migrated).

## services/

- `mockData.ts` — trimmed to ~40 lines. Only `US_STOCKS` + `KR_STOCKS` remain, consumed by MyPage's WatchlistTab and AddTradeModal autocomplete. File header notes it dies when `/v1/search?q=` lands.

## components/

- `Layout.tsx` — app shell (sidebar, top bar, scrolling movers ticker, notices dropdown, global search → /stocks/:TICKER or /masters/:slug on Enter). Reads `features/movers` and `features/notices`.
- `ErrorBoundary.tsx` — top-level boundary; report-on-error UI.
- `ui/` — shadcn components. Do not modify in place; if a variant is needed, add a wrapper.

## hooks/

- `useMobile.tsx` — viewport break detection.
- `useComposition.ts` — Korean IME composition guard (used in search inputs).
- `usePersistFn.ts` — stable function ref.
