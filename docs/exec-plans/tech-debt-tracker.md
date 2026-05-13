# Tech Debt Tracker

## Open Debt

- The repository currently contains design artifacts but no production React/FastAPI app scaffold.
- Product name is Finance_lab, while the design files still use STOCKLAB.
- The exact Supabase schema is not finalized.
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
