# Finance_lab API

FastAPI service for backend-owned orchestration, typed API responses, and future Supabase/provider integrations.

## Setup

From the repository root:

```bash
cp .env.example .env
cd api
uv sync
```

The API reads the root `.env` file (`../.env`). `APP_ENV` is required and should be `local`, `preview`, or `prod`.

## Run

```bash
cd api
uv run uvicorn app.main:app --reload --port 8000
```

Check the scaffold endpoints:

```bash
curl http://localhost:8000/health
curl http://localhost:8000/v1/dashboard/example
```

## Current Endpoints

- `GET /health` - liveness check.
- `GET /v1/dashboard/example` - typed sample dashboard payload for contract checks.

## Scope

PR-07 intentionally does not connect to Supabase, market data providers, or auth. Those land in later PRs through resource-specific route and repo modules.
