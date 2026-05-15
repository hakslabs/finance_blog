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

Top-level chrome: sidebar + main area. Wraps `<Routes>` in `App.tsx`.

### `Sidebar()`

Left navigation. Items come from `navigation.ts`. No props.

### `TopBar()`

Top utility bar. No props.

### `PageContainer({ title, eyebrow?, description?, actions?, children? })`

Page-level landmark. Emits `<section aria-labelledby>` + `<h1>`. **Every route page must wrap its content in this.**

- `title: string` — becomes `<h1>`.
- `eyebrow?: string` — small label above title.
- `description?: ReactNode` — paragraph below title; accepts inline-styled children.
- `actions?: ReactNode` — top-right slot (KPI tile, primary CTA).
- `children?: ReactNode` — body, flex-column with 18px gap.

### `navigation.ts`

Exports `NAV_ITEMS: { label, path, icon? }[]` consumed by `Sidebar`.

## Primitives (`components/primitives/`)

### `Card({ title?, eyebrow?, actions?, className?, children })`

`<article>` container with optional header. Emits `<h2>` only when `title` is set. Pass `className` to override padding/border (dashboard sections use `padding: 0` to render their own internal headers). Custom headers may emit their own `<h2>` inside the Card body (see C-2 in `FRONTEND.md`).

### `Section({ title, eyebrow?, description?, actions?, children })`

`<section aria-labelledby>` with `<h2>`. Use for in-page subsections inside a `PageContainer` body when grouping cards.

### `Badge({ tone?, children })`

`<span>` chip. `tone: "neutral" | "accent" | "positive" | "negative" | "warning"`. Default `"neutral"`.

### `DataTable<T>({ columns, rows, getRowKey, emptyMessage?, density? })`

Generic table. `columns: { key, header, render(row), align? }[]`. `getRowKey(row)` returns a stable id (use `row.id`). Shows `emptyMessage` when `rows.length === 0`. Prefer this over hand-built flex rows for tabular data.

`density?: "comfortable" | "compact"` (default `"comfortable"`). Compact density: 6px 12px padding, 0.6875rem font, hairline rows. Exported as `TableDensity` type.

### `EmptyState({ title, description, action? })`

Inline empty placeholder. Emits styled `<p>` for title/description (no `<h2>`). Optional `action` slot for a button/link.

### `KpiTile({ label, value, detail?, trend? })`

Single KPI block — label, big value, optional detail line and trend node.

### `ChartPlaceholder({ label, height? })`

Stub chart box for routes that don't yet have real chart implementations. `height` defaults to 240px.

### Primitive Selection Rules

Defaults — use these *before* writing route-local alternatives. See `docs/FRONTEND.md` rule C-11 for the full reasoning and blocker criteria.

- **`DataTable<T>`** — Default for any tabular column/row data. Cell `render` functions accept arbitrary JSX, so colored values, symbols+name pairs, Badges, sparklines, and compact metadata inside cells are **not** reasons to hand-roll a `<table>`. Bypass only for structural needs `DataTable` does not support: row expansion, grouped/nested rows, pinned columns, non-table spatial layout.
- **`KpiTile`** — Default for label / big value / optional detail / optional trend blocks. Compose a horizontal strip by wrapping multiple `KpiTile`s in a grid (see `KpiStrip` in `routes/portfolio/sections/`).
- **`EmptyState`** — Default for empty sections inside a `Card`. Render it conditionally when `rows.length === 0`; do not create empty fixture exports just to demonstrate it.
- **`Badge`** — Default for small status/category chips. Map domain enums to `tone` via a `Record<State, BadgeTone>` constant.
- **`ChartPlaceholder`** — Default for static chart areas until a real chart lands.
- **`PageContainer`** — Mandatory page shell (rule C-1). Not optional.
- **`Card` / `Section`** — Default container for grouped content with a `<h2>` header. Custom inner header layouts go inside the `Card` body, not outside it.

If you bypass a default, document the blocker in the PR description before implementing the replacement.

## Lib (`lib/`)

### `env.ts`

Browser-safe environment access. Exports `env.apiBaseUrl`, read from `VITE_API_BASE_URL` with a local fallback.

### `api-client.ts`

