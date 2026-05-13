# Finance_lab MVP Spec

## Problem

Beginner investors often split their workflow across watchlists, brokerage screens, financial statements, market calendars, reports, blogs, and notes. This makes it hard to connect market information to portfolio decisions and learning.

Finance_lab should become a personalized investing workspace that helps a solo user see their market context, portfolio, watchlist, research, and learning material in one place.

## Scope

The MVP includes:

- Home dashboard with watchlist, portfolio summary, market indicators, economic events, and action prompts.
- Stock search and stock detail pages based on the existing wireframes.
- Portfolio management with holdings, transaction history, and basic performance.
- Learning pages for financial statements, economic terms, and investing concepts.
- 13F-style investor portfolio pages.
- Report and briefing pages, with later expansion toward RAG-style retrieval.
- Backend API connection and real stock/economic data rendered in the UI.

## Out Of Scope

- Automated trading.
- Brokerage order execution.
- Social/community features.
- Paid subscription logic.
- Fully automated RAG quality guarantees before the core data product works.

## Constraints

- Solo team.
- Follow the existing `design/` skeleton before expanding the product.
- Keep the app fast enough for repeated dashboard, watchlist, and stock-detail use.
- Stay within free-tier limits where practical for hosting, database, scheduled jobs, and third-party data APIs.
- Prioritize US stocks. Support selected Korean stocks when data availability and integration cost are acceptable.
- React frontend, FastAPI backend, Supabase database/auth-ready persistence, Vercel deployment.
- Keep the backend and database portable enough for future NAS/self-hosted migration.
- User-owned portfolio and notes must remain private.

## Done When

- Main pages from the design skeleton are implemented.
- The frontend talks to the backend through typed API boundaries.
- Supabase stores the first user-owned watchlist/portfolio data.
- Screen-facing dashboard, stock detail, and portfolio data models are rendered through the backend path.
- At least one real stock data source or economic data source is rendered in the dashboard or stock detail page.
- Automatic scheduled updates are explicitly deferred until manual or command-driven ingestion is stable.
