# Plans

## Goal

Move Finance_lab from design skeleton to a working MVP with real data on screen.

## Context

The project starts with wireframes and a clear product direction. The planned order is frontend, backend/API, screen-facing data pipeline, external data collection, then scheduled automation.

## Plan

- [ ] Scaffold production React app.
- [ ] Map routes from the wireframes.
- [ ] Implement static UI pages.
- [ ] Scaffold FastAPI backend.
- [ ] Define Supabase schema and RLS strategy.
- [ ] Connect first dashboard endpoint.
- [ ] Build screen-facing data models and API responses.
- [ ] Render data through the backend path.
- [ ] Import first real data source after visible data flows work.
- [ ] Add scheduled refresh only after manual or command-driven ingestion works.

## Progress Notes

- Harness documentation initialized.

## Open Questions

- Which exact React app framework will be used?
- Which first market data provider will be used?
- Which free-tier API limits are acceptable for MVP refresh cadence?
- Will Supabase Auth be used immediately or deferred?
- Which runtime will own cron jobs after manual ingestion is stable?
- How will domestic brokerage reports be collected and normalized?