Typed FastAPI client for frontend data paths. Exports `apiClient.getMyWatchlist()` for `GET /v1/watchlists/me`, watchlist response types, and `ApiError`. In local dev, attaches `X-Dev-User` from `VITE_DEV_USER_ID`.

### `useWatchlist.ts`

Dashboard hook for the PR-09 watchlist data path. Returns `WatchlistState`: loading, ready with `Watchlist`, or error with message.

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
- `TOP_MOVERS: TopMover[]`
- `NEWS: NewsItem[]`
- `ECONOMIC_EVENTS: EconomicEvent[]`
- `RETURN_DATA: ReturnSeries`
- `PORTFOLIO_COMPOSITION: PortfolioAsset[]`
- `TOP_HOLDINGS: TopHolding[]`

**Types**: `PortfolioSummary`, `MarketStatus`, `Notice`, `TodoItem`, `TodoSource` (`"공통" | "알람" | "Thesis"`), `FearGreedData`, `MacroIndicator`, `WatchlistItem`, `TopMover`, `NewsItem`, `NewsCategory` (`"kr" | "us" | "macro"`), `EconomicEvent`, `EventType` (`"macro" | "earnings" | "dividend"`), `ReturnSeries`, `ReturnContributor`, `PortfolioAsset`, `TopHolding`.

All list-item types carry an `id: string` for stable React keys.

### `fixtures/portfolio.ts`

**Constants** (all typed):

- `PORTFOLIO_KPI: PortfolioKpi[]` — 6 KPI items (total value, principal, unrealized P&L, today P&L, realized YTD, CAGR).
- `HOLDINGS: Holding[]` — 6 rows (AAPL, NVDA, MSFT, 005930, TSLA, 000660). Each has `id`, symbol, name, quantity, average/current price, market value, PnL%, up flag, weight %, memo status, counts, optional thesis.
- `TRANSACTIONS: Transaction[]` — 8 rows (buy/sell/dividend/deposit). Each has `id`, date, type, symbol, nullable quantity/price, amount, currency, note.
- `BENCHMARKS: Benchmark[]` — 3 items (portfolio +12.4%, KOSPI +4.1%, S&P +8.2%). Each has `id`, label, return.
- `PERFORMANCE_METRICS: PerformanceMetric[]` — 3 items (max drawdown -8.2%, Sharpe 1.42, beta 1.06). Each has `id`, label, value, optional positive flag.

**Types** (one per concept): `PortfolioKpi`, `Holding`, `HoldingMemoStatus` (`"locked" | "memo" | "none"`), `Transaction`, `TransactionType` (`"buy" | "sell" | "dividend" | "deposit"`), `Benchmark`, `PerformanceMetric`.

All list-item types carry an `id: string` for stable React keys.

### `fixtures/analysis.ts`

**Constants** (all typed):

- `ANALYSIS_TABS` — readonly tuple of 8 tab names: `시장 한눈에 | 시장 심리 | 기술적 분석 | 재무 분석 | 퀀트 팩터 | 적정주가 계산 | 섹터 흐름 | 신호 알림`. Exported as `AnalysisTab` type.
- `MARKET_INDICES: MarketIndex[]` — 3 items (S&P 500, KOSPI, VIX).
- `SECTOR_ROTATION: SectorReturn[]` — 7 sectors, 1M returns.
- `STYLE_ROTATION: StyleCell[]` — 4 cells (대형/소형 × 그로스/밸류).
- `ANALYSIS_TOOLS: AnalysisTool[]` — 8 tool cards.
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
- `LEARN_CATEGORIES: LearnCategory[]` — 6 guide categories.
- `GUIDE_ARTICLES: GuideArticle[]` — 4 recommended guide rows.
- `GLOSSARY_TERMS: GlossaryTerm[]` — 6 glossary terms rendered through `DataTable`.

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

Composes the dashboard from `routes/dashboard/sections/*` and `fixtures/dashboard.ts`. Top-level structure: `PageContainer(title=greeting, description=GreetingMeta, actions=GreetingActions)` → `NoticeBanner` → `ActionPrompts` → `IndicatorStrip` → 4× `.pair` grids of sibling section cards.

**Sections** (`routes/dashboard/sections/`):

