# Schema Master Plan

Single source of truth for the production database shape that backs every screen currently shipped from fixtures, plus the raw market data the ingestion pipeline will collect to drive analysis. This is a **design document**: no migrations land from this file. Migrations are sliced in PR-17's locked order (0004–0011) and only opened after the wireframe revision pass settles and PR-16 merges.

> **Status.** Wireframes are mid-revision at the time of writing. Table names, column types, and even tier membership are tentative. The shape that *is* locked is (a) the 4-tier layout, (b) every fixture-to-tier mapping, (c) every chart/widget join path, (d) recorded answers to the open decision points, and (e) the migration slicing order.

## 1. Why four tiers

Two pressures push the schema in opposite directions and would collide if mixed in one layer:

- **Raw ingest** wants composite-key tables with append-only writes from the cron, public-read RLS, and zero ergonomics around derived metrics. Performance hot path = `(entity_id, t)` index scans.
- **UI screens** want denormalized, often per-user, sometimes write-back rows with owner-only RLS.

Splitting the schema into four ingest-to-user tiers keeps each layer's invariants stable. A tier may freely join the tier below it, but cron jobs never read tier 4 and screens never short-circuit tier 2 — they go through derived caches in tier 3.

```
TIER 4  user state            (owner-RLS, read/write)
            │  joins down for context
TIER 3.x  derived + content   (public-read, system-write)
            │  joins down for raw
TIER 2  market data raw       (public-read, cron-write)
            │  joins down for identity
TIER 1  reference             (public-read, ops-write)
```

## 2. Tier inventory

Tables marked `(existing)` are already migrated. Everything else is forward design.

### TIER 1 — Reference

| Table | Source of truth | Notes |
| --- | --- | --- |
| `instruments` (existing, extend) | ops seed + Polygon/KRX listings | Add `industry text`, `figi text`, `cik text`, `corp_code text`, `delisted_at date`. Keep symbol-unique only within `exchange`. |
| `instrument_aliases` | seed | One-to-many alternative tickers / ISIN / CUSIP. Lets pipelines match foreign vendor symbols. |
| `company_profiles` | Polygon/SEC + KRX | 1:1 with `instruments` where `kind='stock'`. CEO, HQ, employee count, description, IR site. |
| `indices` | seed | Separate from `instruments` — see decision 1. |
| `index_constituents` | refdata vendor | `(index_id, instrument_id, since, until)`. Time-indexed so historical attribution survives reconstitutions. |
| `sectors` | GICS seed | Two-level (sector, industry). |
| `instrument_sector` | derived | `(instrument_id, sector_id, classification)` — keep a small lookup row per instrument so re-classifications are auditable. |

### TIER 2 — Market data (raw ingest)

All tables: composite primary key `(entity_id, t)`, `source text not null`, `ingested_at timestamptz`, public-read RLS, cron writes via service role.

| Table | Granularity | Notes |
| --- | --- | --- |
| `price_bars_daily` (existing, extend) | daily OHLCV per instrument | Add `adj_c numeric(18,6)` for total-return charts. Carry OHLC sanity checks in migration 0004. |
| `price_bars_intraday` | 1m bars per instrument | Out of MVP. Sketch only — same key shape as daily. Behind a feature flag when it lands. |
| `corporate_actions` | per (instrument, action_date) | Splits, dividends, mergers. Feeds `adj_c` recomputation. |
| `fx_rates_daily` | per (currency_pair, t) | USD-KRW, EUR-USD, JPY-USD at minimum. Used by portfolio currency normalization. |
| `macro_series` | catalog row per series | `(id, code, name, source, frequency)`. Stores the *definition* of a macro indicator. |
| `macro_observations` | per (series_id, t) | One observation; supports daily, weekly, monthly. Anchors dashboard `IndicatorStrip` and analysis macro sections. |
| `fear_greed_daily` | per t | Single global series; small enough to keep its own table for read locality. |
| `ingestion_runs` (existing) | per run | Used by every cron in this tier; `last_refreshed_at` reads from here. |

