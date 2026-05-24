# Chart UI Continuation Notes

## Purpose

This note captures the current chart work so the next agent can continue without
reconstructing the session. The active user objective is:

> 여기 있는 차트들이 증권사 mts, 트레이딩뷰, 바이낸스처럼 지표들 자유롭게 다루면서 보기 편하고 사용하기 좋은 ui/ux를 가지게 해놔.

The user also explicitly requested:

- Fix zoom/pan blank space around charts.
- Fix incorrect date handling.
- Load comparison and chart data from DB/API, not hardcoded arrays.
- Use Playwright while checking chart UI changes.
- Before committing, pay attention to CI lint/format, not only local build.

## Required Reading For Next Agent

Follow the root `AGENTS.md` read order before editing. For chart/frontend work,
also read:

- `docs/FRONTEND.md`
- `docs/FRONTEND-MAP.md`
- This file

## Current Validation Baseline

Run these after additional work:

```bash
cd web && npm run check
cd web && npm run build
cd api && uv run pytest app/tests/test_indices.py app/tests/test_stocks_extra.py app/tests/test_macros.py app/tests/test_sectors.py app/tests/test_portfolios.py app/tests/test_fear_greed.py
git diff --check
lsof -nP -iTCP:3000 -iTCP:9222 -iTCP:8000 -iTCP:4173 -sTCP:LISTEN || true
```

The user specifically called out CI formatting/linting. Also run, before any
commit:

```bash
npm run lint
npm run format:check
```

As of this note, `npm run lint` passed after markdownlint and web typecheck.
`npm run format:check` initially failed on multiple dirty web files; the listed
files were formatted with Prettier and the full format check then passed.

## Playwright Status

The user asked to use Playwright for visual verification.

Observed state:

- `npx playwright --version` works and reports `Version 1.60.0`.
- `@playwright/test` is now a root dev dependency.
- `npm run test:charts` runs the reusable smoke tests in
  `tests/playwright/chart-smoke.spec.ts`. Start the local API and web dev
  servers first.
- `npx playwright screenshot ...` also works as a CLI entry point.
- Status at stop: the dependency, npm script, and smoke spec have been added,
  but `npm run test:charts` was not completed after the user asked to stop. Run
  it next before relying on this as a passing gate.

Latest screenshot checks after starting local API and web dev servers:

- `/stocks/AAPL` captured to `/tmp/finance-stock-aapl.png`; main OHLCV chart was
  visible and nonblank, with DB coverage/status chips visible.
- `/analysis` captured to `/tmp/finance-analysis.png`; page rendered without a
  blank top-level chart area in the first viewport.
- `/` captured to `/tmp/finance-home.png`; market comparison chart rendered in
  the dashboard with 5Y selected and visible return lines.

Next agent should start or verify the dev server before Playwright checks:

```bash
cd api && uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
cd web && npm run dev -- --host 127.0.0.1
npm run test:charts
npx playwright screenshot --full-page --wait-for-timeout=3000 http://127.0.0.1:3000/stocks/AAPL /tmp/finance-stock-aapl.png
```

Prefer checking at least:

- `/stocks/AAPL`
- `/analysis`
- `/`
- `/portfolio` if signed-in state or mocked auth allows meaningful render

For chart-specific checks, verify:

- no persistent blank canvas after aggressive wheel zoom-out and horizontal pan;
- date labels and exported/readout dates match DB/API dates;
- 5Y/ALL data windows are accessible when source data exists;
- chart canvas/SVG is nonblank and sized correctly on desktop and mobile
  viewports.

The committed smoke test currently checks:

- `/stocks/AAPL` renders the main chart, DB/VIEW status chips, and survives
  aggressive wheel zoom/pan gestures without losing the chart surface.
- `/` renders the market comparison section with 5Y/API/VIEW ALL signals.

Files added for this test path:

- `package.json` / `package-lock.json`: root dev dependency
  `@playwright/test` and script `test:charts`.
- `tests/playwright/chart-smoke.spec.ts`: stock chart and home comparison smoke
  tests.

## Completed Chart/Data Improvements In Current Worktree

Main files touched during the chart work:

- `web/client/src/components/StockChart.tsx`
- `web/client/src/components/KLineSeriesChart.tsx`
- `web/client/src/components/StockMiniChart.tsx`
- `web/client/src/lib/compare-series.ts`
- `web/client/src/pages/Home.tsx`
- `web/client/src/pages/Analysis.tsx`
- `web/client/src/pages/MyPage.tsx`
- `web/client/src/pages/Portfolio.tsx`
- `web/client/src/pages/StockDetail.tsx`
- `docs/FRONTEND-MAP.md`
- backend/API files for DB-backed history, comparison, portfolio, macro, sector,
  and fear-greed data

Implemented behavior to preserve:

- `StockChart` uses `/v1/stocks/:symbol/bars` for full OHLCV history and
  requests up to 1825 days.
- `StockChart` compare uses `/v1/stocks/bars/compare`, has common-baseline
  rebasing, quick benchmark presets, hide/show, SOLO, restore, data table, and
  right-edge return labels toggleable by `Alt+L`.
- `StockChart` has extensive indicator controls: MA, EMA, BOLL, SAR, VOL, MACD,
  RSI, KDJ, WR, BIAS, CCI, OBV, PSY; active-chip reorder; params; presets;
  saved slots; active clear.
- `StockChart` drawing tools persist within the chart session and support repeat
  mode via `Alt+Y`, active cancel, undo/delete feedback.
- `StockChart` has full-history mini navigator and repeated zoom/pan boundary
  correction so aggressive wheel/scroll should not leave persistent blank canvas
  before the first bar or after the latest bar.
- `KLineSeriesChart` normalizes ISO, epoch seconds, and epoch milliseconds into
  UTC day labels before sort/export/readout.
- `KLineSeriesChart` keeps internal `viewRange` clamped to loaded data so later
  zoom/pan operations do not continue from stale blank ranges.
- `KLineSeriesChart` has toolbar, quick ranges, full-period mini navigator,
  pan/zoom, value/%/100 transforms, stable loaded-series baseline, data table,
  row gap metadata, right-edge labels toggleable via `M` or `Alt+L`, persisted
  series visibility/order, SOLO/PAIR restore, and `Alt+R`.
- `StockMiniChart` normalizes dates, has expanded mode, data table, full-period
  mini navigator, CUSTOM range, range stats, latest value badge, and quick ranges
  `1M/3M/6M/1Y/2Y/5Y/ALL`.
- Home market comparison now uses `/stocks/bars/compare` with 5Y source data by
  default.
- Analysis watchlist comparison uses shared comparison helpers.
- MyPage portfolio/trade charts use portfolio API analytics instead of local
  fallback chart calculations.

## Important Caveats

- The worktree is very dirty. Do not revert unrelated changes.
- Some dirty files predate this note. Treat current files as authoritative and
  avoid broad rewrites unless needed for CI or the user request.
- Formatting was applied to files reported by `npm run format:check`; this may
  enlarge diffs in already-dirty files.
- Browser-based visual verification is not complete yet because the local dev
  server was down when Playwright screenshot was attempted.
- The active goal is not complete. Do not call `update_goal complete` until a
  real current-state audit proves the full chart UX objective.

## Suggested Next Work

1. Start dev server and run Playwright screenshots/checks on the chart screens.
2. Run `npm run test:charts`. If it fails, inspect whether the failure is a real
   chart issue or a selector/timing issue before changing chart code.
3. Use Playwright to reproduce the user's original blank-space complaint:
   open `/stocks/AAPL`, aggressively zoom out/pan, then confirm the chart remains
   anchored to real bars.
4. Check `/analysis` and `/` comparison charts for 5Y/ALL source coverage and
   correct date labels.
5. If Playwright reveals blank chart areas, fix the relevant range logic in
   `StockChart`, `KLineSeriesChart`, or `StockMiniChart`.
6. Search again for hardcoded chart data that is still user-visible:

   ```bash
   rg -n "mockData|fixture|fallback|chartData|KLineSeriesChart|StockMiniChart|StockChart" web/client/src api/app
   ```

7. Run full validation, including `npm run lint` and `npm run format:check`,
   before any commit.