- `GreetingActions({ summary })` + `GreetingMeta({ date, day, time, nyseOpensIn })` — slotted into `PageContainer.actions` / `description`.
- `NoticeBanner({ notice })`.
- `ActionPrompts({ todos })` — todo grid, 2-col → 1-col responsive.
- `IndicatorStrip({ fearGreed, macros, marketTime })` — renders **two** sibling `<Card>`s (F&G gauges + macro grid); place inside a `.pair` wrapper in the page.
- `WatchlistCard({ state })` — renders loading, error, empty, and ready states from `useWatchlist()`.
- `TopMoversCard({ movers })`.
- `NewsList({ items })`.
- `EconomicEventsList({ events })`.
- `ReturnsChart({ data })`.
- `PortfolioSummaryCard({ assets, holdings, totalAssetsShort })`.
- `HeatmapCard({ title, sub, seed })` — `seed: number` drives the deterministic cell colors.

**Shared helpers**:

- `sections/sparkline.ts` — four precomputed SVG path strings: `SPARK_MACRO_UP/DOWN` (40×14) and `SPARK_ROW_UP/DOWN` (28×14).
- `sections/_card.module.css` — shared card-header pieces consumed via `composes: x from "./_card.module.css"`. Exports class names `title`, `subtitle`, `titleBlock`, `headerLeft`, `headerRowBordered`, `footerRowBordered`. Add a class here only when its declarations are byte-identical across 3+ sections.
- `sections/_table.module.css` — shared table scaffolding for row-based sections (Watchlist, TopMovers). Exports `tableHead`, `thGrow`, `thFixed`, `row` (with `:last-child` border reset), `symbol`, `symbolCode`, `symbolName`, `cellPrice`, `cellChange`, `cellChangePos`, `cellChangeNeg`. Section-specific column widths stay in the section module.

### `stocks/StocksPage` (path: `/stocks`)

Renders a `PageContainer(title="종목 목록")` with a `DataTable` using `density="compact"`. Rows are `STOCK_LIST` fixtures; each row's symbol links to `/stocks/${symbol}`. Columns: symbol+name, exchange (Badge), price, change (color-coded), marketCap, sector.

**File**: `routes/stocks/StocksPage.tsx`, co-located `StocksPage.module.css`.

### `stocks/StockDetailPage` (path: `/stocks/:symbol`)

Route-param-driven stock detail page. Uses `useParams` to read `symbol`, calls `getStockDetail(symbol)` for fixture lookup. Unknown symbols render `PageContainer` + `EmptyState` + link back to `/stocks`. Known symbols render:

- **Header**: PageContainer with eyebrow "리서치 / 종목", title = company name, description = Badges (symbol, exchange, sector) + price/change/lastUpdated.
- **Key stats strip**: Card with 8 inline stats (marketCap, volume, 52W range, PER, PBR, ROE, dividendYield, beta).
- **8 tabs** (state-driven via `useState`): 개요 / 차트 / 재무 / 밸류에이션 / 공시·실적 / 뉴스 / 수급 / 컨센서스. Tab bar uses `<button>` elements with class-variant active state.
- **Right sidebar** (sticky): Similar stocks list (from fixture), sector average comparison cards.
- **Tab content** delegated to section components under `routes/stocks/sections/`.

**Sections** (`routes/stocks/sections/`):

- `OverviewSection({ detail })` — grid: price chart placeholder (ChartPlaceholder) + key stats card + technical signals card + company overview card + sector position card.
- `ChartSection({ detail })` — full chart area with period pills, type pills, indicator pills, main ChartPlaceholder, volume sub-panel, RSI sub-panel, MACD sub-panel.
- `FinancialsSection({ incomeStatement, balanceSheet, cashFlow, keyRatios })` — sub-tabs (손익/재무/현금, 연간/분기), income statement table, balance sheet + cash flow grid, key ratios table. All from fixture tables.
- `ValuationSection({ metrics, peers, fairValues })` — 4-column metric cards (PER/PBR/EV/DY), PER-PBR trend chart placeholder + fair value estimates list, peer comparison table with highlight row.
- `FilingsSection({ filings, nextEarnings })` — earnings trend chart placeholder + next earnings card, filing timeline table with form-type badges and price impact colors.
- `NewsSection({ news })` — filter pills, news grid (cards with time/source/title/summary), AI summary sidebar card.
- `SupplyDemandSection({ kpis, holders, insiders })` — notice banner, 4 KPI cards, short interest chart + insider trades grid, institutional holders table (13F data).
- `ConsensusSection({ consensus, reports, gurus })` — 4 KPI cards (rating/target/upside/analysts), target distribution + opinion distribution charts, analyst reports table, guru holdings grid.

