# Execution Plan — EP-0001 MVP Foundation

## Goal

Create the first production foundation for Finance_lab from the existing design skeleton, then connect it to real backend and data flows.

## Context

Repository contains a wireframe canvas under `design/`. One developer, agent-assisted (Codex / Claude / OpenCode). Implementation order is fixed: frontend first → backend/API → screen-facing data pipeline → external data → automatic scheduled collection last.

## How To Use This Plan

This plan is sliced into PR-sized units so that a single agent session can complete one PR within a ~200k context budget.

Per-PR conventions:

- Each PR section lists **Scope**, **Required Reading** (load these only), **Files**, **Acceptance**, **Out Of Scope**.
- **Required Reading is the upper bound, not the floor.** Do not load files outside this list unless the PR scope requires it.
- Do not load all `docs/references/*-llms.txt` into context. Open at most one per PR, and only when its domain is in scope.
- Do not load all `design/wires-v3/*.jsx` into context. Open only the wires listed in the PR's Required Reading.
- One PR = one merge. If a PR grows beyond its acceptance, split a follow-up PR rather than expanding scope.
- Mark a PR `[x]` only after it is merged and its acceptance has been verified on the running app.

Cross-cutting rules:

- Any UI PR (touching `web/src/`) must load `docs/FRONTEND.md` and `docs/FRONTEND-MAP.md`, and its acceptance includes passing the **PR Review Checklist** in `docs/FRONTEND.md`. Update `docs/FRONTEND-MAP.md` in the same PR for any added/renamed/removed file under `web/src/`.
- Frontend-only PRs use seeded fixtures inline; no API calls.
- Backend PRs return typed responses with example payloads; no UI changes.
- Data-path PRs touch one endpoint at a time and must show real values on screen.
- Schema PRs land the minimum tables needed by the next data PR — not the full domain.

## PR Ledger

### PR-01 — Repo scaffold and route shell

- [x] Scope: Vite + React + TypeScript app at repo root (or `app/`), router with empty page components for the 11 first routes from `docs/FRONTEND.md`, lint/format config, `.env.example`, CI build check.
- [x] Required Reading: `AGENTS.md`, `ARCHITECTURE.md`, `docs/FRONTEND.md`, `docs/design-docs/repo-layout.md`, `docs/design-docs/wires-inventory.md`, `vercel-labs/agent-skills:react-best-practices`.
- [x] Files: app scaffold, `src/routes/*`, `src/App.tsx`, lint config, README run instructions.
- [x] Acceptance: `npm run dev` boots; every route in `FRONTEND.md` renders a placeholder heading; `npm run build` and lint pass.
- [x] Out Of Scope: any layout chrome, any wire content, any backend.

### PR-02 — Layout chrome and shared primitives

- [x] Scope: Extract layout shell (sidebar + top bar + page container) and the shared primitives used across wires: `Card`, `Section`, `DataTable`, `KpiTile`, `ChartPlaceholder`, `EmptyState`, `Badge`. Static styles only.
- [x] Required Reading: `docs/FRONTEND.md`, `docs/design-docs/core-beliefs.md`, `design/wires-v3/wire-overview.jsx`, `design/wires-v3/wire-primary.jsx`, `design/wires-v3/wires-shared.jsx`, `vercel-labs/agent-skills:react-best-practices`, `vercel-labs/agent-skills:composition-patterns`, `vercel-labs/agent-skills:web-design-guidelines`.
- [x] Files: `src/components/layout/*`, `src/components/primitives/*`, layout applied in `App.tsx`.
- [x] Acceptance: All routes render inside the shared layout; primitives are usable in isolation (storybook not required, but a `/_kitchen-sink` dev-only route is acceptable).
- [x] Out Of Scope: page-specific composition, real charts.
- [x] Conventions established in this PR (apply to all later UI PRs):
  - CSS is split per component as co-located `*.module.css` (CSS Modules). Only `src/styles/tokens.css` (variables) and `src/styles/base.css` (reset, `sr-only`, `skip-link`) are global. No new globals without a reason.
  - Components that emit a labelled landmark (`PageContainer`, `Section`, …) must generate their `aria-labelledby` id via `useId()`. Never derive ids from user-facing strings.
  - Only `Card` / `Section` headers may render `<h2>`. Other primitives (e.g. `EmptyState`) use a styled `<p>` so the page heading hierarchy stays h1 → h2.

### PR-03 — Dashboard page (static)

- [x] Scope: Implement `/` and `/dashboard` from `wire-home.jsx`: `WatchlistCard`, `PortfolioSummaryCard`, `IndicatorStrip`, `EconomicEventsList`, `ActionPrompts`. Hardcoded fixtures imported from `src/fixtures/dashboard.ts`.
- [x] Required Reading: `docs/FRONTEND.md`, `docs/FRONTEND-MAP.md`, `docs/design-docs/wires-inventory.md`, `design/wires-v3/wire-home.jsx`, `design/wires-v3/wires-shared.jsx`, `vercel-labs/agent-skills:react-best-practices`, `vercel-labs/agent-skills:web-design-guidelines`.
- [x] Files: `src/routes/dashboard/*`, `src/fixtures/dashboard.ts`.
- [x] Acceptance: Dashboard visually matches the wire at the section level; no network calls; fixtures typed; `FRONTEND.md` PR Review Checklist passes.
- [x] Out Of Scope: stock detail, portfolio internals, any API call.
- [x] Conventions established in this PR (apply to all later UI PRs):
  - Page-sized routes split into `routes/{route}/sections/*` with one co-located `*.module.css` per section. The page file itself is composition only.
  - Fixtures use one type per concept (no `A & { ...B fields }` intersections). List-item types include `id: string` for stable React keys.
  - Pure helpers whose inputs are static (path strings, gauge arcs, etc.) are hoisted to module scope; per-instance deterministic helpers use `useMemo`.
  - When 3+ sections share byte-identical CSS, lift the class into a `_shared.module.css` under that route's `sections/` and consume via `composes: x from "./_shared.module.css"`. Section-specific tweaks stay local. Current shared modules: `routes/dashboard/sections/_card.module.css`, `_table.module.css`.