### TIER 3 — Derived / analysis input

| Table | Granularity | Notes |
| --- | --- | --- |
| `financial_statements` | per (instrument, fiscal_period, statement_type) | Header row: period, currency, restated flag. |
| `financial_lines` | per (statement_id, line_code) | Long format — see decision 2. Line-code book in seed. |
| `key_ratios_quarterly` | per (instrument, fiscal_period) | Wide cache for screen reads (PER/PBR/ROE/etc.). Recomputed from lines after every statement upsert. |
| `analyst_estimates` | per (instrument, fiscal_period, analyst) | Raw consensus inputs. |
| `consensus_snapshots` | per (instrument, fiscal_period, asof) | Aggregated mean/median/std/n for fast read. |
| `earnings_events` | per (instrument, t) | Surprise vs consensus, guidance change. |
| `filings` | per (instrument, accession_no) | SEC EDGAR + DART. `kind ∈ {10K,10Q,8K,13F,DART,…}`. |
| `filing_holdings` | per (filing_id, instrument_id) | 13F line items. Joined by tier 3.6 to derive `master_filings`. |
| `institutional_holders` | per (instrument, holder, asof) | Latest snapshot per holder; history derives from `filing_holdings`. |
| `insider_trades` | per (instrument, person, t) | Form 4 + DART insider equivalent. |

### TIER 3.5 — News, events, reports

| Table | Granularity | Notes |
| --- | --- | --- |
| `news_items` | per (id) | Source, headline, summary, language, sentiment. |
| `news_instruments` | per (news_id, instrument_id) | M:N — one article can tag multiple tickers. |
| `economic_events` | per (calendar_id, t) | Macro calendar (FOMC, NFP, KOSPI dividend ex-dates). Drives dashboard `EconomicEventsList`. |
| `reports` | per (id) | Title, source, category, summary, body_url. |
| `report_tickers` | per (report_id, instrument_id) | M:N tickers per report. Powers report-stock backlinks. |

### TIER 3.6 — Masters

| Table | Granularity | Notes |
| --- | --- | --- |
| `masters` | per (id) | Identity row (name, firm, AUM, style). |
| `master_principles` | per (master_id, ordinal) | Numbered investing principles. |
| `master_books` | per (master_id, ordinal) | Title + url. |
| `master_strategies` | per (master_id, ordinal) | Free-text playbooks. |
| `master_filings` | join view over `filings` + `filing_holdings` | Not a new table — see decision 4. |

### TIER 4 — User state

All tables: owner-only RLS via `auth.uid() = user_id`. Writes go through the FastAPI layer.

| Table | Notes |
| --- | --- |
| `profiles` (existing, extend) | Add the missing FK to `auth.users(id) on delete cascade` in migration 0004. |
| `watchlists`, `watchlist_items` (existing) | Position uniqueness must become `deferrable initially deferred` in 0004. |
| `portfolios`, `transactions` (existing) | Add `transactions.amount` consistency check; fix `instrument_id` nullability per kind. |
| `saved_reports` | `(user_id, report_id, saved_at, note)`. |
| `saved_instruments` | Distinct from watchlists — watchlists are ordered surfaces, saved is a flat bookmark. |
| `position_theses` | One per `(user_id, instrument_id)`. Free-text thesis. |
| `position_thesis_conditions` | Children of `position_theses`. Each row is one fail/trigger condition. |
| `memos` | Polymorphic — see decision 3. `(user_id, target_kind, target_id, body, created_at)`. |
| `alerts` | User-defined price/indicator alerts. |
| `notifications` | System-emitted; mark-read state per user. |
| `todos` | User todo items shown on dashboard. |
| `activity_log` | Append-only audit of user-visible events. |
| `screens` | Saved analysis filters (`/analysis` screener tab). |
| `user_settings` | Either its own table or extend `profiles.preferences jsonb` (decision pending — see decision 5). |

## 3. Fixture-to-tier mapping

Every fixture under `web/src/fixtures/` exists because there is no table for it yet. This mapping pins each fixture entity to the tier and table that will retire it.

