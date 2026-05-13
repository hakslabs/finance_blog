# Wires Inventory

Map of `design/wires-v3/*.jsx` to production routes and the shared primitives each wire expects. Use this to decide which wire files an agent must load for a given PR — do not load the full `design/wires-v3/` tree.

## Wire → Route Map

| Wire file | Production route(s) | First-pass primitives |
| --- | --- | --- |
| `wire-overview.jsx` | layout reference only | `AppShell`, `Sidebar`, `TopBar`, `PageContainer` |
| `wire-primary.jsx` | layout reference only | `AppShell`, `Sidebar`, `TopBar` |
| `wires-shared.jsx` | (shared primitives source) | `Card`, `Section`, `DataTable`, `KpiTile`, `ChartPlaceholder`, `EmptyState`, `Badge` |
| `wire-home.jsx` | `/`, `/dashboard` | `WatchlistCard`, `PortfolioSummaryCard`, `IndicatorStrip`, `EconomicEventsList`, `ActionPrompts` |
| `wire-stock.jsx` | `/stocks/:symbol` (header + chart area) | `StockHeader`, `PriceBlock`, `ChartPlaceholder` |
| `wire-stock-tabs-a.jsx` | `/stocks/:symbol` (tabs A) | `TabBar`, fundamentals tables |
| `wire-stock-tabs-b.jsx` | `/stocks/:symbol` (tabs B) | reports list, related items |
| `wire-portfolio.jsx` | `/portfolio` | `HoldingsTable`, `TransactionsTable`, `PerformanceTile` |
| `wire-analysis.jsx` | `/analysis` | screeners, comparison tables |
| `wire-masters-learn.jsx` | `/masters`, `/learn` | manager cards, article list |
| `wire-mypage-admin.jsx` | `/mypage`, `/admin` | settings forms, admin tables |
| `wire-screener-heatmap-login.jsx` | screener inside `/analysis`, login modal | heatmap grid, login form |
| `wire-modals.jsx` | modal layer (any route) | `Modal`, `ConfirmDialog` |
| `wire-remaining.jsx` | `/reports`, `/reports/:id` and overflow | reports list, report detail |
| `wire-ia.jsx` | information architecture reference | none |
| `wire-data-arch.jsx` | data architecture reference | none |

## Primitive Ownership

Primitives extracted in PR-02 must originate from `wires-shared.jsx` semantics, not from individual page wires. If a page wire uses a one-off composition, keep it page-local and revisit only after two pages need it.

## Loading Rules For Agents

- For a page PR, load only its row's wire(s) plus `wires-shared.jsx` and (optionally) `wire-overview.jsx` for layout reference.
- Never load all wires at once; the canvas in `design/STOCKLAB Wireframes v3.html` is for human review, not agent context.
- If a wire is missing a section the route needs, mark a TODO in the PR and ship the rest. Do not invent UI not present in any wire.
