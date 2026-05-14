# AGENTS

## Read Order

Always:

1. `ARCHITECTURE.md`
2. `docs/product-specs/finance-lab-mvp.md`
3. `docs/exec-plans/active/EP-0001-mvp-foundation.md`
4. `docs/design-docs/core-beliefs.md`
5. `docs/FRONTEND.md`
6. `docs/FRONTEND-MAP.md` (when editing `web/src/`)
7. `docs/SECURITY.md`
8. `docs/API.md`
9. `docs/ENV.md`
10. `docs/MCP-ROUTING.md`

Folder-local entry points (read these first when entering that folder):

- `web/AGENTS.md` — short rules + pointer to FRONTEND.md / FRONTEND-MAP.md.

Per PR, load only what that PR's `Required Reading` lists. In particular:

- `docs/design-docs/wires-inventory.md` — load before opening any `design/wires-v3/*.jsx`.
- `design/wires-v3/*.jsx` — load only the wires named in the PR.
- `docs/references/*-llms.txt` — load at most one per PR, only when its domain is in scope.
- `docs/design-docs/first-real-data.md` — load only for PR-10 and follow-ups touching market data.

## Repository Map

- `design/`: existing STOCKLAB wireframe canvas and React-style JSX skeletons. Treat this as the current product/design source.
- `docs/`: generated harness documentation for product, architecture, design, security, reliability, and execution planning.
- `scripts/`: utility scripts for repository setup and maintenance.

## Project Context

Finance_lab is a solo-built stock investing dashboard and learning workspace. It targets beginner investors who need one place to track watchlists, portfolios, market indicators, economic events, stock analysis, 13F investor portfolios, financial statements, reports, and study content.

The current implementation must follow the `design/` skeleton. The wireframe title still says STOCKLAB, but the project name is Finance_lab.

## Working Rules

- Keep the design implementation aligned with `design/STOCKLAB Wireframes v3.html` and `design/wires-v3/`.
- Prefer the design skeleton over new product ideas until the MVP screens are implemented.
- Keep user-facing flows fast; dashboard and stock pages should be designed for quick scanning and low-latency interactions.
- Operate within free-tier limits where practical, including hosting, database, scheduled jobs, and market/report APIs.
- Focus the market product on US stocks first, with selected Korean stocks supported where the data path is reliable.
- Build frontend first from the wireframes, then connect FastAPI and Supabase.
- Build the screen-facing data pipeline before the external ingestion pipeline.
- Treat automatic collection and cron scheduling as the last phase, after visible data flows work.
- Real data on screen is the main acceptance bar; placeholders are only acceptable before integration.
- Design for migration: Supabase is the first database/backend platform, but the system should avoid tight coupling that blocks later movement to a personal NAS or self-hosted database/server.
- Treat user portfolio, watchlist, thesis notes, and account data as private user data.
- Do not expose Supabase service role keys or backend secrets in browser code.
- Before reaching for Bash/Read/WebFetch, check `docs/MCP-ROUTING.md` — if a trigger matches, the MCP tool is the first choice.

## Done When

The project is not done until the main pages are implemented and real stock/economic data is rendered on screen through the intended backend/data path.