#### Watch list (deferred work surfaced by PR-03)

- **Card primitive header expansion** — `Card` only takes `title: string`. Dashboard sections render custom headers inside Card children (h2 + count/badge/description). If the same pattern repeats in PR-04/05/06, promote to a small PR that adds `title: ReactNode`, `description: ReactNode`, `meta: ReactNode` slots to `Card` and migrates existing usages. Do **not** do this preemptively — only when a third+ page shows the same duplication.

### PR-04 — Stocks list and Stock detail (static)

- [x] Prerequisite: extend `DataTable` with a `density?: "comfortable" | "compact"` prop (default `"comfortable"`). Compact density: 6px 12px padding, 0.6875rem font, hairline rows. This unblocks reuse from PR-04 onward; dashboard tables (PR-03) stay hand-built since they have non-tabular cells (sparkline, RSI dot, MA arrow). Do this as the first commit of the PR; verify by replacing the stocks list table with `DataTable`.
- [x] Scope: `/stocks` list + `/stocks/:symbol` detail using `wire-stock.jsx`, `wire-stock-tabs-a.jsx`, `wire-stock-tabs-b.jsx`. Tabs render with fixture data. Chart area uses `ChartPlaceholder`.
- [x] Required Reading: `docs/FRONTEND.md`, `docs/FRONTEND-MAP.md`, `design/wires-v3/wire-stock.jsx`, `design/wires-v3/wire-stock-tabs-a.jsx`, `design/wires-v3/wire-stock-tabs-b.jsx`, `vercel-labs/agent-skills:react-best-practices`.
- [x] Files: `src/routes/stocks/*`, `src/fixtures/stocks.ts`.
- [x] Acceptance: `/stocks/AAPL` renders all tabs from fixtures; route param drives the title and fixture lookup; `FRONTEND.md` PR Review Checklist passes.
- [x] Out Of Scope: real prices, screener/heatmap (PR-06b territory).

### PR-05 — Portfolio page (static)

- [x] Scope: `/portfolio` from `wire-portfolio.jsx`: holdings table, transactions table, basic performance summary tile. Fixtures only.
- [x] Required Reading: `docs/FRONTEND.md`, `docs/FRONTEND-MAP.md`, `design/wires-v3/wire-portfolio.jsx`, `vercel-labs/agent-skills:react-best-practices`.
- [x] Files: `src/routes/portfolio/*`, `src/fixtures/portfolio.ts`.
- [x] Acceptance: Holdings and transactions render from fixtures; empty state covered; `FRONTEND.md` PR Review Checklist passes.
- [x] Out Of Scope: thesis notes editor, write paths.

### PR-06 — Remaining static pages (split into PR-06a..e)

The original PR-06 lumped 7 routes from 4 wire files (~2,730 lines) into one PR. That is unreviewable and is the exact volume at which rule C-11 (reuse-first) breaks down — too many tables/cards/badges spread across too many routes. PR-06 is therefore split into five sub-PRs by route group, each sized comparably to PR-04 or PR-05. Admin is deferred from MVP (see note after PR-06e).

Each sub-PR carries a **Required Reuse** line per rule C-11; bypassing a primitive requires documenting the structural-capability blocker in the PR description before implementation.

### PR-06a — `/analysis` (static, 8-tab hub)

- [x] Scope: `/analysis` from `design/wires-v3/wire-analysis.jsx`. Eight tabs: 시장 한눈에 / 시장 심리 / 기술적 분석 / 재무 분석 / 퀀트 팩터 / 적정주가 계산 / 섹터 흐름 / 신호 알림. Tab UI uses the same `<button>` + `Record<Tab, …>` pattern as `/stocks/:symbol`.
- [x] Required Reading: `docs/FRONTEND.md`, `docs/FRONTEND-MAP.md`, `design/wires-v3/wire-analysis.jsx`, `web/src/routes/stocks/StockDetailPage.tsx` (tab pattern reference), `vercel-labs/agent-skills:react-best-practices`.
- [x] Required Reuse (C-11): `PageContainer`, `Card`, `DataTable` (섹터 로테이션 표, 기술적 지표, 재무 점수, 퀀트 팩터, 섹터 모멘텀, 신호 알림 표, 심리 지표 표, 용어 해설 표, 저장한 스크린 표), `KpiTile` (DCF 4-tile strip), `Badge` (시그널 강도/방향, 섹터 라벨, A-D 등급, 심리 상태, 추세). `ChartPlaceholder` (AreaChart/Heatmap/Matrix placeholders). 시장 심리는 plan 옵션대로 DataTable+Badge skeleton로 처리 — SVG gauge 신규 작성 없음 (gauge promote는 별도 PR 필요).
- [x] Files: `web/src/routes/analysis/AnalysisPage.tsx`, `web/src/routes/analysis/AnalysisPage.module.css`, `web/src/routes/analysis/sections/*` (8 section components, one per tab), `web/src/fixtures/analysis.ts`.
- [x] Skeleton vs full per tab: 시장 한눈에 = full (3-col top grid + tools + bottom grid). 시장 심리 = full content via DataTable rows (3 regions + glossary + history placeholder). 기술적 분석 / 재무 분석 / 퀀트 팩터 / 섹터 흐름 / 신호 알림 = chart placeholder + DataTable with fixture rows. 적정주가 계산 = KpiTile grid + chart placeholder.
- [x] Acceptance: All 8 tabs render from `fixtures/analysis.ts`; tab state preserved via `useState`; `FRONTEND.md` PR Review Checklist passes including items 14–16 (primitive reuse).
- [x] Out Of Scope: real chart implementations, signal alert subscription wiring.

