# Frontend

Single entry point for any frontend work in `web/`. Read this file fully, then `docs/FRONTEND-MAP.md` for the page/feature index, before editing.

## Stack

- React 19 + TypeScript, Vite 7 build, Tailwind v4 (`@tailwindcss/vite`).
- Routing: `wouter` (history mode). Hash mode is reserved for single-file artifact previews via `VITE_SINGLEFILE=1`.
- UI primitives: shadcn/ui (Radix + Tailwind) under `web/client/src/components/ui/`.
- Charts: `recharts`.
- Forms: `react-hook-form` + `@hookform/resolvers/zod`.
- Notifications: `sonner`.

Backend contract is FastAPI at `/api/v1/*`. In dev, vite proxies `/api` → `http://127.0.0.1:8000`. On Vercel, `vercel.json` rewrites `/api/(.*)` → `api/index.py`.

## Folder Layout

```
web/
├── client/
│   ├── index.html
│   └── src/
│       ├── App.tsx                  ← <Route>s + providers
│       ├── main.tsx
│       ├── index.css                ← Tailwind layers + theme tokens
│       ├── lib/
│       │   ├── http.ts              ← apiGet, ApiError, auth header
│       │   ├── utils.ts             ← cn(), classname helpers
│       │   └── data.ts              ← (legacy mock helpers, being removed)
│       ├── features/                ← ONE folder per backend domain
│       │   ├── masters/
│       │   │   ├── types.ts         ← mirrors api/app/models/masters.py
│       │   │   ├── service.ts       ← typed fetchers using lib/http
│       │   │   ├── use-masters.ts   ← React hooks: useXxxList/Detail
│       │   │   └── index.ts         ← public re-exports
│       │   ├── news/  reports/  events/  movers/  macros/
│       │   ├── market/  notices/
│       │   └── …                    (one folder per new domain)
│       ├── pages/                   ← route-level screens (1 per route)
│       ├── components/              ← cross-feature primitives + shadcn ui
│       ├── contexts/                ← Auth, Watchlist, Bookmark, Theme (localStorage-backed for now)
│       ├── hooks/                   ← cross-cutting hooks (useMobile, useComposition, …)
│       ├── services/mockData.ts     ← legacy mocks still consumed by MyPage; will shrink as domains migrate
│       └── types/
└── shared/                          ← code shared with server (constants etc.)
```

## Data Flow Rule

```
fastapi (/api/v1/*) ──► features/<domain>/service.ts ──► features/<domain>/use-<domain>.ts ──► pages/<Page>.tsx
```

- Pages **must not** call `fetch` or `apiGet` directly. They consume the typed hooks from a feature module.
- Feature modules **must not** import from `pages/` or other features. Cross-domain composition happens in the page.
- Types in `features/<domain>/types.ts` mirror the Pydantic models in `api/app/models/<domain>.py`. When the backend response changes, both files change in the same PR.
- No adapter glue. If a page needs a field the backend doesn't return, the backend gets the field — not the page.

## Adding a New Domain

1. Define / expand the Pydantic model in `api/app/models/<domain>.py`.
2. Add or extend the route in `api/app/routes/<domain>.py`. Keep the response envelope shape `{ items: [...] }` or `{ <domain>: {...} }` per `docs/API.md`.
3. Mirror the model in `web/client/src/features/<domain>/types.ts`.
4. Write `service.ts` (one method per endpoint, returns the typed value, not the envelope).
5. Write `use-<domain>.ts` with `useXxxList()` / `useXxxDetail()` hooks returning `{ data, loading, error }`.
6. Re-export from `index.ts`.
7. Page consumes the hooks.

## Auth

- Backend reads `Authorization: Bearer <supabase-jwt>` (`api/app/auth.py`).
- Frontend `lib/http.ts` attaches the token from `localStorage.supabase_jwt` if present.
- Supabase auth UI wiring is not yet landed; until then, authenticated endpoints (watchlists/portfolios/quotes) return 401 and the page renders its error state.

## Build / Deploy

- `cd web && npm run build` → `web/dist/`
- `vercel.json` at the repo root pins `buildCommand=cd web && npm install && npm run build`, `outputDirectory=web/dist`.
- All pushes to `main` trigger a production deploy. Branches trigger preview deploys.
- Bundle size watch: keep the JS chunk under 1.5 MB minified. Use route-level code splitting (`React.lazy` + dynamic `import()`) once the bundle grows past that.

## UI Conventions

- **Dark mode by default** (`ThemeProvider defaultTheme="dark"` in App). Tailwind uses CSS variables defined in `index.css` (`--background`, `--card`, `--up`, `--down`, …); always reference via class utilities, not hex.
- **Empty / loading / error states** are mandatory on any page that calls a hook. Use:
  - loading: centered `<Loader2 className="animate-spin" />` with hint text
  - error: red-tinted `border-destructive/40` card showing `error.message`
  - empty: muted `border-border/50 bg-card/30` card
- **Korean copy first**: page titles, filter labels, descriptions. Use Pretendard / Noto Sans KR (loaded in `index.html`).
- **Numbers are font-mono and `tabular-nums`** for any column that aligns vertically (prices, percentages, AUM).
- **Color coding**: gains use `text-up`, losses use `text-down`. Both resolve to OKLCH greens/reds from the theme tokens.
