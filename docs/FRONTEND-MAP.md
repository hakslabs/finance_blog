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
- **`KpiTile`** — Default for label / big value / optional detail / optional trend blocks. Compose a horizontal strip by wrapping multiple `KpiTile`s in a grid.
- **`EmptyState`** — Default for empty sections inside a `Card`. Render it conditionally when `rows.length === 0`; do not create empty fixture exports just to demonstrate it.
- **`Badge`** — Default for small status/category chips. Map domain enums to `tone` via a `Record<State, BadgeTone>` constant.
- **`ChartPlaceholder`** — Default for static chart areas until a real chart lands.
- **`PageContainer`** — Mandatory page shell (rule C-1). Not optional.
- **`Card` / `Section`** — Default container for grouped content with a `<h2>` header. Custom inner header layouts go inside the `Card` body, not outside it.

If you bypass a default, document the blocker in the PR description before implementing the replacement.

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

### `fixtures/stocks.ts`

**Constants** (all typed):

- `STOCK_LIST: StockListItem[]` — 12 rows (AAPL, NVDA, MSFT, TSLA, GOOGL, AMZN, META, 005930, 000660, 373220, AVGO, AMD). Each has `id`, `symbol`, `name`, `exchange`, `sector`, `price`, `change`, `up`, `marketCap`, `volume`.
- `STOCK_TABS` — readonly tuple of 8 tab names: `개요 | 차트 | 재무 | 밸류에이션 | 공시·실적 | 뉴스 | 수급 | 컨센서스`. Exported as `StockTab` type.
- `AAPL_DETAIL: StockDetail` — full detail fixture for Apple. Only symbol with detail data in PR-04.
- `getStockDetail(symbol: string): StockDetail | undefined` — case-insensitive lookup. Returns undefined for unknown symbols.

**Types** (one per concept): `StockListItem`, `StockKeyStats`, `CompanyOverview`, `SectorPosition`, `TechnicalSignal`, `FinancialRow`, `FinancialTable`, `PeerComparison`, `ValuationMetric`, `FairValueEstimate`, `FilingItem`, `EarningsEvent`, `NewsItem` (stock-domain, distinct from dashboard's `NewsItem`), `SupplyDemandKpi`, `InstitutionalHolder`, `InsiderTrade`, `ConsensusSummary`, `AnalystReport`, `GuruHolding`, `SimilarStock`, `StockDetail`.

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
- `WatchlistCard({ items })`.
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

### Pending routes

- `portfolio/PortfolioPage` — PR-05.
- `analysis/AnalysisPage`, `masters/MastersPage`, `reports/ReportsPage`, `reports/ReportDetailPage`, `learn/LearnPage`, `mypage/MyPage`, `admin/AdminPage` — PR-06.

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