### PR-06b — `/reports` list and `/reports/:id` detail (static)

- [x] Scope: `/reports` list and `/reports/:id` detail from `wire-masters-learn.jsx` (the `WireReports` and `WireReportDetail` functions). Mirror the `/stocks` ↔ `/stocks/:symbol` PR-04 structure: list page is a `DataTable`, detail page is route-param-driven with `getReport(id)` fixture lookup.
- [x] Required Reading: `docs/FRONTEND.md`, `docs/FRONTEND-MAP.md`, `design/wires-v3/wire-masters-learn.jsx` (WireReports + WireReportDetail only), `web/src/routes/stocks/` (list+detail reference), `vercel-labs/agent-skills:react-best-practices`.
- [x] Required Reuse (C-11): `PageContainer`, `Card`, `DataTable` (report list, with cell renderers for date/badge/title), `Badge` (report type/status), `EmptyState` (unknown id on detail; empty list state), `KpiTile` if the detail summary uses label/value tiles.
- [x] Files: `web/src/routes/reports/ReportsPage.tsx`, `web/src/routes/reports/ReportDetailPage.tsx`, co-located `*.module.css`, `web/src/routes/reports/sections/*`, `web/src/fixtures/reports.ts`.
- [x] Acceptance: `/reports` renders fixture list via `DataTable`; `/reports/:id` resolves fixture or shows `EmptyState` with back link; checklist passes including items 14–16.
- [x] Out Of Scope: write paths (creating/editing reports), markdown rendering pipeline.

### PR-06c — `/masters` list, `/masters/:id` detail, `/learn` (static)

- [x] Scope: `/masters` (거장 목록), `/masters/:id` (거장 상세: 포트폴리오, 철학, 13F 분기 변화), `/learn` (용어사전 + 가이드 + 리포트 라이브러리) from `wire-masters-learn.jsx` (`WireMasters`, `WireLearn`, and the masters-detail body).
- [x] Required Reading: `docs/FRONTEND.md`, `docs/FRONTEND-MAP.md`, `design/wires-v3/wire-masters-learn.jsx` (excluding WireReports/WireReportDetail which are PR-06b), `web/src/routes/stocks/StockDetailPage.tsx` (sticky-sidebar + tab pattern), `vercel-labs/agent-skills:react-best-practices`.
- [x] Required Reuse (C-11): `PageContainer`, `Card`, `Section`, `DataTable` (masters list, 13F holdings table, glossary terms list), `Badge` (master strategy tags, content type), `EmptyState`, `KpiTile` (masters detail summary stats), `ChartPlaceholder` (portfolio composition placeholder).
- [x] Files: `web/src/routes/masters/MastersPage.tsx`, `web/src/routes/masters/MasterDetailPage.tsx`, `web/src/routes/learn/LearnPage.tsx`, co-located `*.module.css`, `web/src/routes/{masters,learn}/sections/*`, `web/src/fixtures/masters.ts`, `web/src/fixtures/learn.ts`.
- [x] Acceptance: `/masters` renders fixture list via `DataTable`; `/masters/:id` resolves fixture (at least Warren Buffett + Ray Dalio with detail) or shows `EmptyState`; `/learn` renders glossary + guides + report library sections from fixture; checklist passes including items 14–16.
- [x] Out Of Scope: real 13F filings pipeline, learning progress tracking, search across glossary.

### PR-06d — `/mypage` (static)

- [x] Scope: `/mypage` from `wire-mypage-admin.jsx` (the `WireMyPageAll` body only — exclude admin). Profile summary, settings sections, subscription/usage panel as fixture-driven static UI.
- [x] Required Reading: `docs/FRONTEND.md`, `docs/FRONTEND-MAP.md`, `design/wires-v3/wire-mypage-admin.jsx` (mypage body only, lines 284+), `vercel-labs/agent-skills:react-best-practices`, `vercel-labs/agent-skills:web-design-guidelines`.
- [x] Required Reuse (C-11): `PageContainer`, `Card`, `Section`, `DataTable` (활동 로그 / 연결된 계정 등 리스트 패턴), `KpiTile` (사용량/구독 요약), `Badge` (연결 상태, 구독 등급), `EmptyState`. Form inputs stay non-interactive in this PR — render as styled `<input>` / `<button>` without state, since wiring belongs to a later PR.
- [x] Files: `web/src/routes/mypage/MyPage.tsx`, co-located `*.module.css`, `web/src/routes/mypage/sections/*`, `web/src/fixtures/mypage.ts`.
- [x] Acceptance: `/mypage` renders all wire sections from fixture; no interactive form state; checklist passes including items 14–16.
- [x] Out Of Scope: form submission, account deletion, password change, real subscription/billing wiring.

### PR-06e — removed after re-evaluation

`wire-remaining.jsx` was re-evaluated after PR-06a..d. `WireAnalysisHubV2` duplicates the implemented `/analysis` hub, `WireMobileHome` and `WireMobileStock` are mobile-specific and remain deferred, and `WireApiBudget` is admin/operations-oriented while `/admin` is deferred out of MVP. `WireEmptyAndError` is a state-pattern reference rather than a product route; the reusable primitive already exists as `EmptyState`. Per the PR-06e gate, this entry is removed rather than shipping a filler route.

### Deferred from MVP: `/admin`