| Fixture file & export | Tier | Future table(s) |
| --- | --- | --- |
| `dashboard.ts` › `WATCHLIST` | 4 | `watchlist_items` (already wired in PR-09; remaining fixture is dev fallback) |
| `dashboard.ts` › `PORTFOLIO_SUMMARY` | 4 | derived from `portfolios` + `transactions` (already wired in PR-11) |
| `dashboard.ts` › `MACRO_INDICATORS` | 2 | `macro_series` + `macro_observations` |
| `dashboard.ts` › `FEAR_GREED` | 2 | `fear_greed_daily` |
| `dashboard.ts` › `ECONOMIC_EVENTS` | 3.5 | `economic_events` |
| `dashboard.ts` › `ACTION_PROMPTS`, `TODOS` | 4 | `todos` |
| `dashboard.ts` › `RETURNS_*` | 4 | derived from `transactions` + `price_bars_daily` |
| `stocks.ts` › `STOCK_LIST` | 1 | `instruments` (+ `company_profiles` for name) |
| `stocks.ts` › `STOCK_DETAIL.keyStats` | 3 | `key_ratios_quarterly` (cache) joined to `price_bars_daily` (52W range) |
| `stocks.ts` › `STOCK_DETAIL.incomeStatement` / `balanceSheet` / `cashFlow` | 3 | `financial_statements` + `financial_lines` |
| `stocks.ts` › `STOCK_DETAIL.valuationMetrics` / `peerComparison` / `fairValueEstimates` | 3 | `key_ratios_quarterly` + ad-hoc DCF/relative valuation derivations |
| `stocks.ts` › `STOCK_DETAIL.filings` | 3 | `filings` |
| `stocks.ts` › `STOCK_DETAIL.news` | 3.5 | `news_items` + `news_instruments` |
| `stocks.ts` › `STOCK_DETAIL.supplyKpis` / `institutionalHolders` / `insiderTrades` | 3 | `institutional_holders`, `insider_trades` |
| `stocks.ts` › `STOCK_DETAIL.consensus` / `analystReports` / `guruHoldings` | 3 | `consensus_snapshots`, `reports`, `master_filings` view |
| `analysis.ts` › `MARKET_INDICES` | 2 | `price_bars_daily` keyed by `indices` rows |
| `analysis.ts` › `SECTOR_ROTATION` / `STYLE_ROTATION` | 3 | derived materialized view over `price_bars_daily` + `instrument_sector` |
| `analysis.ts` › `SENTIMENT_INDICATORS` | 2 | `macro_series` (sentiment) + `fear_greed_daily` |
| `analysis.ts` › `FED_RATE_PROBABILITIES` | 2 | `macro_series` (CME FedWatch ingestion) |
| `analysis.ts` › `TECHNICAL_*` / `FINANCIAL_*` / `QUANT_*` | 3 | derived from `price_bars_daily` + `financial_lines` |
| `analysis.ts` › `DCF_*` | 3 | derived; no separate table |
| `analysis.ts` › `RECENT_SIGNALS` / `SAVED_SCREENS` | 4 | `alerts` + `screens` |
| `analysis.ts` › `SENTIMENT_HISTORY` / `GLOSSARY_TERMS` | 2 / 3 | `macro_observations` history; `glossary_terms` (small ref) |
| `reports.ts` › `REPORTS`, `REPORT_KPIS` | 3.5 | `reports` |
| `masters.ts` › `MASTERS`, principles/books/strategies, `MASTER_FILINGS` | 3.6 | `masters`, dependents, `filings` + `filing_holdings` view |
| `learn.ts` › glossary / guides / library | 3.5 | `glossary_terms`, `guides`, `reports` (library overlaps) |
| `mypage.ts` › account, settings, sessions, activity, theses, transactions | 4 | `profiles`, `user_settings`, `sessions` (managed by Supabase Auth), `activity_log`, `position_theses`, `transactions` |

Fixtures will be removed *file-by-file* in the migration-slice PRs as soon as the corresponding table can serve the same screen via the API.

