# Frontend Module Map

Index of `web/client/src/`. Read this before adding or wiring a new file. When any file under `web/client/src/` is added, renamed, removed, or has its prop signature changed, update the relevant entry in the same PR.

## Routes → Pages → Backend

Defined in `App.tsx` (each page is `React.lazy`-loaded so it ships as its own JS chunk under a single `<Suspense>` boundary). Cross-domain composition happens in the page; feature modules stay isolated.

| Route             | Page                     | Feature modules used                                                                                | Backend endpoints                                                                                                                                                                                                                                                                         |
| ----------------- | ------------------------ | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`               | `pages/Home.tsx`         | `notices`, `fear-greed`, `market`, `macros`, `movers`, `news`, `events`                             | `/v1/notices`, `/v1/sentiment/fear-greed`, `/v1/market/breadth`, `/v1/macros/indicators`, `/v1/movers`, `/v1/news`, `/v1/events/economic`, `/v1/stocks/bars/compare`                                                                                                                      |
| `/terminal`       | `pages/Terminal.tsx`     | `indices`, `stocks`, `sectors`, `fear-greed`, `macro`, `calendar` + `StockChart` + `lib/indicators` | `/v1/market/indices`, `/v1/movers`, `/v1/sectors`, `/v1/sentiment/fear-greed`, `/v1/macros/indicators`, `/v1/stocks/:symbol/{profile,bars}`, `/v1/stocks/bars/compare`, `/v1/calendar`                                                                                                    |
| `/news`           | `pages/News.tsx`         | `news`                                                                                              | `/v1/news`                                                                                                                                                                                                                                                                                |
| `/calendar`       | `pages/Calendar.tsx`     | `events`                                                                                            | `/v1/events/economic`                                                                                                                                                                                                                                                                     |
| `/analysis`       | `pages/Analysis.tsx`     | `macros`, `market`, `fear-greed`                                                                    | `/v1/macros/indicators`, `/v1/market/breadth`, `/v1/sentiment/fear-greed`                                                                                                                                                                                                                 |
| `/masters`        | `pages/Masters.tsx`      | `masters`                                                                                           | `/v1/masters`                                                                                                                                                                                                                                                                             |
| `/masters/:id`    | `pages/MasterDetail.tsx` | `masters`                                                                                           | `/v1/masters/:slug`, `/v1/masters/:slug/holdings`, `/v1/masters/:slug/quarter-changes`                                                                                                                                                                                                    |
| `/stocks`         | `pages/Stocks.tsx`       | `movers`                                                                                            | `/v1/movers`                                                                                                                                                                                                                                                                              |
| `/stocks/:ticker` | `pages/StockDetail.tsx`  | `stocks` (`useStock`, `useStockBars`, `useStockNews`, `useStockConsensus`, `useStockFilings`)        | `/v1/stocks/:symbol/{profile,bars,financials,consensus,news,filings}`. Tabs: 차트 & 지표 / 재무 / 밸류에이션 / 기술 신호 / 컨센서스(AlphaVantage+Finnhub) / 뉴스(Finnhub/DB) / 공시(SEC EDGAR US · DART KR). `/holders` exists in the API but is not yet surfaced. |
| `/reports`        | `pages/Reports.tsx`      | `reports`                                                                                           | `/v1/reports`                                                                                                                                                                                                                                                                             |
| `/reports/:id`    | `pages/ReportDetail.tsx` | `reports`                                                                                           | `/v1/reports/:id`                                                                                                                                                                                                                                                                         |
| `/learn`          | `pages/Learn.tsx`        | (none — preview page until backend exists)                                                          | future: `/v1/learn`                                                                                                                                                                                                                                                                       |
| `/learn/:id`      | `pages/LearnDetail.tsx`  | (none — preview page until backend exists)                                                          | future: `/v1/learn/:id`                                                                                                                                                                                                                                                                   |
| `/mypage`         | `pages/MyPage.tsx`       | `portfolio`, `masters`, `reports` (BookmarksTab lookup); contexts for watchlist/journal tabs        | `/v1/portfolios/me/analytics`, `/v1/portfolios/me/transactions`; future: `/v1/watchlists/me`                                                                                                                                                                                              |
| `/portfolio`      | `pages/Portfolio.tsx`    | (auth-required placeholder)                                                                         | future: `/v1/portfolios/me`                                                                                                                                                                                                                                                               |
| `/admin`          | `pages/Admin.tsx`        | (mock fixtures — not surfaced in nav)                                                               | future: admin endpoints                                                                                                                                                                                                                                                                   |

Layout (`components/Layout.tsx`) reads two feature modules directly: `movers` (top scrolling ticker bar) and `notices` (bell dropdown).

## Feature Modules (`features/<domain>/`)

Each module owns three files plus a barrel `index.ts`:

- `types.ts` — mirrors the FastAPI Pydantic model in `api/app/models/<domain>.py`.
- `service.ts` — thin fetcher wrappers around `lib/http.apiGet`, return unwrapped payload.
- `use-<domain>.ts` — React hooks returning `{ data, loading, error }`.

All 11 modules below are wired to real production data:

| Module        | Hooks                                                                                               | Backend                                                               |
| ------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `masters/`    | `useMastersList`, `useMasterDetail`, `useMasterHoldings`, `useMasterQuarters`                       | `/v1/masters[, /:slug, /:slug/holdings, /:slug/quarter-changes]`      |
| `news/`       | `useNewsList`                                                                                       | `/v1/news`                                                            |
| `reports/`    | `useReportsList`, `useReportDetail`                                                                 | `/v1/reports[, /:id]`                                                 |
| `events/`     | `useEconomicEvents`                                                                                 | `/v1/events/economic`                                                 |
| `movers/`     | `useMovers`                                                                                         | `/v1/movers`                                                          |
| `macros/`     | `useMacroIndicators`                                                                                | `/v1/macros/indicators`                                               |
| `market/`     | `useBreadth`                                                                                        | `/v1/market/breadth`                                                  |
| `notices/`    | `useNotices`                                                                                        | `/v1/notices`                                                         |
| `fear-greed/` | `useFearGreed`                                                                                      | `/v1/sentiment/fear-greed`                                            |
| `quotes/`     | `useQuote(symbol, range)`                                                                           | `/v1/quotes/:symbol?range=`                                           |
| `stocks/`     | `useStockProfile`, `useStockConsensus`, `useStockHolders`, `useStockNextEarning`, `useStockFilings` | `/v1/stocks/:symbol/{profile,consensus,holders,next-earning,filings}` |

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
- `compare-series.ts` — shared DB/API comparison helpers: trims source rows by lookback window, finds a common baseline date across symbols, and rebases cumulative returns for market/watchlist comparison charts.
- `indicators.ts` — pure technical-indicator + risk math (SMA, EMA, RSI, MACD, daily returns, annualized vol, max drawdown, historical VaR, correlation) computed client-side from real OHLCV bars. Consumed by `pages/Terminal.tsx` (Tech/Risk Engine, Cross-Asset Matrix, Scenario Lab). Returns `null` when a window has too few bars so callers render "데이터 없음" instead of fabricating values.
- `utils.ts` — `cn()` Tailwind class composer (shadcn convention).

`lib/data.ts` still exists and is consumed as an empty-state fallback by `pages/Reports.tsx` (`REPORTS`) and as the `tickerToName` lookup helper by `pages/Home.tsx` / `pages/News.tsx`. Live data takes precedence; the mock only renders when the API returns zero rows.

## services/

- `mockData.ts` — trimmed to ~40 lines. Only `US_STOCKS` + `KR_STOCKS` remain, consumed by MyPage's WatchlistTab and AddTradeModal autocomplete. File header notes it dies when `/v1/search?q=` lands.

## components/

- `Layout.tsx` — app shell (sidebar, top bar, scrolling movers ticker, notices dropdown, global search → /stocks/:TICKER or /masters/:slug on Enter). Reads `features/movers` and `features/notices`.
- `pages/Home.tsx` — dashboard; market comparison chart requests `/stocks/bars/compare` with 5Y source data by default and renders that full 5Y comparison first, with shorter period buttons only narrowing the already-loaded API series.
- `pages/MyPage.tsx` — portfolio/trades charts render `/portfolios/me/analytics` API series only; local transaction calculations are no longer used as chart fallback when the API returns no rows.
- `ErrorBoundary.tsx` — top-level boundary; report-on-error UI.
- `StockChart.tsx` — full OHLCV stock chart backed by `/v1/stocks/:symbol/bars`; normalizes ISO dates plus epoch seconds/milliseconds before sorting bars, supports period/timeframe controls with separate `0` current-period fit and `Shift+0`/ALL full-history fit, full-history mini navigator with click/drag range scrubbing plus visible-window return badge, repeated zoom/pan boundary correction so aggressive wheel/scroll gestures cannot leave persistent blank canvas before the first bar or after the latest bar, keyboard height controls for indicator panes (`,/.`) and the price pane (`Shift+,/.`), workspace reset that also closes tables/tools/help and clears compare/readout state, indicators with active-chip drag reordering plus per-chip parameter jump/reset/hide actions, ON OFF active-strip clear and Shift+A active clear, search/category filtered bulk ON/OFF, persisted active indicator slot selection, and slider-backed parameter cards with preset/reset feedback, persisted drawing tools with repeat mode and Alt+Y toggle plus drawing count/active-cancel controls, in-chart active-cancel overlay, and start/complete/undo/delete feedback, expanded mode, export, cursor readout, and DB-backed compare charts with quick benchmark preset/toggles, toggleable right-edge return labels via Alt+L, Alt+B preset cycling, Alt+Shift+B compare CLEAR, PRESET/CUSTOM state chips, current-symbol deduped max-count feedback and CLEAR reset, a loaded-series common rebased baseline that stays stable when lines are hidden, persisted per-symbol source/visible coverage chips, hide/show, 기준+SOLO controls, Alt+R compare-line restore, and `D`/`T`/`Alt+D` compare data-table shortcuts.
- `KLineSeriesChart.tsx` — shared multi-series summary chart with pan/zoom that preserves the user's current window across parent rerenders while still honoring real data/range changes, normalizes ISO dates plus epoch seconds/milliseconds into UTC day labels before sorting/export/readouts, keeps the internal view range clamped to the loaded data so zoom/pan cannot continue from stale blank space, full-period mini navigator with click/drag range scrubbing plus visible-window change badge, right-edge series value/change labels toggleable via `M`/`Alt+L`, workspace reset that closes table/help/expanded state, clears search/filter/readout/drag state, and returns to the `initialViewDays` default range, persisted series visibility/order, series toggles with ON-only legend filtering and drag reordering, Alt+R previous-selection restore, readout, density/grid/crosshair controls, keyboard chart-height controls (`,/.`), staged `Esc` cleanup for PIN/CUR/help/table/expanded state, `D`/`T`/`Alt+D` data-table shortcuts, expanded mode, rank/summary controls including 우위/열위 pair focus with previous-selection restore, optional local range controls via `showRangeControls`, optional initial value/%/100 scale via `initialTransformMode`, stable loaded-series baseline labels for `%`/`100` transforms, explicit fixed-scale labels for precomputed comparison data, and optional source badges via `sourceLabel/sourceTone/sourceTitle`.
- `StockMiniChart.tsx` — compact klinecharts sparkline for stock lists/watchlists, using real bar data from callers; normalizes ISO dates plus epoch seconds/milliseconds, supports price/scalar normalization, custom readout formatting, persisted expanded quick ranges from 1M through 5Y/ALL plus resettable CUSTOM windows from a full-period mini navigator with click/drag scrubbing and visible-window return badge, expanded latest-value/change badge, workspace reset that closes table/expanded state and clears readout/CUSTOM state, `D`/`Alt+D` quick-open data table, staged `Esc` cleanup for PIN/CUR/table/expanded state, PIN/CUR measurement preserved across expanded quick-range changes, compact range markers, data-quality chips, and optional source badges via `sourceLabel/sourceTone/sourceTitle`.
- `ui/` — shadcn components. Do not modify in place; if a variant is needed, add a wrapper.

## hooks/

- `useMobile.tsx` — viewport break detection.
- `useComposition.ts` — Korean IME composition guard (used in search inputs).
- `usePersistFn.ts` — stable function ref.
