# AGENTS — `web/`

Folder-local entry for any agent (Claude, Codex, OpenCode, …) editing `web/src/`. Read these in order before opening files:

1. `docs/FRONTEND.md` — Conventions, Anti-patterns, PR Review Checklist. Treat as law.
2. `docs/FRONTEND-MAP.md` — Module index (components, props, fixtures, routes). Treat as map.
3. The wire(s) named in the current PR's `Required Reading`.

## Hard Rules (the short list)

If you do not have time to read the full conventions, at minimum:

- Every route page wraps content in `<PageContainer title=… description=… actions=…>`. Never hand-roll `<h1>` outside it.
- `<h2>` only appears inside a `Card` or `Section` header region.
- Co-located `*.module.css` per component. No new globals beyond `src/styles/tokens.css` and `src/styles/base.css`.
- State-driven styles use class variants (`Record<State, string>`), not inline `style={{ color: ... }}`.
- React keys use fixture `id` fields. Adding a new fixture? Add `id: string` to its type.
- Run `npm run lint` and `npm run build` before declaring done.
- Update `docs/FRONTEND-MAP.md` in the same PR when you add/rename/remove a file under `web/src/`.

## When You Break A Rule

Sometimes a rule legitimately does not fit. In that case:

1. Note it in the PR description with the rule number (e.g. "C-3 exception: …") and the reason.
2. Propose an update to `docs/FRONTEND.md` so the next PR inherits the new judgment.

Silent rule-breaking is the failure mode this directory of docs exists to prevent.
