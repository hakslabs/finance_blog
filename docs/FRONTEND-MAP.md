# Frontend Module Map

Single-page index of `web/src/`. Read this **before** adding a new file or wiring a new component. The goal: an agent with a small context window can plan a section without opening every file.

## Update Protocol

Whenever a PR adds, renames, removes, or changes the prop signature of any file under `web/src/`, update the relevant entry in the **same PR**. Stale entries are worse than missing ones.

When this file grows past ~600 lines, replace the hand-maintained portions with a build-time scan (`scripts/gen-module-map.ts`).

## Directory Tree

```
web/src/
  App.tsx                 # Router; one <Route> per page
  main.tsx                # Vite entry
  components/
    interaction/          # Cross-page action/detail/planned-feedback UX
    layout/               # Page chrome (shell, sidebar, container)
    primitives/           # Cross-page reusable building blocks
  fixtures/               # Static typed sample data; one file per route domain
  lib/                    # Browser-safe env, typed API client, route data hooks
  routes/                 # One folder per route; *Page.tsx is the export
    {route}/{route}Page.tsx
    {route}/sections/     # Page-specific composition pieces (only when the page is large)
  styles/
    tokens.css            # CSS variables (colors, fonts)
    base.css              # Reset, sr-only, skip-link
```

## Layout (`components/layout/`)

### `AppShell({ children })`

Top-level chrome: collapsible sidebar + main area. Wraps `<Routes>` in `App.tsx` and persists the desktop sidebar collapsed state in `localStorage`.

### `Sidebar({ collapsed, onToggleCollapsed })`

Left navigation. Items come from `navigation.ts`. Desktop sidebar can collapse to a compact lucide-icon rail; mobile keeps the horizontal nav pattern. The toggle uses a familiar menu/panel icon instead of text-only collapse affordances. Admin-only nav items are hidden unless the signed-in user's email is listed in `VITE_ADMIN_EMAILS`.

### `TopBar()`

Top utility bar. Reads auth context for login/account state. Global search covers menus, stocks, reports, and masters, then routes to the selected result. Admin-only menu results are included only for `VITE_ADMIN_EMAILS` users. The currency chip toggles KRW/USD in local UI state, saved items route to `/mypage?tab=saved`, and the notification menu supports a local "모두 확인" action that clears the unread dot.

### `AuthGate({ children, requireAdmin? })`

Route-level auth boundary used inside `ProtectedRoute`. It renders config/loading/login states inside the normal app chrome, returns `children` once signed in, and renders an access-denied panel when `requireAdmin` is true but the user is not listed in `VITE_ADMIN_EMAILS`.

### `ProtectedRoute({ children, requireAdmin? })`

Small wrapper around `AuthGate` for private routes such as `/portfolio`, `/mypage`, and `/admin`. `/admin` passes `requireAdmin`.

### `PageContainer({ title, eyebrow?, description?, actions?, children? })`

Page-level landmark. Emits `<section aria-labelledby>` + `<h1>`. **Every route page must wrap its content in this.**

- `title: string` — becomes `<h1>`.
- `eyebrow?: string` — small label above title.
- `description?: ReactNode` — paragraph below title; accepts inline-styled children.
- `actions?: ReactNode` — top-right slot (KPI tile, primary CTA).
- `children?: ReactNode` — body, flex-column with 18px gap.

### `navigation.ts`

Exports `primaryNavItems` and `utilityNavItems` with lucide icon components consumed by `Sidebar`, plus active-route helpers. `NavItem.adminOnly` marks hidden/admin routes; use `getVisibleNavItems(items, isAdmin)` before rendering utility nav or global-search menu results.

## Primitives (`components/primitives/`)

### `Card({ title?, eyebrow?, actions?, className?, children })`

`<article>` container with optional header. Emits `<h2>` only when `title` is set. Pass `className` to override padding/border (dashboard sections use `padding: 0` to render their own internal headers). Custom headers may emit their own `<h2>` inside the Card body (see C-2 in `FRONTEND.md`).

### `Section({ title, eyebrow?, description?, actions?, children })`

`<section aria-labelledby>` with `<h2>`. Use for in-page subsections inside a `PageContainer` body when grouping cards.

### `Badge({ tone?, children })`

`<span>` chip. `tone: "neutral" | "accent" | "positive" | "negative" | "warning"`. Default `"neutral"`.

### `DataTable<T>({ columns, rows, getRowKey, emptyMessage?, density?, onRowClick?, getRowAriaLabel? })`

Generic table. `columns: { key, header, render(row), align? }[]`. `getRowKey(row)` returns a stable id (use `row.id`). Shows `emptyMessage` when `rows.length === 0`. `onRowClick` makes rows keyboard-focusable and opens route/detail behavior; pair it with `getRowAriaLabel` for accessible row actions. Prefer this over hand-built flex rows for tabular data.

