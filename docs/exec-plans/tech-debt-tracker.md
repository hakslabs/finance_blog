# Tech Debt Tracker

## Open Debt

- The repository currently contains design artifacts but no production React/FastAPI app scaffold.
- Product name is Finance_lab, while the design files still use STOCKLAB.
- The exact Supabase schema is not finalized. Master plan is tracked under PR-17 in `docs/exec-plans/active/EP-0001-mvp-foundation.md`; the five known schema bugs (watchlist position uniqueness, missing `profiles.id → auth.users` FK, transaction amount/instrument constraints, missing OHLC sanity checks) are carried into migration 0004 there. Do not start migrations until the in-flight wireframe revision pass settles.
- Data vendors and rate limits are not finalized.
- Scheduled job runtime is not selected.
- Report ingestion and RAG architecture are future-facing and need tighter scoping.

## Prioritized Debt

1. Create production app structure and route map from the wireframes.
2. Define the first database schema for users, watchlists, portfolios, instruments, prices, and events.
3. Decide the first market data provider and ingestion cadence.
4. Replace wireframe placeholder values with typed API responses.
5. Add migration notes for future self-hosting.

## Resolved Debt

- Harness documentation structure created.
