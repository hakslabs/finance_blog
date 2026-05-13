# Security

## Security Model

Finance_lab will handle personal portfolio data, watchlists, investment notes, preferences, and potentially account settings. Treat this as private user data from the beginning.

## Supabase Rules

- Never expose service role keys or private ingestion credentials to the browser.
- Enable RLS on tables in exposed schemas.
- Policies must match the actual ownership model; do not use broad public policies for convenience.
- Do not use user-editable metadata for authorization decisions.
- Keep backend-only ingestion, parsing, and admin tasks outside browser code.
- Views that expose user data must be checked for RLS behavior before use.

## Backend Rules

- FastAPI endpoints should validate user identity and requested resource ownership.
- External data provider keys belong in server-side environment variables.
- Report ingestion and summarization should preserve source provenance.
- Admin endpoints should require explicit authorization, not only hidden UI.

## Data Sensitivity

- High: portfolio transactions, holdings, thesis notes, review notes, user preferences.
- Medium: watchlists and alerts.
- Public or derived: market prices, economic indicators, public filings, public reports.