`density?: "comfortable" | "compact"` (default `"comfortable"`). Compact density: 6px 12px padding, 0.6875rem font, hairline rows. Exported as `TableDensity` type.

### `EmptyState({ title, description, action? })`

Inline empty placeholder. Emits styled `<p>` for title/description (no `<h2>`). Optional `action` slot for a button/link.

### `KpiTile({ label, value, detail?, trend? })`

Single KPI block — label, big value, optional detail line and trend node.

### `ChartPlaceholder({ label, height?, onOpen? })`

Stub chart box for routes that don't yet have real chart implementations. `height` defaults to 240px. Pass `onOpen` when the placeholder should behave as a chart-detail entry point.

### `Skeleton({ variant?, className?, label? })`

Accessible shimmer placeholder for loading states. `variant: "text" | "title" | "block" | "circle"` (default `"text"`). Use only while a real data hook is loading; keep route-specific layout spacing in the route CSS module.

### `PriceChart({ bars, height?, ariaLabel })`

Inline SVG line chart for daily closes. Used by `/stocks/:symbol` once `useQuote` resolves. `height` defaults to 280px. Renders three y-axis ticks and a colored polyline (positive vs negative based on first→last close). No deps; viewBox-based so it scales to container width.

### Primitive Selection Rules

Defaults — use these _before_ writing route-local alternatives. See `docs/FRONTEND.md` rule C-11 for the full reasoning and blocker criteria.

- **`DataTable<T>`** — Default for any tabular column/row data. Cell `render` functions accept arbitrary JSX, so colored values, symbols+name pairs, Badges, sparklines, and compact metadata inside cells are **not** reasons to hand-roll a `<table>`. Bypass only for structural needs `DataTable` does not support: row expansion, grouped/nested rows, pinned columns, non-table spatial layout.
- **`KpiTile`** — Default for label / big value / optional detail / optional trend blocks. Compose a horizontal strip by wrapping multiple `KpiTile`s in a grid (see `KpiStrip` in `routes/portfolio/sections/`).
- **`EmptyState`** — Default for empty sections inside a `Card`. Render it conditionally when `rows.length === 0`; do not create empty fixture exports just to demonstrate it.
- **`Badge`** — Default for small status/category chips. Map domain enums to `tone` via a `Record<State, BadgeTone>` constant.
- **`ChartPlaceholder`** — Default for static chart areas until a real chart lands.
- **`PageContainer`** — Mandatory page shell (rule C-1). Not optional.
- **`Card` / `Section`** — Default container for grouped content with a `<h2>` header. Custom inner header layouts go inside the `Card` body, not outside it.

If you bypass a default, document the blocker in the PR description before implementing the replacement.

## Interaction (`components/interaction/`, `lib/interaction/`)

### `ActionIntent`

Discriminated action schema for repeated click behavior: route navigation, detail panel, planned-feature notice, or external link. Prefer this over page-local ad hoc click handling when behavior may repeat.

### `useInteractionActions()`

Shared hook that executes `ActionIntent` and owns selected detail plus transient planned-action notice state. Route pages call it once and pass callbacks to sections.

### `DetailPanel({ detail, onClose })`

Centered dialog for item detail. Used for news, todos, events, analysis tools, glossary terms, filings, master changes, and other text/detail surfaces that do not justify a dedicated route. `DetailSection` supports body text plus optional `items` and compact bar-chart rows for dashboard drilldowns.

### `ActionNotice({ message })`

Transient status toast for planned write-backed actions such as save, follow, memo, or notification actions before the backend write path exists.

## Lib (`lib/`)

### `env.ts`

Browser-safe environment access. Exports `env.apiBaseUrl`, read from `VITE_API_BASE_URL` with a local fallback.

### `api-client.ts`

Typed FastAPI client for frontend data paths. Exports `apiClient.getMyWatchlist()` for `GET /v1/watchlists/me`, `apiClient.getQuote(symbol, range)` for `GET /v1/quotes/{symbol}`, `apiClient.getMyPortfolio()` for `GET /v1/portfolios/me`, response types (`Watchlist`, `Quote`, `QuoteBar`, `QuoteRange`, `Portfolio`, `PortfolioHolding`, `PortfolioTransaction`, `PortfolioTransactionType`), and `ApiError`. Attaches the current Supabase access token as `Authorization: Bearer <jwt>`.

### `supabase.ts`

Browser-safe Supabase client. Uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; exports `null` when either value is missing so the auth gate can render a config error instead of crashing.

### `auth-context.tsx`

Supabase session bootstrap and auth actions. Exports `AuthProvider`. Handles Google OAuth sign-in, sign-out, session refresh, and signed-in/signed-out/config-error state.

### `auth-state.ts`

Auth context types plus `useAuth()`. Split from `auth-context.tsx` so React Fast Refresh sees the provider module as component-only. `signInWithGoogle(returnTo?)` accepts an optional absolute return URL for route-scoped login.

### `auth-user.ts`