**File**: `routes/stocks/StockDetailPage.tsx`, co-located `StockDetailPage.module.css`.

### `portfolio/PortfolioPage` (path: `/portfolio`)

Static portfolio page composed from `routes/portfolio/sections/*` and `fixtures/portfolio.ts`. Top-level structure: `PageContainer(eyebrow="Portfolio", title="운용 / 포트폴리오", description=meta)` → `KpiStrip` → 2-col grid (`HoldingsTable` + `TransactionsTable`) → `PerformanceSummary`. Fixture-only, no API calls.

**File**: `routes/portfolio/PortfolioPage.tsx`, co-located `PortfolioPage.module.css`.

**Sections** (`routes/portfolio/sections/`):

- `KpiStrip({ kpis })` — 6-column KPI strip using `KpiTile` primitives. Responsive: 6→3→2 columns. Uses class variants for positive/negative sentiment.
- `HoldingsTable({ holdings })` — Card-wrapped `DataTable<Holding>` (density `compact`) with columns: symbol+name, qty, avg price, current price, market value, PnL%, weight, memo status. Renders `EmptyState` inside the Card when `holdings.length === 0`. Class variants for PnL color and memo status.
- `TransactionsTable({ transactions })` — Card-wrapped `DataTable<Transaction>` (density `compact`) with columns: date, type/Badge, symbol, qty, price, amount, currency, note. Renders `EmptyState` inside the Card when `transactions.length === 0`. Transaction type mapped to Badge tone via `Record<TransactionType, BadgeTone>`.
- `PerformanceSummary({ benchmarks, metrics })` — Card with benchmark legend (portfolio/KOSPI/S&P returns) and 3 metric tiles (max drawdown, Sharpe, beta) in a grid. Class variants for positive/negative/neutral sentiment.

### `analysis/AnalysisPage` (path: `/analysis`)

Static analysis hub composed from `routes/analysis/sections/*` and `fixtures/analysis.ts`. Top-level structure: `PageContainer(eyebrow="Analysis", title="분석", description=…)` → `<nav>` tab bar (8 tabs) → `<section>` containing the active tab's section component. Tab state held by `useState<AnalysisTab>`; tab `<button>` pattern reused from `/stocks/:symbol`. Fixture-only, no API calls.

**File**: `routes/analysis/AnalysisPage.tsx`, co-located `AnalysisPage.module.css`.

**Sections** (`routes/analysis/sections/`):

- `MarketOverviewSection()` — 시장 한눈에. 3-col top grid (`Card`: 시장 개요 with `ChartPlaceholder` + index row · `Card` with `DataTable<SectorReturn>` for sector rotation · `Card` with style rotation grid). 4-col tools grid as `Card`s. 2-col bottom grid: `Card` with recent signal list + `Card` with `DataTable<SavedScreen>`. Badge in card action slot.
- `SentimentSection()` — 시장 심리. Banner `Card`, then one `Card`+`DataTable<SentimentIndicator>` per region (US/KR/Global). Status mapped to `Badge` tone via `Record<SentimentStatus, BadgeTone>`. Composite history `Card` with `ChartPlaceholder` and legend. Glossary `Card` with `DataTable<IndicatorGlossary>`. No SVG gauges — `DataTable` + `Badge` per C-11 (gauge primitive would require a separate promotion PR).
- `TechnicalSection()` — 기술적 분석. `Card`+`ChartPlaceholder` for chart, `Card`+`DataTable<TechnicalIndicator>` with buy/sell/hold `Badge`.
- `FinancialAnalysisSection()` — 재무 분석. `Card`+`ChartPlaceholder`, `Card`+`DataTable<FinancialScore>` with A-D grade `Badge`.
- `QuantFactorSection()` — 퀀트 팩터. `Card`+`ChartPlaceholder`, `Card`+`DataTable<QuantFactor>` with spread color class.
- `DcfSection()` — 적정주가 계산. `Card` with `KpiTile` grid (4 assumptions) + `Card`+`ChartPlaceholder` for scenario matrix.
- `SectorFlowSection()` — 섹터 흐름. `Card`+`ChartPlaceholder`, `Card`+`DataTable<SectorMomentum>` with trend `Badge`.
- `SignalsSection()` — 신호 알림. `Card`+`DataTable<SignalAlert>` with direction `Badge`.