## 4. Chart and widget join paths

Every chart / analytical widget that currently reads a fixture must resolve through one of these documented join paths in production. If a widget cannot be expressed below, its schema is missing and must be added before its slice ships.

| Widget (file) | Tables joined | Read shape |
| --- | --- | --- |
| Dashboard `IndicatorStrip` | `macro_series ⋈ macro_observations` | latest observation per series; one-line per indicator |
| Dashboard `EconomicEventsList` | `economic_events` | next 7 days, ordered by `t` |
| Dashboard `WatchlistCard` | `watchlist_items ⋈ instruments ⋈ price_bars_daily` (latest) | per-row: latest close + change vs prior close |
| Dashboard `PortfolioSummaryCard` | `portfolios ⋈ transactions ⋈ price_bars_daily` (latest) | derived holdings × latest close |
| Dashboard `ReturnsChart` | `transactions ⋈ price_bars_daily` | per-day equity curve from transaction ledger |
| Stocks `PriceChart` | `price_bars_daily` | `WHERE instrument_id=? AND t BETWEEN ? AND ? ORDER BY t` |
| Stocks `OverviewSection.keyStats` | `key_ratios_quarterly` (latest) ⋈ `price_bars_daily` (52W min/max) | one-row aggregate |
| Stocks `FinancialsSection` | `financial_statements ⋈ financial_lines` | pivot lines into the three statement shapes |
| Stocks `ValuationSection` | `key_ratios_quarterly` + `consensus_snapshots` | latest snapshot per peer set |
| Stocks `FilingsSection` | `filings` | latest N by date for instrument |
| Stocks `NewsSection` | `news_items ⋈ news_instruments` | latest N for instrument |
| Stocks `SupplyDemandSection` | `institutional_holders`, `insider_trades` | latest snapshot + 90-day trade list |
| Stocks `ConsensusSection` | `consensus_snapshots`, `reports ⋈ report_tickers`, `master_filings` view | three independent reads merged in API layer |
| Analysis `MarketOverviewSection` | `indices ⋈ price_bars_daily` | latest close per index; sector rotation = `instrument_sector ⋈ price_bars_daily` aggregate |
| Analysis sentiment / fed-rate | `macro_observations`, `fear_greed_daily` | latest + history |
| Analysis technical / financial / quant tabs | derived caches on top of tier 2 + tier 3 | one materialized view per tab |
| Analysis signals tab | `alerts` (definitions) + derivation runs | latest evaluations |
| Reports list/detail | `reports` (+ `report_tickers` for related stocks) | paginated by date |
| Masters detail | `masters`, dependents, `master_filings` view | identity + last 4 quarterly diffs |
| MyPage activity/theses/transactions | `activity_log`, `position_theses ⋈ position_thesis_conditions`, `transactions` | owner-RLS scoped reads |

## 5. Open decision points — recorded answers

1. **Indices as `instruments` rows vs a separate `indices` table.** **Decision: separate `indices` table.** Reason: constituent membership is index-specific, indices don't have OHLC the way equities do (vendor-provided level series instead), and we don't want trade-time fields like `exchange`/`figi`/`cik` to pollute the equity table. Keep them apart and let `price_bars_daily` accept either an `instrument_id` or an `index_id` via a check-constrained `entity_kind` column (resolved per ingestion-pipeline review when migration 0006 opens).

2. **`financial_lines` shape — long vs wide.** **Decision: long format with a line-code book.** Reason: KR (K-IFRS) and US (US-GAAP) line items don't align cleanly. A wide schema would either explode to hundreds of columns or sacrifice one accounting standard. The long format absorbs both, and the `key_ratios_quarterly` wide cache covers the read latency on the stock detail page.

3. **`memos` polymorphism — single table vs one-per-target.** **Decision: single table with `(target_kind, target_id)` + check constraint** on `target_kind ∈ {'instrument','transaction','report','master','news','filing'}`. Reason: memos are a cross-cutting user feature; one schema collects the count, search, and timeline read paths in one place. Per-target tables would duplicate RLS policies and indexes 6×.