Pure helpers for Supabase user display data: `getUserDisplayName`, `getUserEmail`, and `getUserInitial`.

### `useWatchlist.ts`

Dashboard hook for the watchlist data path. Returns `WatchlistState`: signed-out/config-error/loading, ready with `Watchlist`, or error with message. It does not call the private API until Supabase Auth is signed in.

### `useQuote.ts`

Stock detail hook for the PR-10 quote data path. Returns `QuoteState`: loading, ready with `Quote`, empty (503 upstream), or error.

### `usePortfolio.ts`

Portfolio page hook for the PR-11 portfolio data path. Returns `PortfolioState`: loading, ready with `Portfolio`, or error with message.

### `useMaster.ts`

Master detail hook (PR-26). Calls `apiClient.getMaster(slug)` against `/v1/masters/{slug}`. Returns `MasterState`: loading, ready with `Master`, not-found (404), or error. Public read — does not require auth. `MasterDetailPage` merges DB header fields over the existing fixture and renders a source label so the user can tell whether they're viewing live DB data or a fixture fallback.

### `useReport.ts`

Report detail hook (PR-26). Calls `apiClient.getReport(id)` against `/v1/reports/{id}`. Same shape as `useMaster`. `ReportDetailPage` overlays DB title/source/published_at/language onto the fixture report and shows the same source label pattern.

## Fixtures (`fixtures/`)

### `fixtures/dashboard.ts`

**Constants** (all typed):

- `GREETING_NAME: string`
- `PORTFOLIO_SUMMARY: PortfolioSummary`
- `MARKET_STATUS: MarketStatus`
- `NOTICE: Notice`
- `TODOS: TodoItem[]`
- `FEAR_GREED: FearGreedData[]` (length 2: 한국, 미국)
- `MACRO_INDICATORS: MacroIndicator[]`
- `WATCHLIST: WatchlistItem[]`
- `TOP_MOVERS_KR: TopMover[]`, `TOP_MOVERS_US: TopMover[]`, `TOP_MOVERS` aliasing the KR default
- `NEWS: NewsItem[]`
- `ECONOMIC_EVENTS: EconomicEvent[]`
- `RETURN_DATA: ReturnSeries`
- `PORTFOLIO_COMPOSITION: PortfolioAsset[]`
- `TOP_HOLDINGS: TopHolding[]`

**Types**: `PortfolioSummary`, `MarketStatus`, `Notice`, `TodoItem`, `TodoSource` (`"공통" | "알람" | "Thesis"`), `FearGreedData`, `MacroIndicator`, `WatchlistItem`, `TopMover`, `NewsItem`, `NewsCategory` (`"kr" | "us" | "macro"`), `EconomicEvent`, `EventType` (`"macro" | "earnings" | "dividend"`), `ReturnSeries`, `ReturnContributor`, `PortfolioAsset`, `TopHolding`.

All list-item types carry an `id: string` for stable React keys.

### `fixtures/portfolio.ts` — removed

PR-11 wires `/portfolio` to live data via `lib/usePortfolio.ts` and the `apiClient.getMyPortfolio()` client. Static KPIs / benchmarks / performance metrics were removed alongside `PerformanceSummary` because performance analytics is explicitly out of scope until PR-13's cron populates market prices.

### `fixtures/analysis.ts`

**Constants** (all typed):

- `ANALYSIS_TABS` — readonly tuple of 8 tab names: `시장 한눈에 | 시장 심리 | 기술적 분석 | 재무 분석 | 퀀트 팩터 | 적정주가 계산 | 섹터 흐름 | 신호 알림`. Exported as `AnalysisTab` type.
- `MARKET_INDICES: MarketIndex[]` — 15 selectable market indicators across US/KR/rates/FX/volatility/macro. Analysis overview defaults to 5 selected items and can expand to all.
- `FED_RATE_PROBABILITIES: FedRateProbability[]` — 5 FOMC meeting probability rows for the FedWatch-style rate-cut visualization.
- `SECTOR_ROTATION: SectorReturn[]` — 7 sectors, 1M returns.
- `STYLE_ROTATION: StyleCell[]` — 4 cells (대형/소형 × 그로스/밸류).
- `ANALYSIS_TOOLS: AnalysisTool[]` — 8 tool registry entries with target tab and detail sections. Adding a tool should be a data change, not a hardcoded card change.
- `RECENT_SIGNALS: RecentSignal[]` — 5 signals.
- `SAVED_SCREENS: SavedScreen[]` — 4 screens.
- `SENTIMENT_INDICATORS: SentimentIndicator[]` — 9 indicators across US/KR/Global.
- `INDICATOR_GLOSSARY: IndicatorGlossary[]` — 9 terms.
- `TECHNICAL_INDICATORS: TechnicalIndicator[]` — 6 indicator/symbol pairs.
- `FINANCIAL_SCORES: FinancialScore[]` — 5 symbols with PER/PBR/ROE/margin/debt and A-D grade.
- `QUANT_FACTORS: QuantFactor[]` — 5 factors (Value, Momentum, Quality, Size, LowVol).
- `DCF_ASSUMPTIONS: DcfAssumption[]` — 4 KPI items (growth, terminal, WACC, fair value).
- `SIGNAL_ALERTS: SignalAlert[]` — 7 alerts.
- `SECTOR_MOMENTUM: SectorMomentum[]` — 6 sectors with 1M/3M/6M and trend.