`/admin` from `wire-mypage-admin.jsx` (~600 lines of the wire) is **deferred out of MVP**. Rationale: in the solo / pre-launch phase the user manages the system via Supabase Studio and CLI, so a custom admin UI has near-zero value while consuming a full PR's worth of build and review time. Revisit after launch when there are real operational needs (user moderation, content review, system flag toggling) that justify a UI.

### PR-07 — FastAPI scaffold

- [x] Scope: `api/` folder with FastAPI app, `/health`, one typed example endpoint (`/v1/dashboard/example`), CORS for local dev, settings via env, request/response models in Pydantic, local run instructions.
- [x] Required Reading: `ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/API.md`, `docs/design-docs/repo-layout.md`, `docs/references/fastapi-llms.txt`.
- [x] Files: `api/app/main.py`, `api/app/models/*`, `api/.env.example`, `api/README.md`.
- [x] Acceptance: `uvicorn` boots; `/health` returns 200; example endpoint returns typed sample.
- [x] Out Of Scope: any DB connection, any real data source.

### PR-08 — Supabase minimum schema and RLS

- [x] Scope: Migration introducing only what PR-09 needs: `profiles`, `watchlists`, `watchlist_items`, `instruments`. RLS enabled on user-owned tables with owner-only policies. Seed a handful of instruments (AAPL, MSFT, SPY, plus a KR sample).
- [x] Required Reading: `docs/generated/db-schema.md`, `docs/SECURITY.md`, `docs/references/supabase-llms.txt`.
- [x] Files: `supabase/migrations/0001_*.sql`, seed script, schema notes update.
- [x] Acceptance: Migration applies clean on a fresh project; RLS verified via a manual two-user check or SQL test.
- [x] Out Of Scope: portfolio/transactions/positions/theses/13F/reports tables. Those land in later PRs only when an endpoint needs them.

### PR-09 — First end-to-end path: dashboard watchlist

- [x] Scope: Backend `GET /v1/watchlists/me` returns the signed-in user's watchlist from Supabase. Frontend dashboard `WatchlistCard` reads from this endpoint with a typed client and last-updated timestamp. Auth is the dev header `X-Dev-User` per `docs/design-docs/auth.md`; real auth is deferred to PR-14 (final PR).
- [x] Required Reading: `docs/API.md` (the `/v1/watchlists/me` section), PR-07/PR-08 outputs, `docs/design-docs/first-real-data.md`, `docs/RELIABILITY.md`.
- [x] Files: `api/app/routes/watchlists.py`, `api/app/repos/watchlists.py`, `api/app/auth.py`, `api/app/models/watchlists.py`, `web/src/lib/api-client.ts`, `web/src/lib/useWatchlist.ts`, dashboard wiring.
- [x] Acceptance: Inserting a row in Supabase reflects on the dashboard within a refresh. Empty state and error state both render.
- [x] Out Of Scope: write endpoints, multiple watchlists.

### PR-10 — First real market data on a stock detail page

- [x] Scope: Implement the source chosen in `docs/design-docs/first-real-data.md`. Backend endpoint exposes latest quote + recent OHLCV for one symbol; frontend renders it on `/stocks/AAPL` with a real chart and a `last_refreshed_at` label. Failure shows stale data plus a warning, not a blank.
- [x] Required Reading: `docs/API.md` (the `/v1/quotes/{symbol}` section), `docs/design-docs/first-real-data.md`, `docs/RELIABILITY.md`, `docs/references/market-data-llms.txt`, `docs/design-docs/prices-ingestion-schema.md`.
- [x] Files: `api/app/sources/polygon.py`, `api/app/sources/alphavantage.py`, `api/app/routes/quotes.py`, `api/app/models/quotes.py`, `api/app/tests/test_quotes.py`, `web/src/lib/api-client.ts` (extend), `web/src/lib/useQuote.ts`, `web/src/components/primitives/PriceChart.tsx`, `web/src/routes/stocks/sections/ChartSection.tsx`.
- [x] Acceptance: `/stocks/AAPL` shows live values on first load; rate-limit and provider-outage paths produce stale-with-warning, not a crash. **This is the production milestone bar from `ARCHITECTURE.md`.**
- [x] Out Of Scope: multiple providers, caching strategy beyond a simple in-memory TTL, `price_bars_daily` table writes (deferred to PR-13 cron per `docs/design-docs/prices-ingestion-schema.md`).

### PR-11 — Portfolio data path

- [x] Scope: Extend schema with `portfolios` and `transactions`. **No `positions` table** — holdings are derived in the backend from the transaction ledger using the average-cost method (decision documented in `docs/generated/db-schema.md`). Backend `GET /v1/portfolios/me` returns the primary portfolio with derived holdings + transactions. Frontend `/portfolio` reads from API; KpiStrip/HoldingsTable/TransactionsTable now consume live data, and the static `PerformanceSummary` section + `fixtures/portfolio.ts` are dropped as out-of-scope.
- [x] Required Reading: `docs/API.md` (the `/v1/portfolios/me` section), `docs/generated/db-schema.md`, `docs/SECURITY.md`, PR-09 patterns.
- [x] Files: `supabase/migrations/0002_portfolio.sql`, `supabase/seed/portfolio.sql`, `api/app/models/portfolios.py`, `api/app/repos/portfolios.py`, `api/app/routes/portfolios.py`, `api/app/tests/test_portfolios.py`, `web/src/lib/api-client.ts` (extend), `web/src/lib/usePortfolio.ts`, `web/src/routes/portfolio/{PortfolioPage,sections/KpiStrip,sections/HoldingsTable,sections/TransactionsTable}.tsx`. Removed: `web/src/fixtures/portfolio.ts`, `web/src/routes/portfolio/sections/PerformanceSummary.{tsx,module.css}`.
- [x] Acceptance: Manually inserted transactions render as holdings and history on `/portfolio` for the dev user. Verified end-to-end against remote Supabase: 6 sample transactions across 4 types yield AAPL 15 @ avg $160 and MSFT 5 @ avg $380 in the API response.
- [x] Out Of Scope: transaction write UI, performance analytics (Sharpe / drawdown / benchmarks), market value join (lands when PR-13 cron populates `price_bars_daily`).