4. **Wireframe revisions invalidating tiers.** **Decision: keep tiers 3.5 (news/reports) and 3.6 (masters) as planned.** Reason: even though wires are mid-revision, the user has explicitly retained reports and masters as MVP surfaces. If a future revision cuts either, the matching migration (0009 or 0010) drops out and the slice list collapses without affecting earlier migrations.

5. **`user_settings` as a table vs `profiles.preferences jsonb`.** **Decision: extend `profiles` with `preferences jsonb default '{}'::jsonb`.** Reason: the settings surface today is small (theme, default currency, locale, notification flags). A jsonb column ships in 0004 alongside the existing FK fix and avoids a dedicated migration. If settings grow into multi-row data (per-channel notification routes, per-account API keys), promote to a `user_settings` child table at that point.

## 6. Migration slicing — locked order

This order is the contract between this plan and the migration-slice PRs. Each migration ships with RLS policies, grants, indexes, and `updated_at` triggers in the same file. Do not start 0004 until the wireframe revision pass is complete and PR-16 has merged.

```
0004  schema-bugfixes          (the five known bugs; carry the +profiles.preferences jsonb extension here)
0005  reference-enrich         (company_profiles, sectors + instrument_sector, indices + index_constituents, instrument_aliases)
0006  market-data-extend       (corporate_actions, fx_rates_daily, macro_series + macro_observations, fear_greed_daily, price_bars_daily.adj_c)
0007  fundamentals             (financial_statements + financial_lines, key_ratios_quarterly, analyst_estimates, consensus_snapshots, earnings_events)
0008  filings-holdings         (filings, filing_holdings, institutional_holders, insider_trades)
0009  news-events-reports      (news_items + news_instruments, economic_events, reports + report_tickers)
0010  masters                  (masters, master_principles, master_books, master_strategies, master_filings view over filings/filing_holdings)
0011  user-state               (saved_reports, saved_instruments, position_theses + position_thesis_conditions, memos, alerts, notifications, todos, activity_log, screens)
```

Within each migration, prefer **one read shape per table** — if a chart needs a different read shape, ship a view, not a new table.

## 7. Cross-cutting invariants

- **RLS by tier.** Tier 1–3.6: `enable row level security` with `for select using (true)` and writes restricted to the service role. Tier 4: owner-only `using (auth.uid() = user_id)`.
- **Timestamps.** Every table has `created_at timestamptz not null default timezone('utc', now())`. Tables that mutate also carry `updated_at timestamptz` with a trigger.
- **Primary keys.** Reference + user-state tables: `id uuid primary key default gen_random_uuid()`. Time-series tables: composite `(entity_id, t)` per migration 0003's precedent.
- **Source attribution.** Every ingested row carries `source text not null` so a vendor swap can be replayed and audited.
- **No silent N+1 in API reads.** Every join path documented in section 4 must be reachable through a single PostgREST query or a single SQL function. If it isn't, add a view in that migration's file.

## 8. Carry-over bugs from existing migrations

These five are not fixed in this PR — they ride into migration 0004 so they can land alongside the `profiles.preferences` extension:

- `supabase/migrations/0001_mvp_foundation.sql:81` — `watchlist_items_unique_position` must become `deferrable initially deferred` so reorder swaps don't deadlock.
- `supabase/migrations/0001_mvp_foundation.sql:21-33` — `profiles.id` needs the FK to `auth.users(id) on delete cascade`. PR-08 deferred it pending PR-14; PR-14 is now merged so the FK lands.
- `supabase/migrations/0002_portfolio.sql:33,47` — `transactions.amount` lacks a consistency check against `quantity * price` for buy/sell rows.
- `supabase/migrations/0002_portfolio.sql:44` — `dividend` rows currently allow `instrument_id` null; only `deposit` should. Tighten the check constraint.
- `supabase/migrations/0003_prices_ingestion.sql:4-15` — `price_bars_daily` has no OHLC sanity checks (`h >= greatest(o,c,l)`, `l <= least(o,c,h)`, `v >= 0`).
