# MCP Routing

This project has MCP servers configured. Agents must prefer the right MCP over generic Bash/Read/WebFetch when a trigger below matches. If the preferred MCP is unavailable in the current session, fall back to the listed alternative — do not silently skip.

## Available Servers

`alphavantage`, `context7`, `docling`, `fetch`, `git`, `grep_app`, `scrapling`, `supabase`, `websearch`.

## Trigger → Tool Table

| Trigger (what you're about to do) | First choice | Fallback | Why |
| --- | --- | --- | --- |
| Look up current API/syntax of a library (FastAPI, React, Next, Supabase client, Pydantic, yfinance, etc.) | `context7` | `websearch` | `context7` returns version-pinned docs; avoid stale `docs/references/*-llms.txt`. |
| Find real-world code examples of a pattern across public repos | `grep_app` | `websearch` | Pattern discovery, not generic search. |
| Fetch a known URL where the server returns clean HTML/JSON | `fetch` | `scrapling` | Cheap, no anti-bot needed. |
| Scrape a page that blocks `fetch` (Cloudflare, JS-rendered, anti-bot) | `scrapling` | manual note + skip | Only use when `fetch` actually fails; do not default to it. |
| Parse a PDF / DOCX / messy HTML into structured text (reports, 13F filings, financial statements) | `docling` | `fetch` + manual parse | Required for PR-13+ report ingestion; do not roll your own parser. |
| Search the web for news, blog posts, current events, "what is X" | `websearch` | — | Use when no specific URL is known. |
| Any Supabase work: migrations, schema introspection, RLS policy, seed, query check | `supabase` | `psql` via Bash | Direct, idempotent; avoid hand-typed `psql` for schema. |
| Get a real US stock quote, OHLCV, fundamentals, earnings | `alphavantage` | `yfinance` via FastAPI | First-class for PR-10 fallback path and PR-11 fundamentals. |
| Repo operations Claude Code already handles (status, diff, log, blame) | `Bash git` | `git` MCP | `Bash` is faster and visible in transcript. Use `git` MCP only when an op needs structured output or runs against a non-cwd repo. |

## Runtime Budget And Timeouts

MCP tool calls run over stdio with a per-call timeout enforced by the client (OpenCode, Claude Code, etc.). When a call exceeds the timeout the connection drops and the server can stay dead for the rest of the session. Treat MCP calls as "must finish in ~30s" by default.

Expected runtime per server (rough):

| Server | Typical | Risk of timeout |
| --- | --- | --- |
| `context7`, `grep_app`, `websearch`, `fetch`, `git`, `supabase` (queries) | <5s | low |
| `alphavantage` | 1–10s, occasional spikes on free tier | medium |
| `scrapling` | 5–30s per page; JS-rendered pages are slower | medium |
| `supabase` (migration apply against large DB) | up to minutes | medium |
| `docling` (big PDFs, 13F filings, multi-hundred-page reports) | tens of seconds to minutes | high |

Rules:

- **Raise the per-server timeout in client config** for `docling`, `scrapling`, and `supabase`. In OpenCode this is the `timeout` (ms) field on the MCP entry — set 120000–300000 for these. Don't crank everything globally; raise only what needs it.
- **Chunk inputs before the call.** For `docling`, pass a page range (or pre-split the PDF) so each call handles at most ~30 pages. For `scrapling`, fetch one URL per call. For `supabase` migrations, split a fat migration into smaller files and apply one at a time.
- **Stream to disk, not into the response.** When extracting from a big doc, write output to a temp file and Read it back, instead of asking the MCP to return the full text in one payload.
- **Budget before calling.** If the work clearly won't fit in 30s and the input cannot be chunked, skip the MCP and use the CLI fallback below.

## When An MCP Dies

If a tool call times out, or the next call to that server fails with a connection/transport error:

1. Do not retry the same call with the same input — it will time out again and may keep the server unhealthy.
2. Try a smaller input (one page, one URL, one statement). A successful small call often restores the server.
3. If small calls also fail, the server process is dead for this session. Fall back to its CLI via Bash:
   - `docling` → `docling <input.pdf> --to md --output <out_dir>` (one page range at a time).
   - `scrapling` → its CLI or a short Python one-liner; write HTML to disk and Read it back.
   - `supabase` → `supabase db push` / `psql` for the specific migration file.
   - `alphavantage` → plain HTTPS via `fetch` with the API key from env (server-side only).
4. Tell the user once that the MCP died and you switched to CLI fallback. Do not silently abandon the work.
5. A full session restart (`opencode` relaunch / `/clear` in Claude Code) brings the MCP back, but only do this if the current PR genuinely needs that MCP again — otherwise finish the PR on the fallback path.

## Anti-Patterns

- Reading `docs/references/*-llms.txt` *and* calling `context7` for the same library — pick `context7`.
- Using `scrapling` for a site that responds to plain `fetch` — wasteful.
- Hitting Alpha Vantage from the browser. All `alphavantage` calls go through FastAPI (see `docs/SECURITY.md`).
- Writing migrations as raw SQL strings in chat when `supabase` MCP can apply and verify them.
- Falling back to WebFetch/WebSearch when an MCP exists for the task — always check this table first.
- Retrying a timed-out MCP call with the same input. Shrink the input or move to CLI fallback.
- Throwing a whole PDF at `docling` in one shot. Always pass a page range.

## Per-PR Cheatsheet

Pair this with the Required Reading in `docs/exec-plans/active/EP-0001-mvp-foundation.md`.

- PR-01..06 (static frontend): `context7` for React/Vite/Router questions. No other MCP needed.
- PR-07 (FastAPI scaffold): `context7` for FastAPI / Pydantic v2.
- PR-08 (Supabase schema + RLS): `supabase` for migration apply and RLS verification. `context7` for PostgREST/Supabase client semantics.
- PR-09 (watchlist E2E): `supabase` for query checks. `context7` for the chosen frontend data client.
- PR-10 (first real market data): `alphavantage` as the documented fallback provider; `context7` for `yfinance` API surface; `fetch` only if probing a provider response.
- PR-11 (portfolio): `supabase`, `context7`.
- PR-12 (deploy): `context7` for current Vercel CLI / Render docs. `websearch` for status pages if a deploy step misbehaves.
- PR-13 (scheduled refresh, deferred): `supabase` (ingestion_runs writes), `alphavantage`/`yfinance`.

## Reporting Tool Use

When you take a non-obvious action — e.g. switch from `fetch` to `scrapling`, or apply a migration via `supabase` — mention it in one short line in the PR description so future agents see the precedent.