### `reports/ReportsPage` (path: `/reports`)

Static report library page from `wire-masters-learn.jsx` (`WireReports`). Top-level structure: `PageContainer(eyebrow="Reports", title="리포트", description=…, actions=last updated)` → `ReportFilters` → `ReportKpiStrip` → `ReportsTable`. Fixture-only, no API calls.

**File**: `routes/reports/ReportsPage.tsx`, co-located `ReportsPage.module.css`.

**Sections** (`routes/reports/sections/`):

- `ReportFilters()` — static search/sort/category/region/period controls rendered as non-interactive filter chips.
- `ReportKpiStrip({ kpis })` — 4-column KPI grid using `KpiTile`.
- `ReportsTable({ reports })` — `Card` + `DataTable<ReportListItem>` (density `compact`) with title/summary link, region/category `Badge`s, status `Badge`, tags, date. Empty list renders `EmptyState`.

### `reports/ReportDetailPage` (path: `/reports/:id`)

Route-param-driven report detail page. Uses `useParams` to read `id`, calls `getReport(id)` for fixture lookup. Unknown ids render `PageContainer` + `EmptyState` + link back to `/reports`. Known ids render header, AI summary, sticky TOC, Docling-style body excerpt, and right rail.

**File**: `routes/reports/ReportDetailPage.tsx`, co-located `ReportDetailPage.module.css`.

**Sections** (`routes/reports/sections/`):

- `ReportDetailHeader({ report })` — cover placeholder, region/category/status `Badge`s, metadata, static action buttons.
- `ReportSummary({ report })` — AI summary `Card`, 3 `KpiTile`s, key point list.
- `ReportToc({ items })` — sticky table-of-contents `Card`.
- `ReportBody({ report })` — body excerpt `Card` with reading-mode badges and `DataTable<InflationRow>` for the embedded inflation table.
- `ReportSideRail({ report })` — related tickers, tags, related reports, memo prompt cards.

### `masters/MastersPage` (path: `/masters`)

Static masters list from `wire-masters-learn.jsx` (`WireMasters`). Renders `PageContainer` + `Card` + `DataTable<MasterListItem>` with route links to `/masters/:id`, strategy `Badge`s, AUM, holdings count, latest filing, CAGR.

**File**: `routes/masters/MastersPage.tsx`, co-located `MastersPage.module.css`.

### `masters/MasterDetailPage` (path: `/masters/:id`)

Route-param-driven master detail page. Uses `getMaster(id)` fixture lookup. Unknown ids render `EmptyState` with a link back to `/masters`. Known ids render KPI summary tiles, holdings table, `ChartPlaceholder` for sector/performance, 13F quarterly changes table, principles, and recent changes.

**File**: `routes/masters/MasterDetailPage.tsx`, co-located `MasterDetailPage.module.css`.

### `learn/LearnPage` (path: `/learn`)

Static learning page from `wire-masters-learn.jsx` (`WireLearn`) with three tabs: `입문서·칼럼`, `용어 사전`, `리포트 라이브러리`. Tab state is local `useState<LearnTab>`. Guides use `Card`; glossary and report library use `DataTable`.

**File**: `routes/learn/LearnPage.tsx`, co-located `LearnPage.module.css`.

### `mypage/MyPage` (path: `/mypage`)

Static mypage from `wire-mypage-admin.jsx` (`WireMyPageAll`, excluding admin). Renders identity strip, KPI tiles, todos, watchlist summaries, activity log, locked thesis/reaction memo cards, transaction table, and settings summary table. Form-like settings stay static with no submission state.

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

Behavior rules (heading hierarchy, CSS Module layout, key stability, etc.) live in `docs/FRONTEND.md` under **Conventions** and **Anti-patterns**. This file is the *map*; that file is the *law*. If they disagree, fix the map.
