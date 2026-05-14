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

### `DataTable<T>({ columns, rows, getRowKey, emptyMessage? })`

Generic table. `columns: { key, header, render(row), align? }[]`. `getRowKey(row)` returns a stable id (use `row.id`). Shows `emptyMessage` when `rows.length === 0`. Prefer this over hand-built flex rows for tabular data.

### `EmptyState({ title, description, action? })`

Inline empty placeholder. Emits styled `<p>` for title/description (no `<h2>`). Optional `action` slot for a button/link.

### `KpiTile({ label, value, detail?, trend? })`

Single KPI block — label, big value, optional detail line and trend node.

### `ChartPlaceholder({ label, height? })`

Stub chart box for routes that don't yet have real chart implementations. `height` defaults to 240px.

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

### Pending routes

- `stocks/StocksPage`, `stocks/StockDetailPage` — PR-04.
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
