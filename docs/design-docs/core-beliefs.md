# Core Beliefs

## Product Principles

- Finance_lab is for beginner and self-directed investors, not short-term trading or automated execution.
- The dashboard should connect market information to user action: watch, investigate, record thesis, review, or learn.
- Portfolio features should help the user understand decisions, not only display returns.
- 13F and report features should teach patterns and context rather than imply blind copying.
- Learning content should be close to the investing workflow, especially financial statements, economic terms, and report interpretation.

## Engineering Principles

- Build from the existing wireframes before inventing new screens.
- Keep API and data access boundaries portable because Supabase may later be replaced or complemented by self-hosted infrastructure.
- Prefer explicit data ingestion pipelines over hidden client-side scraping.
- Store normalized source data and derived summaries separately.
- Make scheduled updates observable and retryable.

## Verification Principles

- A page is not complete until it displays real data or a clearly documented integration stub.
- Portfolio and watchlist flows must be checked with realistic user-owned records.
- Data refresh jobs need timestamped evidence of the last successful run.
- Report/RAG features must expose source provenance before their summaries are trusted.