**Types** (one per concept): `MarketIndex`, `SectorReturn`, `StyleCell`, `AnalysisTool`, `RecentSignal`, `SavedScreen`, `SentimentIndicator`, `SentimentStatus` (`"calm" | "stable" | "neutral" | "caution" | "stress" | "panic"`), `IndicatorGlossary`, `TechnicalIndicator`, `TechnicalSignalKind` (`"buy" | "sell" | "hold"`), `FinancialScore`, `FinancialGrade` (`"A" | "B" | "C" | "D"`), `QuantFactor`, `DcfAssumption`, `SignalAlert`, `SignalDirection` (`"up" | "down" | "neutral"`), `SectorMomentum`, `SectorMomentumTrend` (`"improving" | "deteriorating" | "stable"`).

All list-item types carry an `id: string` for stable React keys.

### `fixtures/stocks.ts`

**Constants** (all typed):

- `STOCK_LIST: StockListItem[]` — 12 rows (AAPL, NVDA, MSFT, TSLA, GOOGL, AMZN, META, 005930, 000660, 373220, AVGO, AMD). Each has `id`, `symbol`, `name`, `exchange`, `sector`, `price`, `change`, `up`, `marketCap`, `volume`.
- `STOCK_TABS` — readonly tuple of 8 tab names: `개요 | 차트 | 재무 | 밸류에이션 | 공시·실적 | 뉴스 | 수급 | 컨센서스`. Exported as `StockTab` type.
- `AAPL_DETAIL: StockDetail` — full detail fixture for Apple. Only symbol with detail data in PR-04.
- `getStockDetail(symbol: string): StockDetail | undefined` — case-insensitive lookup. Returns undefined for unknown symbols.

