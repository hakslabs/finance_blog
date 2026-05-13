# Repository Layout

This is the confirmed structure for Finance_lab. PR-01 scaffolds inside this layout; later PRs do not change it without an ADR.

## Top-Level

```
finance/
├── .env                    # local secrets, gitignored, shared by web + api
├── .env.example            # committed template
├── .gitignore
├── AGENTS.md               # agent read-order and rules
├── ARCHITECTURE.md
├── README.md
├── web/                    # Vite + React + TypeScript frontend
├── api/                    # FastAPI backend
├── supabase/               # migrations, seed, supabase CLI config
├── design/                 # wireframe canvas (source of truth for UI)
├── docs/                   # specs, design docs, exec plans, references
└── scripts/                # repo-wide utility scripts (setup, dev runner)
```

Rationale:

- Single `.env` at root, read by both `web/` and `api/`. Solo dev, one secret store. Vite must be configured with `envDir: '..'`; FastAPI loads with `python-dotenv` pointing at `../.env`.
- `web/` and `api/` are siblings, not a JS monorepo. They share no code through packages — they share through the typed API contract in `docs/API.md` (and later OpenAPI-generated clients).
- `supabase/` holds SQL migrations and seed data, owned by humans and the `supabase` CLI/MCP. Application code does not run migrations.
- `design/`, `docs/`, `scripts/` already exist and stay where they are.

## web/

```
web/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts          # envDir: '..' to read root .env
├── .eslintrc.*
├── public/
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── routes/             # one folder per route from FRONTEND.md
    │   ├── dashboard/
    │   ├── stocks/
    │   ├── portfolio/
    │   └── ...
    ├── components/
    │   ├── layout/         # AppShell, Sidebar, TopBar, PageContainer
    │   └── primitives/     # Card, DataTable, KpiTile, ChartPlaceholder, ...
    ├── fixtures/           # typed seed data used by static PRs
    ├── lib/
    │   ├── api-client.ts   # typed client for the FastAPI surface
    │   └── env.ts          # validated import.meta.env reader
    └── styles/
```

Only env vars prefixed `VITE_` are exposed to the browser bundle. Never put a secret behind `VITE_`.

## api/

```
api/
├── pyproject.toml
├── README.md               # local run instructions
└── app/
    ├── main.py             # FastAPI app, /health, router includes
    ├── settings.py         # env loader (reads ../.env)
    ├── routes/             # one module per resource (watchlists, quotes, ...)
    ├── repos/              # data access (Supabase client wrappers)
    ├── sources/            # external providers (yfinance, alphavantage, ...)
    ├── models/             # Pydantic request/response models
    └── tests/
```

`repos/` is the seam that keeps Supabase replaceable. Route handlers call `repos/`, never the Supabase client directly. This preserves the migration-away-from-Supabase invariant from `ARCHITECTURE.md`.

## supabase/

```
supabase/
├── config.toml             # supabase CLI config (project ref, etc.)
├── migrations/
│   └── 0001_initial.sql    # PR-08 lands here
└── seed/
    └── instruments.sql
```

Migrations are append-only and numbered. Never edit a migration after it has been applied to a shared environment.

## scripts/

Repo-wide convenience scripts only — anything that touches both web and api or sets up the dev environment. Per-app scripts belong inside `web/` or `api/`.

## What This Layout Decides

- Single root `.env`. No nested env files except for tool-specific ones already gitignored.
- No JS monorepo tooling (Turbo / pnpm workspaces) until there is a second JS package. There is none in the MVP.
- No shared TS/Python package. Cross-language contracts live in `docs/API.md` and (later) generated OpenAPI clients.
- Migrations live with the repo, not in a separate Supabase dashboard-only flow.

## What This Layout Does Not Decide Yet

These remain open and are tracked in EP-0001 Open Questions:

- Backend hosting target (Render / Fly / NAS) — does not change layout but does change `api/README.md` deploy notes.
- Python package manager (uv vs poetry vs pip-tools) — pick during PR-07.
- Whether `web/` adopts a UI library — defer until PR-02 reveals a real need.
