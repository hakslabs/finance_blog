# Architecture

This document explains the stable structure of the repository.

## System Map

Finance_lab is planned as a React frontend backed by a FastAPI API and Supabase-managed persistence. Vercel is the planned deployment target for the frontend. Backend deployment may start simple and later move to a personal NAS or self-hosted server.

The product has four major surfaces:

- Personal dashboard: watchlist, portfolio, indicators, events, alerts, and tasks.
- Market and stock analysis: stock search, detail pages, charts, fundamentals, macro context, and screeners.
- Portfolio workflow: holdings, transaction history, thesis notes, review notes, and performance tracking.
- Learning and research: 13F investor portfolios, reports, financial statement education, economic terms, and future RAG-style report exploration.

## Module Boundaries

- Frontend owns routing, screen composition, interactive state, responsive behavior, and visual fidelity to the wireframes.
- FastAPI owns server-side orchestration, external data fetching, report ingestion, normalization, and private operations that require secrets.
- Supabase owns user data, auth-ready persistence, row-level access boundaries, and initial managed database hosting.
- Scheduled workers own recurring market, macro, calendar, 13F, and report refresh jobs.
- Future self-hosted infrastructure must be isolated behind repository/service interfaces so data access can migrate away from Supabase without rewriting UI logic.

## Data Domains

- Users and preferences
- Watchlists
- Portfolio accounts, transactions, positions, and performance snapshots
- Investment thesis and review notes
- Instruments and market metadata
- Price and fundamental time series
- Economic indicators and calendar events
- 13F managers, filings, holdings, and changes
- Reports, briefings, parsed text, summaries, and embeddings or retrieval indexes
- Learning content for financial statements, economic terms, and investing concepts

## Invariants

- Browser code never receives service-role credentials or private ingestion credentials.
- User-owned portfolio and note data must be scoped by user identity.
- Placeholder data must be clearly replaceable by real data adapters.
- Cron/import jobs must be idempotent where possible.
- Design source remains `design/` until a production design system supersedes it.
- The first production milestone requires real market or economic data rendered in the UI.