**Types** (one per concept): `StockListItem`, `StockKeyStats`, `CompanyOverview`, `SectorPosition`, `TechnicalSignal`, `FinancialRow`, `FinancialTable`, `PeerComparison`, `ValuationMetric`, `FairValueEstimate`, `FilingItem`, `EarningsEvent`, `NewsItem` (stock-domain, distinct from dashboard's `NewsItem`), `SupplyDemandKpi`, `InstitutionalHolder`, `InsiderTrade`, `ConsensusSummary`, `AnalystReport`, `GuruHolding`, `SimilarStock`, `StockDetail`.

All list-item types carry an `id: string` for stable React keys.

### `fixtures/reports.ts`

**Constants** (all typed):

- `REPORTS: ReportListItem[]` — 8 report rows across BOK, SEC EDGAR, IMF, KDI, BlackRock, DART, OECD, KPMG. Each has `id`, source, region, category, subtype, title, date, page count, language, summary, tags, status, views, bookmarks.
- `REPORT_KPIS: ReportKpi[]` — 4 KPI tiles (total reports, weekly new, active sources, AI processed).
- `REPORT_DETAIL: ReportDetail` — detail fixture for `bok-monetary-2025-09` with AI summary, key points, table of contents, body excerpts, inflation table, related tickers/reports, memo prompt.
- `getReport(id: string | undefined): ReportDetail | undefined` — route-param lookup. Returns detail data for known report ids and `undefined` for unknown ids.

**Types** (one per concept): `ReportRegion` (`"KR" | "US" | "GLOBAL"`), `ReportCategory`, `ReportStatus` (`"complete" | "processing"`), `ReportListItem`, `ReportKpi`, `ReportTocItem`, `ReportKeyPoint`, `ReportBodySection`, `InflationRow`, `RelatedTicker`, `RelatedReport`, `ReportDetail`.

All list-item types carry an `id: string` for stable React keys.

### `fixtures/masters.ts`

**Constants** (all typed):

- `MASTERS: MasterListItem[]` — 7 investor rows for the `/masters` list.
- `MASTER_DETAILS: MasterDetail[]` — detail fixtures for Warren Buffett and Ray Dalio.
- `getMaster(id: string | undefined): MasterDetail | undefined` — route-param lookup for `/masters/:id`.

**Types**: `MasterStrategy`, `HoldingChange`, `MasterListItem`, `MasterHolding`, `MasterQuarterChange`, `MasterDetail`.

All list-item types carry an `id: string` for stable React keys.

### `fixtures/learn.ts`

**Constants** (all typed):

- `LEARN_TABS` — readonly tuple: `입문서·칼럼 | 용어 사전 | 리포트 라이브러리`. Exported as `LearnTab` type.
- `LEARN_CATEGORIES: LearnCategory[]` — 6 guide categories with focus text and learning path keywords.
- `GUIDE_ARTICLES: GuideArticle[]` — 8 recommended guide rows with objectives, key concepts, examples, and checklists for detail panels.
- `GLOSSARY_TERMS: GlossaryTerm[]` — 12 glossary terms rendered through `DataTable`, each carrying examples, pitfalls, related terms, and optional formula text.

**Types**: `LearnTab`, `LearnCategory`, `GuideArticle`, `GlossaryTerm`.

All list-item types carry an `id: string` for stable React keys.

### `fixtures/mypage.ts`

**Constants** (all typed):

- `MYPAGE_KPIS: MyPageKpi[]` — 6 summary KPI tiles.
- `MY_TODOS: TodoItem[]` — dashboard-synced action list.
- `WATCHLIST_SUMMARIES: WatchlistSummary[]` — compact watchlist summaries.
- `ACTIVITY_LOGS: ActivityLog[]` — recent user activity rows.
- `POSITION_THESES: PositionThesis[]` — locked thesis and reaction memo examples.
- `TRANSACTION_HISTORY: TransactionHistory[]` — transaction rows.
- `SETTING_ROWS: SettingRow[]` — static account/settings summary rows.

**Types**: `MyPageKpi`, `TodoItem`, `WatchlistSummary`, `ActivityLog`, `PositionThesis`, `TransactionHistory`, `SettingRow`.

All list-item types carry an `id: string` for stable React keys.

## Routes (`routes/`)

### `RoutePlaceholder({ title, eyebrow, description })`

Used by routes that haven't been implemented yet. Wraps content in `PageContainer` + a `Card` containing `EmptyState`.

### `dashboard/DashboardPage` (paths: `/`, `/dashboard`)

Composes the dashboard from `routes/dashboard/sections/*` and `fixtures/dashboard.ts`. Top-level structure: `PageContainer(title=time-aware greeting, description=GreetingMeta, actions=GreetingActions)` → `NoticeBanner` → `ActionPrompts` → `IndicatorStrip` → 4× `.pair` grids of sibling section cards. The page owns `useDashboardClock()` for greeting/market session state, local todo completion state, local calendar interest state, and `useInteractionActions()` so visible dashboard surfaces open `DetailPanel` or planned notices instead of dead-clicking.

**Sections** (`routes/dashboard/sections/`):

- `GreetingActions({ summary, onOpenAssets?, onOpenTodayPnl?, onOpenTotalReturn? })` + `GreetingMeta({ currentTimeLabel, marketStatus })` — slotted into `PageContainer.actions` / `description`; asset/PnL KPIs route or open return detail instead of being static text.
- `NoticeBanner({ notice, onOpen? })`.
- `ActionPrompts({ todos, onOpenTodo?, onToggleTodo?, onOpenAll? })` — todo grid, 2-col → 1-col responsive; checkbox toggles local completion while row body opens detail.
- `IndicatorStrip({ fearGreed, macros, marketTime, onOpenFearGreed?, onOpenMacro? })` — renders **two** sibling `<Card>`s (clickable F&G gauges + clickable macro grid); place inside a `.pair` wrapper in the page.
- `WatchlistCard({ state })` — renders signed-out/config-error/loading/error/empty/ready states from `useWatchlist()`; loading uses the shared `Skeleton` primitive.
- `TopMoversCard({ moversByMarket, initialMarket, sessions })` — market-aware KR/US movers with MTS-style market switch and current-session badge.
- `NewsList({ items, onOpenNews?, onSaveNews?, onAddNote? })`.
- `EconomicEventsList({ events, starredEventIds?, onOpenEvent?, onToggleReminder? })` — calendar rows open detail; star button toggles local interest/reminder state and opens reminder detail.
- `ReturnsChart({ data, onOpenReturns?, onOpenContributor?, onSendReview? })` — period buttons switch local chart state, chart opens period comparison detail, contributor rows open detail.
- `PortfolioSummaryCard({ assets, holdings, totalAssetsShort, onOpenPortfolio?, onOpenAsset?, onOpenHolding? })` — donut, asset rows, and holding rows all open detail.
- `HeatmapCard({ title, sub, seed, onOpenCell?, onOpenAll? })` — `seed: number` drives deterministic cell colors; cells and footer open market-map detail.

**Shared helpers**:

- `sections/sparkline.ts` — four precomputed SVG path strings: `SPARK_MACRO_UP/DOWN` (40×14) and `SPARK_ROW_UP/DOWN` (28×14).
- `dashboardInteractions.ts` — pure mappers from dashboard fixture records to shared `DetailContent`.
- `useDashboardClock.ts` — dashboard-only time/session hook. Produces KST-aware greeting text, formatted current time, KR/US session status, and the default market for `TopMoversCard`.
- `sections/_card.module.css` — shared card-header pieces consumed via `composes: x from "./_card.module.css"`. Exports class names `title`, `subtitle`, `titleBlock`, `headerLeft`, `headerRowBordered`, `footerRowBordered`. Add a class here only when its declarations are byte-identical across 3+ sections.
- `sections/_table.module.css` — shared table scaffolding for row-based sections (Watchlist, TopMovers). Exports `tableHead`, `thGrow`, `thFixed`, `row` (with `:last-child` border reset), `symbol`, `symbolCode`, `symbolName`, `cellPrice`, `cellChange`, `cellChangePos`, `cellChangeNeg`. Section-specific column widths stay in the section module.

### `stocks/StocksPage` (path: `/stocks`)

Renders a `PageContainer(title="종목 목록")` with a `DataTable` using `density="compact"`. Rows are `STOCK_LIST` fixtures; each row navigates to `/stocks/${symbol}` and the symbol cell also carries a direct link. Columns: symbol+name, exchange (Badge), price, change (color-coded), marketCap, sector.

**File**: `routes/stocks/StocksPage.tsx`, co-located `StocksPage.module.css`.

### `stocks/StockDetailPage` (path: `/stocks/:symbol`)

Route-param-driven stock detail page. Uses `useParams` to read `symbol`, calls `getStockDetail(symbol)` for fixture lookup, and owns `useInteractionActions()` for tab-local detail surfaces. Unknown symbols render `PageContainer` + `EmptyState` + link back to `/stocks`. Known symbols render:

- **Header**: PageContainer with eyebrow "리서치 / 종목", title = company name, description = Badges (symbol, exchange, sector) + price/change/lastUpdated.
- **Key stats strip**: Card with 8 inline stats (marketCap, volume, 52W range, PER, PBR, ROE, dividendYield, beta).
- **8 tabs** (state-driven via `useState`): 개요 / 차트 / 재무 / 밸류에이션 / 공시·실적 / 뉴스 / 수급 / 컨센서스. Tab bar uses `<button>` elements with class-variant active state.
- **Right sidebar** (sticky): analysis snapshot card reusing `fixtures/analysis.ts`, similar stocks list (from fixture), sector average comparison cards.
- **Tab content** delegated to section components under `routes/stocks/sections/`.

**Sections** (`routes/stocks/sections/`):

- `OverviewSection({ detail })` — grid: price chart placeholder (ChartPlaceholder) + key stats card + technical signals card + company overview card + sector position card.
- `ChartSection({ detail })` — full chart area with stateful period/type/indicator buttons. Main chart reads from `useQuote(detail.symbol, activeRange)` and renders `PriceChart` when ready; loading/empty/error states fall back to `ChartPlaceholder`. Source bar shows `last_refreshed_at` and a stale notice when present. Volume/RSI/MACD sub-panels remain `ChartPlaceholder` until later PRs wire indicators.
- `FinancialsSection({ incomeStatement, balanceSheet, cashFlow, keyRatios })` — sub-tabs (손익/재무/현금, 연간/분기), income statement table, balance sheet + cash flow grid, key ratios table. All from fixture tables.
- `ValuationSection({ metrics, peers, fairValues })` — 4-column metric cards (PER/PBR/EV/DY), PER-PBR trend chart placeholder + fair value estimates list, peer comparison table with highlight row.
- `FilingsSection({ filings, nextEarnings, onOpenFiling? })` — earnings trend chart placeholder + next earnings card, clickable filing timeline table with form-type badges and price impact colors.
- `NewsSection({ news, onOpenNews? })` — filter pills, clickable news grid (cards with time/source/title/summary), AI summary sidebar card.
- `SupplyDemandSection({ kpis, holders, insiders })` — notice banner, 4 KPI cards, short interest chart + insider trades grid, institutional holders table (13F data).
- `ConsensusSection({ consensus, reports, gurus })` — 4 KPI cards (rating/target/upside/analysts), target distribution + opinion distribution charts, analyst reports table, guru holdings grid.

**File**: `routes/stocks/StockDetailPage.tsx`, co-located `StockDetailPage.module.css`.

### `portfolio/PortfolioPage` (path: `/portfolio`) — live data

Live-data portfolio page. Reads `usePortfolio()` (PR-11) and composes the result via `routes/portfolio/sections/*`. Top-level structure: `PageContainer(eyebrow="Portfolio", title="운용 / 포트폴리오", description=updated_at + currency)` → loading fallback `Card` with `Skeleton` OR error fallback `Card` OR portfolio command controls + `KpiStrip` + thesis/alert board + 2-col grid (`HoldingsTable` + `TransactionsTable`). The command controls are local UI drafts until write APIs land: stock search uses `STOCK_LIST`, transaction entry prepends a local transaction, and thesis/target/stop-loss rules open shared `DetailPanel`.

**File**: `routes/portfolio/PortfolioPage.tsx`, co-located `PortfolioPage.module.css`.

**Sections** (`routes/portfolio/sections/`):

- `KpiStrip({ portfolio })` — 3 KPI tiles computed live from the portfolio: 투자원금 (∑ cost_basis), 보유 종목 count, 거래 내역 count + buy/sell breakdown. Uses `KpiTile` primitives.
- `HoldingsTable({ holdings, onOpenHolding? })` — Card-wrapped `DataTable<PortfolioHolding>` (density `compact`) with columns: symbol+name, exchange, quantity, avg cost, cost basis. Rows open holding detail through `onRowClick`. Renders `EmptyState` inside the Card when `holdings.length === 0`. Market value / PnL columns intentionally absent — they require the deferred price join (PR-13).
- `TransactionsTable({ transactions, onOpenTransaction? })` — Card-wrapped `DataTable<PortfolioTransaction>` (density `compact`) with columns: date, type/Badge, symbol, qty, price, amount, currency, note. Rows open transaction detail through `onRowClick`. Renders `EmptyState` inside the Card when `transactions.length === 0`. Transaction type mapped to Badge tone via `Record<PortfolioTransactionType, BadgeTone>`.

### `analysis/AnalysisPage` (path: `/analysis`)

Static analysis hub composed from `routes/analysis/sections/*` and `fixtures/analysis.ts`. Top-level structure: `PageContainer(eyebrow="Analysis", title="분석", description=…)` → `<nav>` tab bar (8 tabs) → `<section>` containing the active tab's section component. Tab state held by `useState<AnalysisTab>`; tab `<button>` pattern reused from `/stocks/:symbol`. The page owns `useInteractionActions()` for tool and row detail panels. Fixture-only, no API calls.

**File**: `routes/analysis/AnalysisPage.tsx`, co-located `AnalysisPage.module.css`.

**Sections** (`routes/analysis/sections/`):

- `MarketOverviewSection({ onOpenTool?, onSelectToolTab?, onOpenIndex?, onOpenSector?, onOpenStyle?, onOpenSignal?, onOpenScreen?, onOpenChart?, onOpenFedWatch? })` — 시장 한눈에. 3-col top grid (`Card`: 시장 개요 with clickable `ChartPlaceholder`, 15-item selector, default 5 selected indicators, all/5 toggle, clickable index row · `Card` with `DataTable<SectorReturn>` for sector rotation · `Card` with clickable style rotation grid). Adds a FedWatch-style rate-cut probability visualization before the tool registry. Tool cards are generated from `ANALYSIS_TOOLS` registry and can either switch to the target tab or open `DetailPanel`. 2-col bottom grid: `Card` with recent signal list + `Card` with `DataTable<SavedScreen>`; all rows open detail.
- `SentimentSection({ onOpenIndicator?, onOpenGlossary?, onOpenChart? })` — 시장 심리. Banner `Card`, balanced region grid with one `Card`+`DataTable<SentimentIndicator>` per region (US/KR/Global), then a 2-col chart/glossary row. Rows and chart placeholder open detail. Status mapped to `Badge` tone via `Record<SentimentStatus, BadgeTone>`.
- `TechnicalSection({ onOpenIndicator?, onOpenChart? })` — 기술적 분석. Clickable `Card`+`ChartPlaceholder` for chart, `Card`+`DataTable<TechnicalIndicator>` with buy/sell/hold `Badge`; rows open detail.
- `FinancialAnalysisSection({ onOpenScore?, onOpenChart? })` — 재무 분석. Clickable `Card`+`ChartPlaceholder`, `Card`+`DataTable<FinancialScore>` with A-D grade `Badge`; rows open detail.
- `QuantFactorSection({ onOpenFactor?, onOpenChart? })` — 퀀트 팩터. Clickable `Card`+`ChartPlaceholder`, `Card`+`DataTable<QuantFactor>` with spread color class; rows open detail.
- `DcfSection({ onOpenAssumption?, onOpenChart? })` — 적정주가 계산. `Card` with clickable `KpiTile` grid (4 assumptions) + clickable `Card`+`ChartPlaceholder` for scenario matrix.
- `SectorFlowSection({ onOpenSector?, onOpenChart? })` — 섹터 흐름. Clickable `Card`+`ChartPlaceholder`, `Card`+`DataTable<SectorMomentum>` with trend `Badge`; rows open detail.
- `SignalsSection({ onOpenAlert? })` — 신호 알림. `Card`+`DataTable<SignalAlert>` with direction `Badge`; rows open detail.

### `reports/ReportsPage` (path: `/reports`)

Static report library page from `wire-masters-learn.jsx` (`WireReports`). Top-level structure: `PageContainer(eyebrow="Reports", title="리포트", description=…, actions=interest toggle + last updated)` → `ReportFilters` → `ReportKpiStrip` → `ReportsTable`. Interest state is local UI-only until the write-backed saved-report path lands.

**File**: `routes/reports/ReportsPage.tsx`, co-located `ReportsPage.module.css`.

**Sections** (`routes/reports/sections/`):

- `ReportFilters()` — static search/sort/category/region/period controls rendered as non-interactive filter chips.
- `ReportKpiStrip({ kpis })` — 4-column KPI grid using `KpiTile`.
- `ReportsTable({ reports, bookmarkedIds, onToggleBookmark, onOpenReport? })` — `Card` + `DataTable<ReportListItem>` (density `compact`) with local interest-star action, row navigation, title/summary link, region/category `Badge`s, status `Badge`, tags, date. Empty list renders `EmptyState`.

### `reports/ReportDetailPage` (path: `/reports/:id`)

Route-param-driven report detail page. Uses `useParams` to read `id`, calls `getReport(id)` for fixture lookup. Unknown ids render `PageContainer` + `EmptyState` + link back to `/reports`. Known ids render header, AI summary, sticky TOC, Docling-style body excerpt, and right rail.

**File**: `routes/reports/ReportDetailPage.tsx`, co-located `ReportDetailPage.module.css`.

**Sections** (`routes/reports/sections/`):

- `ReportDetailHeader({ report })` — cover placeholder, region/category/status `Badge`s, metadata, local interest toggle, and planned-action feedback for PDF/memo controls.
- `ReportSummary({ report })` — AI summary `Card`, 3 `KpiTile`s, key point list.
- `ReportToc({ items })` — sticky table-of-contents `Card`.
- `ReportBody({ report })` — body excerpt `Card` with reading-mode badges and `DataTable<InflationRow>` for the embedded inflation table.
- `ReportSideRail({ report, onOpenTicker?, onOpenRelatedReport?, onOpenMemo? })` — related tickers open detail, related reports route, memo prompt shows planned feedback.

### `masters/MastersPage` (path: `/masters`)

Static masters list from `wire-masters-learn.jsx` (`WireMasters`). Renders `PageContainer` + `Card` + `DataTable<MasterListItem>` with row navigation to `/masters/:id`, strategy `Badge`s, AUM, holdings count, latest filing, CAGR.

**File**: `routes/masters/MastersPage.tsx`, co-located `MastersPage.module.css`.

### `masters/MasterDetailPage` (path: `/masters/:id`)

Route-param-driven master detail page. Uses `getMaster(id)` fixture lookup and `useInteractionActions()` for follow/planned state and recent-change detail panels. Unknown ids render `EmptyState` with a link back to `/masters`. Known ids render KPI summary tiles, holdings table, `ChartPlaceholder` for sector/performance, 13F quarterly changes table, principles, and recent changes.

**File**: `routes/masters/MasterDetailPage.tsx`, co-located `MasterDetailPage.module.css`.

### `learn/LearnPage` (path: `/learn`)

Static learning page from `wire-masters-learn.jsx` (`WireLearn`) with three tabs: `입문서·칼럼`, `용어 사전`, `리포트 라이브러리`. Tab state is local `useState<LearnTab>`. Categories, guides, glossary rows, and report-library rows open shared `DetailPanel` through `useInteractionActions()`; guide and glossary details read structured fields from `fixtures/learn.ts` rather than page-local hardcoded blurbs.

**File**: `routes/learn/LearnPage.tsx`, co-located `LearnPage.module.css`.

### `mypage/MyPage` (path: `/mypage`)

Static mypage from `wire-mypage-admin.jsx` (`WireMyPageAll`, excluding admin). Renders identity strip with in-page quick tab switches, then mini-tabs for 개요 / 포트폴리오 / 관심글 / 활동 / 설정. The page acts as a user hub: saved reports, watchlist summaries, position thesis notes, transactions, activity, todos, and settings are reachable without bouncing to another route. KPI tiles, todos, watchlist summaries, thesis cards, tables, and settings rows open shared `DetailPanel`; saved reports route to report detail. Form-like settings stay static with no submission state.

**File**: `routes/mypage/MyPage.tsx`, co-located `MyPage.module.css`.

### Pending routes

- `admin/AdminPage` — deferred out of MVP (see EP-0001 PR-06 split note).

### `kitchen-sink/KitchenSinkPage` (path: `/_kitchen-sink`)

Primitives showcase from PR-02.

## Styles (`styles/`)

### `tokens.css`

CSS variables (only place that defines them):

- Surfaces: `--bg`, `--surface`, `--surface-muted`
- Text: `--ink`, `--muted`, `--faint`
- Lines: `--line`, `--hairline`
- Brand: `--accent`
- Semantic: `--positive`, `--negative`, `--warning`
- Focus: `--focus`
- Font: `--mono`

### `base.css`

Global reset, `.sr-only`, `.skip-link`. **No new selectors here without a discussion in the PR description.**

## Conventions Pointer

Behavior rules (heading hierarchy, CSS Module layout, key stability, etc.) live in `docs/FRONTEND.md` under **Conventions** and **Anti-patterns**. This file is the _map_; that file is the _law_. If they disagree, fix the map.