### PR-12 — Deployment and env docs

- [x] Scope: **Single Vercel project** hosts both the Vite/React app and the FastAPI backend as Python serverless functions (`api/index.py` re-exports the ASGI app; `vercel.json` rewrites `/api/(.*) → /api/index/$1`). Daily ingestion runs as a Vercel Cron Job. `docs/DEPLOYMENT.md` carries the setup steps, env matrix, secret-handling rules pointing at `docs/SECURITY.md`, cron schedule, and rollback flow. **Note:** the earlier Fly.io/Dockerfile direction was reversed when the user opted for Vercel-only automation; those files are removed.
- [x] Required Reading: `docs/SECURITY.md`, `docs/references/vercel-llms.txt`, `vercel-labs/agent-skills:deploy-to-vercel`, `vercel-labs/agent-skills:vercel-cli-with-tokens`.
- [x] Files: `vercel.json`, `api/index.py`, `api/requirements.txt`, `docs/DEPLOYMENT.md`, `.env.example` (CRON_SECRET slot).
- [x] Acceptance: Vite production bundle contains **no** `POLYGON_API_KEY` / `SUPABASE_SERVICE_ROLE_KEY` / `ALPHA_VANTAGE_API_KEY` / `SUPABASE_JWT_SECRET` strings. Backend reachable locally at `/v1/*`, same surface reachable on Vercel at `/api/v1/*` via the rewrite (no test for it locally; verified by the runbook's `curl` checklist after first deploy). PR-14 lifts the single-user gate on the resulting URL.
- [x] Out Of Scope: custom domain, observability stack, CI-driven deploys.

### PR-13 — Scheduled refresh + persisted prices

- [x] Scope: Migration `0003_prices_ingestion.sql` adds `price_bars_daily` and `ingestion_runs` per `docs/design-docs/prices-ingestion-schema.md`. Ingestion job (`api/app/jobs/refresh_us_daily.py`) calls Polygon grouped-daily (1 API call → ~12k US symbols), filters to tracked instruments, upserts into `price_bars_daily` via PostgREST merge-duplicates, and wraps the work in a `running` → `succeeded|failed` `ingestion_runs` row. Cron endpoint `GET /v1/internal/cron/refresh-us-daily` is bearer-gated by `CRON_SECRET` (auto-supplied by Vercel Cron). Quote route now reads `price_bars_daily` first (via `api/app/repos/prices.py`) and only falls back to the live provider on cache miss; `last_refreshed_at` is sourced from the latest succeeded `ingestion_runs` row.
- [x] Required Reading: `docs/RELIABILITY.md`, `docs/references/scheduled-jobs-llms.txt`, `docs/design-docs/prices-ingestion-schema.md`.
- [x] Files: `supabase/migrations/0003_prices_ingestion.sql`, `api/app/jobs/refresh_us_daily.py`, `api/app/routes/cron.py`, `api/app/repos/prices.py`, `api/app/routes/quotes.py` (modified to prefer DB cache), `api/app/settings.py` (CRON_SECRET slot), `vercel.json` (crons[] entry), `.env.example`.
- [x] Acceptance: Job verified end-to-end against remote Supabase — 1 Polygon call returned 12,134 bars, filtered to 3 tracked US instruments (AAPL/MSFT/SPY), 3 rows upserted per day; running it for 4 days yields 12 rows visible in `price_bars_daily` and 4 success rows in `ingestion_runs`. Subsequent rate-limit failures during a wider backfill produced `failed` rows with the error message preserved — the API didn't crash and `last_refreshed_at` still reflects the last successful run. `/v1/quotes/AAPL` now serves directly from DB without hitting Polygon on the warm path.
- [x] Out Of Scope: KR ingestion (KRX cron lands when KR is in scope), historical backfill in production (keep on the laptop per DEPLOYMENT.md), retries beyond a single attempt, UI badge changes (existing `last_refreshed_at` chip already surfaces the value).

### PR-14 — Supabase Auth

- [x] Scope: Replace the `X-Dev-User` header path with Supabase Auth + Google OAuth. Frontend signs in via `@supabase/supabase-js`; backend verifies the JWT with `SUPABASE_JWT_SECRET` and derives `user_id` from `jwt.sub`. Delete dev-header acceptance in the same PR — no overlap window in production.
- [x] Required Reading: `docs/design-docs/auth.md`, `docs/API.md`, `docs/SECURITY.md`, `docs/references/supabase-llms.txt`.
- [x] Operator Prerequisites (you, not the agent): Google OAuth client created in Google Cloud Console, client ID/secret pasted into Supabase Auth Providers, `SUPABASE_JWT_SECRET` copied into `.env`. See `docs/design-docs/auth.md` "Operator Action Required".
- [x] Files: `api/app/auth.py` (JWT verifier), middleware/dependency wiring, frontend sign-in route + session bootstrap, removal of dev-header code.
- [x] Acceptance: Logging in via Google reaches the dashboard with real user data; requests without a bearer token return 401; existing RLS policies continue to pass without edits.
- [x] Out Of Scope: additional providers, password sign-in, role/permission system, organization accounts.

### PR-15 — Auth UX hardening

- [x] Scope: Keep public research routes browsable without login, protect only private account routes, return users to the requested page after OAuth, surface signed-in user identity consistently, and add visible feedback for top-bar controls that are not yet fully implemented.
- [x] Required Reading: `docs/FRONTEND.md`, `docs/FRONTEND-MAP.md`, `docs/design-docs/auth.md`.
- [x] Files: `web/src/components/layout/{AuthGate,ProtectedRoute,TopBar}.*`, `web/src/lib/auth-*`, dashboard auth CTA, docs map updates.
- [x] Acceptance: `/` loads without login; `/portfolio` and `/mypage` show a route-scoped login prompt when signed out; top-bar search submit navigates to a stock route; signed-in account menu shows name/email and logout; unavailable top-bar actions show a visible short message instead of doing nothing; `npm run lint` and `npm run build` pass.
- [x] Out Of Scope: persistence for profile edits, watchlist add/delete, notification backend, full search autocomplete.
- [x] Follow-up UX audit: PR-15 may include local-only affordances that remove dead clicks (icon buttons, notification read dot, report interest stars, MyPage quick links, loading skeletons). Anything requiring DB writes or real event delivery remains deferred: saved-report persistence, watchlist/report write endpoints, notification backend, and full cross-page saved-items surfaces.

### PR-16 — Interaction surface audit

- [x] Scope: Audit all visible buttons, cards, chips, chart controls, table rows, and dashboard widgets across public/private routes. Every control must either navigate, switch in-page state, open a lightweight panel/modal, show a planned-feature notice, or be restyled as clearly non-interactive. The dashboard cards called out by user feedback (notice, todos, charts, watchlist rows, events) are the first pass.
- [x] Required Reading: `docs/FRONTEND.md`, `docs/FRONTEND-MAP.md`, relevant route files under `web/src/routes/*`.
- [x] Files: `web/src/components/layout/*`, shared primitives if needed, route pages/sections with dead-click surfaces, docs map updates.
- [x] Acceptance: No visible element uses pointer affordance without an observable result; public routes remain browsable; private data actions that require future write endpoints show precise planned notices instead of silently doing nothing; `npm run lint` and `npm run build` pass.
- [x] Out Of Scope: implementing every backend write path. Persistence still lands in the domain PRs for watchlists, saved reports, memos/theses, notifications, and profile settings.
- [x] Closing polish (PR-16 wrap-up):
  - StockDetail "종목 분석 한눈에" detail-panel rewritten as a one-line summary that points to `/analysis`, removing the inline duplicate of `MarketOverviewSection` per the no-duplicate-pages rule.
  - TopBar search group labels centralized as `SEARCH_GROUPS` to remove repeated hardcoded strings.
  - `KpiTile`, `KpiStrip`, `IndicatorStrip` realigned so each block renders symmetrically (centered label/value, equal-width columns, stretched fear-greed halves).

### PR-17 — Schema master plan (design only)

> **Status note.** Wireframes are being revised at the time of writing. This section captures the *structure and decisions*, not finalized table/column shapes. Do **not** convert into migrations until wires settle and the affected screens stop moving. When that happens, split into migrations 0004–0011 per the order below.

- [x] Scope: Produce a complete, layered schema plan that covers (a) every entity the current UI renders from fixtures, (b) the raw market/macro data the ingestion pipeline will collect, and (c) how the two combine to drive charts and analysis. The plan must be sufficient to slice into migration-sized PRs once wires settle.
- [x] Required Reading: `web/src/fixtures/*.ts`, `web/src/routes/*` route files, `docs/design-docs/data-sources.md`, `docs/design-docs/first-real-data.md`, `docs/design-docs/prices-ingestion-schema.md`, all existing migrations under `supabase/migrations/`.
- [x] Files: `docs/design-docs/schema-master-plan.md` (new — owns the table inventory and join map), updates to `docs/exec-plans/tech-debt-tracker.md`. **No** changes under `supabase/migrations/` in this PR.
- [x] Acceptance: `schema-master-plan.md` documents the 4-tier layout, every fixture-only entity is mapped to a tier, every chart/analysis widget has a documented join path, the five open decision points (the original four plus a recorded answer for `user_settings` placement) have recorded answers, and migration order is fixed.
- [x] Out Of Scope: writing migrations, seeding data, FastAPI endpoint changes, RLS policy SQL. Those land in the migration-slice PRs (0004…0011) after this plan is approved.

**Existing schema bugs (carry into migration 0004 when scheduled, not this PR):**

- `supabase/migrations/0001_mvp_foundation.sql:81` — `watchlist_items_unique_position` is not `deferrable initially deferred`; reorder swaps will fail.
- `supabase/migrations/0001_mvp_foundation.sql:21-33` — `profiles.id` has no FK to `auth.users` (comment says PR-08 deferred it pending PR-14; PR-14 is now merged so the FK should land).
- `supabase/migrations/0002_portfolio.sql:33,47` — `transactions.amount` has no consistency check against `quantity*price` for buy/sell rows.
- `supabase/migrations/0002_portfolio.sql:44` — `dividend` rows currently allow `instrument_id` null. Only `deposit` should.
- `supabase/migrations/0003_prices_ingestion.sql:4-15` — `price_bars_daily` has no OHLC sanity checks (`h >= greatest(o,c,l)`, `l <= least(o,c,h)`, `v >= 0`).

**Tier outline (table names tentative, will move with wires):**

- **TIER 1 — Reference**: `instruments` (extend with industry/figi/cik/corp_code/delisted_at), `instrument_aliases`, `company_profiles`, `indices`, `index_constituents`, `sectors`, `instrument_sector`.
- **TIER 2 — Market data (raw ingest)**: extend `price_bars_daily` with `adj_c`; add `price_bars_intraday`, `corporate_actions`, `fx_rates_daily`, `macro_series` + `macro_observations`, `fear_greed_daily`. All raw series use `(entity_id, t)` composite keys + `source` column + public-read RLS.
- **TIER 3 — Derived / analysis input**: `financial_statements` + `financial_lines` (long format with line-code book), `key_ratios_quarterly` (wide cache), `analyst_estimates`, `consensus_snapshots`, `earnings_events`, `filings`, `filing_holdings` (13F), `institutional_holders`, `insider_trades`.
- **TIER 3.5 — News, events, reports**: `news_items` + `news_instruments`, `economic_events`, `reports` + `report_tickers`.
- **TIER 3.6 — Masters**: `masters`, `master_principles`, `master_books`, `master_strategies`, `master_filings` (reuses `filings` + `filing_holdings` for quarterly changes — no separate holdings table).
- **TIER 4 — User state**: `saved_reports`, `saved_instruments`, `position_theses` + `position_thesis_conditions`, `memos` (polymorphic target with check), `alerts`, `notifications`, `todos`, `activity_log`, `user_settings` (or `profiles.preferences` extension), `screens` (saved analysis filters).

**Open decision points (answer before slicing into migrations):**

1. Indices as `instruments` rows vs a separate `indices` table — leaning *separate* because constituent membership is index-specific.
2. `financial_lines` shape — long with a line-code book vs wide columns. Leaning *long* to absorb KR/US accounting differences.
3. `memos` polymorphism — single table with `(target_kind, target_id)` + check constraint vs one table per target. Leaning *single*.
4. Whether wireframe revisions invalidate any of these tiers (e.g., if reports/masters get cut, drop the matching tiers from migration scope).

**Migration slicing (locked once plan is approved):**

```
0004  schema-bugfixes        (the five bugs above)
0005  reference-enrich       (company_profiles, sectors, indices, aliases)
0006  market-data-extend     (corporate_actions, fx_rates, macro_*, fear_greed, adj_c)
0007  fundamentals           (financial_statements/lines, key_ratios, consensus_*, earnings_events)
0008  filings-holdings       (filings, filing_holdings, institutional_holders, insider_trades)
0009  news-events-reports    (news_*, economic_events, reports/report_tickers)
0010  masters                (masters + dependents)
0011  user-state             (saved_*, theses, memos, alerts, notifications, todos, activity_log, screens)
```

Each migration ships with RLS policies, grants, indexes, and `updated_at` triggers in the same file. Do not start 0004 until the wireframe revision pass is complete and PR-16 has merged.

### PR-18 — Migration 0004: schema bugfixes

- [x] Scope: Execute the first migration slice locked in PR-17 — fix the five known schema bugs in one migration file, no new feature tables.
- [x] Required Reading: `docs/design-docs/schema-master-plan.md` §8, `supabase/migrations/0001_mvp_foundation.sql`, `supabase/migrations/0002_portfolio.sql`, `supabase/migrations/0003_prices_ingestion.sql`.
- [x] Files: `supabase/migrations/0004_schema_bugfixes.sql`.
- [x] Acceptance: Migration is idempotent (`drop constraint if exists` before every `add`), keeps existing RLS policies/grants intact, and contains all five corrections from the schema-master-plan §8:
  1. `watchlist_items_unique_position` rebuilt as `deferrable initially deferred`.
  2. `profiles.id` now FKs `auth.users(id) on delete cascade` (orphan dev rows deleted first as guard).
  3. `transactions.amount` must equal `quantity * price` for buy/sell rows (±0.01 tolerance).
  4. `transactions.instrument_id` may only be null for `type = 'deposit'`.
  5. `price_bars_daily` enforces `h >= greatest(o,c,l)`, `l <= least(o,c,h)`, `v >= 0`.
- [x] Out Of Scope: tier-1 reference enrichment (lands as migration 0005), `preferences jsonb` (already present in 0001), feature tables.

### PR-19 — Migration 0005: reference enrichment

- [x] Scope: Second migration slice from PR-17 — add the TIER-1 reference tables that back wireframe surfaces still reading from fixtures: sector taxonomy, indices + constituents, company profiles, instrument aliases, and the missing identifier columns on `instruments`.
- [x] Required Reading: `docs/design-docs/schema-master-plan.md` §2 / §6, `design/wires-v3/wire-home.jsx` (지수 strip), `design/wires-v3/wire-analysis.jsx` (섹터 로테이션, 시장 한눈에 지수), `design/wires-v3/wire-stock.jsx` (섹터 내 위치, 회사 개요), existing `supabase/migrations/0001_*.sql`.
- [x] Files: `supabase/migrations/0005_reference_enrich.sql`.
- [x] Acceptance: Migration is idempotent (`create table if not exists`, `add column if not exists`, partial unique indexes). All six new tables (plus `instruments` column extensions) enable RLS with public-read policies + service-role writes, matching the `instruments` pattern. `npx supabase migration up --local` applies cleanly; `pg_tables` shows the new tables.
- [x] Out Of Scope: seeding the new reference tables (lands when the related ingestion pipelines come online), market-data extension (migration 0006), fundamentals (0007).

### PR-20 — Migration 0006: market-data extension (schema only)

- [x] Scope: Third migration slice from PR-17 — lock the TIER-2 raw-ingest surface so analysis/dashboard widgets can wire against stable identifiers without waiting on the actual data pipelines. **No row collection here**; the user explicitly capped this PR at schema-only because of free-tier storage budget. The S&P 500 / NASDAQ / KOSPI 200 bars themselves come in a later ingestion PR.
- [x] Required Reading: `docs/design-docs/schema-master-plan.md` §2 (TIER-2 row), `docs/design-docs/prices-ingestion-schema.md`, `design/wires-v3/wire-home.jsx` (지수/매크로 strip), `design/wires-v3/wire-analysis.jsx` (시장 심리·금리 경로).
- [x] Files: `supabase/migrations/0006_market_data_extend.sql`.
- [x] Acceptance: Migration is idempotent and adds (1) `price_bars_daily.adj_c`, (2) `corporate_actions`, (3) `fx_rates_daily`, (4) `macro_series` + `macro_observations`, (5) `fear_greed_daily`, (6) `index_bars_daily`. All tables enable RLS with public-read + service-role-write. Includes a small `indices` catalog seed (KOSPI/KOSPI200/KOSDAQ/SPX/NDX/IXIC/DJI) — guarded with `on conflict (code) do nothing` so reruns are safe. Applies cleanly to local *and* remote Supabase via `db push`.
- [x] Out Of Scope: actual bar/observation row ingestion (later PR), adj_c recomputation job, KRX/Polygon vendor adapters, intraday bars.

### PR-21 — Migration 0007: fundamentals (schema only)

- [x] Scope: TIER-3 derived-input tables — `financial_statements` + `financial_lines` (long with line-code book), `key_ratios_quarterly` (wide cache), `analyst_estimates`, `consensus_snapshots`, `earnings_events`.
- [x] Files: `supabase/migrations/0007_fundamentals.sql`.
- [x] Acceptance: Public-read RLS + service-role writes. Applied local + remote.
- [x] Out Of Scope: pipelines that compute key ratios from financial_lines, consensus aggregation job.

### PR-22 — Migration 0008: filings & holdings (schema only)

- [x] Scope: `filings` (SEC/DART headers), `filing_holdings` (13F line items), `institutional_holders` (per-holder snapshot), `insider_trades`.
- [x] Files: `supabase/migrations/0008_filings_holdings.sql`.
- [x] Acceptance: Public-read RLS + service-role writes. Applied local + remote.

### PR-23 — Migration 0009: news, events, reports (schema only)

- [x] Scope: `news_items` + `news_instruments` (M:N), `economic_events`, `reports` + `report_tickers` (M:N).
- [x] Files: `supabase/migrations/0009_news_events_reports.sql`.
- [x] Acceptance: Public-read RLS + service-role writes. Applied local + remote.

### PR-24 — Migration 0010: masters (schema only)

- [x] Scope: `masters` (identity + filer_cik), `master_principles`, `master_books`, `master_strategies`, and `master_filings` view joining filings + filing_holdings via filer_cik (no separate holdings table per the recorded decision).
- [x] Files: `supabase/migrations/0010_masters.sql`.
- [x] Acceptance: Public-read RLS on base tables; view inherits read access from underlying tables. Applied local + remote.

### PR-25 — Migration 0011: user state (schema only)

- [x] Scope: TIER-4 owner-RLS tables — `saved_reports`, `saved_instruments`, `position_theses` + `position_thesis_conditions`, `memos` (polymorphic with check), `alerts`, `notifications`, `todos`, `activity_log`, `screens`.
- [x] Files: `supabase/migrations/0011_user_state.sql`.
- [x] Acceptance: Every table is FK'd to `public.profiles(id) on delete cascade`, has RLS enabled with owner-only select/insert/update/delete policies (`position_thesis_conditions` scoped via its parent thesis). Applied local + remote. Schema-master-plan migration order (0004–0011) is now fully landed.

### PR-26 — Detail-page data wiring

- [x] Scope: Make every detail page render appropriate data through the intended data path, falling back gracefully when the table is empty.
  - `/stocks/:symbol` — header price/change/last-updated and key-stats volume now read live from `useQuote` (DB-backed via PR-13, Polygon fallback). Unwired tabs (financials, valuations, supply/demand, consensus, news, filings) remain fixture-backed pending later ingestion PRs because the PR-21–PR-23 schemas are still empty.
  - `/masters/:id` — new `GET /v1/masters` and `GET /v1/masters/{slug}` endpoints (PostgREST-backed, public-read RLS) feed `useMaster`. Page merges DB header (name, firm, style, principles) over fixture; renders a `Supabase · 라이브` / `DB 미수록 · fixture 표시` source label so the user can tell the difference.
  - `/reports/:id` — new `GET /v1/reports` and `GET /v1/reports/{id}` endpoints feed `useReport`. Same fallback/source-label pattern as masters.
- [x] Files:
  - `api/app/models/masters.py`, `api/app/models/reports.py`
  - `api/app/repos/masters.py`, `api/app/repos/reports.py`
  - `api/app/routes/masters.py`, `api/app/routes/reports.py`, `api/app/main.py`
  - `web/src/lib/api-client.ts`, `web/src/lib/useMaster.ts`, `web/src/lib/useReport.ts`
  - `web/src/routes/stocks/StockDetailPage.tsx`
  - `web/src/routes/masters/MasterDetailPage.tsx`
  - `web/src/routes/reports/ReportDetailPage.tsx`
- [x] Acceptance: `cd web && npm run lint && npm run build` is clean; FastAPI imports without error and the new routes appear in `app.routes`. Each detail page renders correctly when the DB row is missing (fixture fallback with explicit source label) and prefers DB values when present.
- [x] Out of scope: ingestion of masters/reports rows; financial-statement / consensus / filing data wiring (blocked on PR-21–PR-23 ingestion PRs).

- PR-01 through PR-10 are merged.
- The dashboard renders real watchlist data and `/stocks/AAPL` renders real market data through the backend path.
- Initial Supabase schema and security notes are documented and applied.
- PR-11 through PR-13 are tracked but not blocking the MVP milestone.

## Open Questions

- Backend hosting target before NAS migration (Render vs Fly vs Vercel Functions for FastAPI).
- Authentication choice for dev vs prod (Supabase Auth vs a stub header).
- Korean stock data source for the first KR symbol after PR-10.

Track answers here, then collapse into the relevant PR section before that PR starts.
