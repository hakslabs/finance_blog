# Frontend

## Source Of Truth

Use the existing design skeleton as the first implementation source:

- `design/STOCKLAB Wireframes v3.html`
- `design/design-canvas.jsx`
- `design/wires-v3/`

The product name is Finance_lab, even when wireframe files still show STOCKLAB.

## Planned Stack

- React for UI.
- Vercel for deployment.
- Backend communication through FastAPI endpoints.
- Supabase client only for flows that are intentionally browser-safe. Private data operations should go through the backend unless the access model is explicitly designed with RLS.

## External Skills

Use the Vercel Labs agent skills repo as a guide during frontend work: `git@github.com:vercel-labs/agent-skills.git`.

Apply by skill:

- `react-best-practices` — required reading before writing or reviewing React components. Covers waterfalls, bundle size, re-render hygiene, data-fetching patterns.
- `web-design-guidelines` — run as a self-audit before opening a frontend PR. Accessibility, UX, visual polish.
- `composition-patterns` — consult when extracting shared primitives (PR-02) or when a wire needs an unusual composition.
- `react-view-transitions` — only when a route or list transition is in scope (defer until MVP screens are stable).
- `deploy-to-vercel`, `vercel-cli-with-tokens` — use during PR-12.

Loading rule: clone once under a sibling path (e.g. `~/work/_skills/agent-skills/`) and open only the specific skill folder a PR needs. Do not load the whole repo into context.

## UI Principles

- Preserve the dashboard-first product shape.
- Keep Korean investing terminology clear for beginners.
- Prefer dense but readable operational screens over marketing pages.
- Every major screen should help the user decide what to inspect, record, or learn next.
- Avoid building a new visual language until the wireframe behavior is implemented.

## First Route Candidates

- `/`
- `/dashboard`
- `/stocks`
- `/stocks/:symbol`
- `/portfolio`
- `/analysis`
- `/masters`
- `/reports`
- `/reports/:id`
- `/learn`
- `/mypage`
- `/admin`
