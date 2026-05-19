# Frontend Module Map

Index of `web/client/src/`. Read this before adding or wiring a new file. When any file under `web/client/src/` is added, renamed, removed, or has its prop signature changed, update the relevant entry in the same PR.

## Routes → Pages → Backend

Defined in `App.tsx`. Each page consumes only its own typed feature hooks; cross-domain composition is in the page.

| Route                  | Page                       | Feature modules used                                          | Backend endpoints                                              |
| ---------------------- | -------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------- |
| `/`                    | `pages/Home.tsx`           | `news`, `events`, `macros`, `movers`, `market`, `notices`     | `/v1/news`, `/v1/events/economic`, `/v1/macros/indicators`, `/v1/movers`, `/v1/market/breadth`, `/v1/notices` |
| `/news`                | `pages/News.tsx`           | `news`                                                        | `/v1/news`                                                     |
| `/calendar`            | `pages/Calendar.tsx`       | `events`                                                      | `/v1/events/economic`                                          |
| `/masters`             | `pages/Masters.tsx`        | `masters`                                                     | `/v1/masters`                                                  |
| `/masters/:id`         | `pages/MasterDetail.tsx`   | `masters`                                                     | `/v1/masters/:slug`, `/v1/masters/:slug/holdings`              |
| `/stocks`              | `pages/Stocks.tsx`         | `movers`                                                      | `/v1/movers`                                                   |
| `/stocks/:ticker`      | `pages/StockDetail.tsx`    | (not yet wired — uses `lib/data` mock)                        | future: `/v1/quotes/:symbol`, `/v1/stocks/:symbol`             |
| `/reports`             | `pages/Reports.tsx`        | `reports`                                                     | `/v1/reports`                                                  |
| `/learn`               | `pages/Learn.tsx`          | (mock only)                                                   | future: `/v1/learn`                                            |
| `/learn/:id`           | `pages/LearnDetail.tsx`    | (mock only)                                                   | future: `/v1/learn/:id`                                        |
| `/analysis`            | `pages/Analysis.tsx`       | (mock only — sectors/macros, partial)                         | future: `/v1/market/sectors`, `/v1/macros/indicators`          |
| `/mypage`              | `pages/MyPage.tsx`         | (localStorage via contexts; consumes mock `MASTERS` for cross-ref) | auth-required `/v1/portfolios/me`, `/v1/watchlists/me` (pending) |
| `/admin`               | `pages/Admin.tsx`          | (mock only)                                                   | future: admin endpoints                                        |

## Feature Modules (`features/<domain>/`)

Each module owns three files plus a barrel `index.ts`:

- `types.ts`     — mirrors the FastAPI Pydantic model in `api/app/models/<domain>.py`.
- `service.ts`   — thin fetcher wrappers around `lib/http.apiGet`, return unwrapped payload.
- `use-<domain>.ts` — React hooks returning `{ data, loading, error }`.

Live modules (all wired to real data on production):

| Module      | Hooks                                            | Backend                                                |
| ----------- | ------------------------------------------------ | ------------------------------------------------------ |
| `masters/`  | `useMastersList`, `useMasterDetail`, `useMasterHoldings` | `/v1/masters[, /:slug, /:slug/holdings]`       |
| `news/`     | `useNewsList`                                    | `/v1/news`                                             |
| `reports/`  | `useReportsList`, `useReportDetail`              | `/v1/reports[, /:id]`                                  |
| `events/`   | `useEconomicEvents`                              | `/v1/events/economic`                                  |
| `movers/`   | `useMovers`                                      | `/v1/movers`                                           |
| `macros/`   | `useMacroIndicators`                             | `/v1/macros/indicators`                                |
| `market/`   | `useBreadth`                                     | `/v1/market/breadth`                                   |
| `notices/`  | `useNotices`                                     | `/v1/notices`                                          |

Pending modules (backend exists, frontend not yet wired):

- `quotes/`     → `/v1/quotes/:symbol` (auth required) — for StockDetail.
- `portfolios/` → `/v1/portfolios/me` (auth required) — for MyPage / Portfolio.
- `watchlists/` → `/v1/watchlists/me` (auth required) — for MyPage / Home watchlist.
- `holders/`    → `/v1/holders/:symbol/holders` — for StockDetail holder breakdown.
- `sentiment/`  → `/v1/sentiment/...` — for Analysis page.
- `activity/`   → `/v1/activity/...` — for activity feed.

## Contexts (`contexts/`)

LocalStorage-backed user-private state. These remain until a backend domain replaces them.

| Context              | Storage key             | Replaces with                          |
| -------------------- | ----------------------- | -------------------------------------- |
| `AuthContext`        | `financelab_user`       | Supabase auth UI + JWT cookie/storage  |
| `WatchlistContext`   | `financelab_watchlist`  | `features/watchlists`                  |
| `BookmarkContext`    | `financelab_bookmarks`  | `features/bookmarks` (no backend yet)  |
| `FollowContext`      | `financelab_follows`    | `features/follows` (no backend yet)    |
| `ThemeContext`       | `theme`                 | n/a                                    |

## lib/

- `http.ts` — `apiGet`, `ApiError`. Adds `Authorization` from `localStorage.supabase_jwt` when present. Single source of fetch behavior.
- `utils.ts` — `cn()` Tailwind class composer (shadcn convention).
- `data.ts` — legacy; only used by `StockDetail.tsx` and `Stocks.tsx` historical helpers. Slated for removal as those pages migrate to real data.

## services/

- `mockData.ts` — legacy. Currently still exports `MASTERS`, `REPORTS`, `LEARN_GUIDES`, etc. only because `MyPage.tsx` cross-references them. Each export disappears as its consumer migrates.

## components/

- `Layout.tsx`     — app shell (sidebar, top bar). Used by App route tree.
- `ErrorBoundary.tsx` — top-level boundary; report-on-error UI.
- `ManusDialog.tsx`, `Map.tsx` — feature-specific primitives; safe to leave until called out.
- `ui/` — shadcn components. Do not modify in place; if a variant is needed, add a wrapper.

## hooks/

- `useMobile.tsx`     — viewport break detection.
- `useComposition.ts` — Korean IME composition guard (used in search inputs).
- `usePersistFn.ts`   — stable function ref.
