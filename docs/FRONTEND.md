# Frontend

This document is the single entry point for any frontend work. Before touching `web/src/`, read this file in full, then `docs/FRONTEND-MAP.md` for the module index.

## Source Of Truth

Use the existing design skeleton as the first implementation source:

- `design/STOCKLAB Wireframes v3.html`
- `design/design-canvas.jsx`
- `design/wires-v3/`

The product name is Finance_lab, even when wireframe files still show STOCKLAB.

## Planned Stack

- React (19) + TypeScript for UI.
- Vite for dev/build.
- Vercel for deployment.
- Backend communication through FastAPI endpoints.
- Supabase client only for flows that are intentionally browser-safe. Private data operations should go through the backend unless the access model is explicitly designed with RLS.

## External Skills

Use the Vercel Labs agent skills repo as a guide during frontend work: `git@github.com:vercel-labs/agent-skills.git`.

Apply by skill:

- `react-best-practices` — required reading before writing or reviewing React components.
- `web-design-guidelines` — run as a self-audit before opening a frontend PR.
- `composition-patterns` — consult when extracting shared primitives or when a wire needs an unusual composition.
- `react-view-transitions` — only when a route or list transition is in scope.
- `deploy-to-vercel`, `vercel-cli-with-tokens` — use during PR-12.

Loading rule: clone once under a sibling path (e.g. `~/work/_skills/agent-skills/`) and open only the specific skill folder a PR needs. Do not load the whole repo into context.

## UI Principles

- Preserve the dashboard-first product shape.
- Keep Korean investing terminology clear for beginners.
- Prefer dense but readable operational screens over marketing pages.
- Every major screen should help the user decide what to inspect, record, or learn next.
- Avoid building a new visual language until the wireframe behavior is implemented.

## First Route Candidates

- `/`, `/dashboard`, `/stocks`, `/stocks/:symbol`, `/portfolio`, `/analysis`, `/masters`, `/reports`, `/reports/:id`, `/learn`, `/mypage`, `/admin`

## Conventions

These rules are invariant across all UI PRs. Each rule lists **Why** (failure mode it prevents) and **How** (concrete pattern to apply). When in doubt, follow the rule; if a rule clearly does not fit, raise it in the PR description and propose an update rather than silently breaking it.

### C-1. Every route page is wrapped in `PageContainer`

- **Why** — `PageContainer` emits the page-level `<section aria-labelledby>` + `<h1>` landmark with a `useId()`-driven id. Without it, screen readers see no page title and the heading hierarchy collapses. PR-03 originally violated this by rendering a bare `<div>` + a hand-written `<h1>` inside a section component.
- **How** — Top-level export of any `*Page.tsx` returns `<PageContainer title={...} description={...} actions={...}>…</PageContainer>`. Use `description: ReactNode` for inline-styled meta (e.g. coloured status), `actions` for the top-right slot (KPI tile, primary CTA), and put page body content as children.

### C-2. Only `Card` and `Section` headers emit `<h2>`

- **Why** — Mixed `<h2>` sources break the h1→h2 outline. A reader/agent should know "find the `<h2>` in a Card/Section header" rather than scanning for arbitrary `<h2>` inside bodies.
- **How** — Use `Card`'s `title` prop or `Section`'s `title` prop. If you need a custom header layout that does not fit those props, render the custom header **inside** a `Card` and emit `<h2>` there — never outside a Card/Section header region. Other primitives (`EmptyState`, `KpiTile`, …) must use styled `<p>`.

### C-3. Co-located CSS Modules; no new globals

- **Why** — Globals leak, override silently, and force readers to grep the whole `styles/` tree. Per-component CSS Modules localize blast radius and keep one component's CSS scannable from one file.
- **How** — Every component lives next to its `*.module.css`. Only `src/styles/tokens.css` (CSS variables) and `src/styles/base.css` (reset, `sr-only`, `skip-link`) are global. To add a new global, raise it in PR description.

### C-4. Colors and spacings come from CSS variables

- **Why** — Hard-coded hex/px values drift from the design tokens, and theme changes become a global find-and-replace.
- **How** — Use `var(--positive)`, `var(--accent)`, `var(--hairline)`, `var(--ink)`, etc. (full list in `src/styles/tokens.css`). Chart-specific colors that are not in tokens (e.g. KOSPI blue `#2c6fa5`, S&P brown `#a55b2c`) live as constants inside the CSS Module that uses them, not as inline styles.

### C-5. State-driven styles use class variants, not inline `style`

- **Why** — Inline ternaries (`style={{ color: x ? "var(--positive)" : "var(--negative)" }}`) duplicate logic across files, fight CSS Modules, and cannot use pseudo-selectors. They are the most common source of pattern drift.
- **How** — Map state → class via a `Record<State, string>` constant near the top of the component (see `MA_CLASS`, `SOURCE_CLASS` in dashboard sections). Use `:last-child`, `:nth-child(n)` for row striping/border control instead of `i === items.length - 1 ? "none" : undefined`. Inline `style` is only acceptable for genuinely dynamic numeric values (grid spans driven by data, progress bar widths).

### C-6. Stable React keys come from fixture `id` fields

- **Why** — Keys derived from sliced strings (`key={title.slice(0, 16)}`) collide silently when two items share a prefix, and they break diffing when item text edits. PR-03 originally used this for todos/news/events.
- **How** — Every fixture row carries an explicit `id: string`. Map components key by `item.id`. New fixtures must include `id` from day one.

### C-7. Decorative SVGs are `aria-hidden`; meaningful ones get `aria-label`

- **Why** — Sparklines that duplicate the change-percent cell are noise to a screen reader. Gauges that carry information without an adjacent text equivalent must be labelled.
- **How** — Row/cell sparklines: `aria-hidden="true"`. Standalone charts (F&G gauge, donut, returns chart): `aria-label` describing what the chart conveys, or `role="img"` + `aria-label`.

### C-8. Deterministic helpers are hoisted to module scope

- **Why** — A pure function called on every render with the same arguments wastes work and clutters component bodies. PR-03 originally recomputed `donutSegments`, `areaPath`, and the gauge arc paths per render.
- **How** — If a helper's inputs are static fixtures or constants, compute once at module load (`const SPARK_MACRO_UP = build(true, 40, 14)`). If inputs change per-instance but rarely, wrap in `useMemo([deps])`.

### C-9. Fixture types describe one concept per type

- **Why** — Frankenstein types (`PortfolioSummary & { date; day; krxOpen; … }`) mislead readers about what each field belongs to and create surprising couplings. PR-03 originally collapsed market state and portfolio numbers into one `MARKET_STATUS` const.
- **How** — One type per domain concept (`PortfolioSummary`, `MarketStatus`, `Notice`, …). Page composition pulls multiple constants rather than one mega-object.

### C-10. PR scope discipline

- **Why** — Piggyback changes (e.g. a sidebar fix slipping into the dashboard PR) hide behind the headline diff and force reviewers to context-switch.
- **How** — If a change is outside the PR's stated Files/Scope, split it into a sibling fixup commit and call it out in the PR description, or open a separate PR.

## Anti-patterns

Bad/good pairs that come up repeatedly in review. Each entry maps to a Convention rule above. Add to this section only when a new shape of failure appears that none of the existing entries already cover — duplicate examples make the list look longer than it is and dilute signal.

### AP-1. Bare page wrapper, hand-written `<h1>` (rule C-1)

```tsx
// ❌
export function FooPage() {
  return (
    <div className={styles.page}>
      <h1>Foo</h1>
      <Card>…</Card>
    </div>
  );
}

// ✅
export function FooPage() {
  return (
    <PageContainer title="Foo" description="…">
      <Card>…</Card>
    </PageContainer>
  );
}
```

### AP-2. State-driven style as inline `style` (rule C-5)

The most common failure mode in PR-03. Three shapes, one rule: **anything that switches on a runtime value belongs in a class.**

```tsx
// ❌ a) color via ternary
<span style={{ color: up ? "var(--positive)" : "var(--negative)" }}>
  {change}
</span>

// ❌ b) last-row border simulated in JS
{rows.map((r, i) => (
  <div style={{ borderBottom: i < rows.length - 1 ? undefined : "none" }} />
))}

// ❌ c) N-way variant via nested ternary
<span style={{
  color: source === "공통" ? "var(--muted)"
    : source === "알람" ? "var(--negative)"
    : "var(--accent)",
}}>{source}</span>
```

```tsx
// ✅ a) class variant
<span className={up ? styles.changePos : styles.changeNeg}>{change}</span>

// ✅ b) CSS pseudo-selector
<div className={styles.row} />
// .row { border-bottom: 1px solid var(--hairline); }
// .row:last-child { border-bottom: none; }

// ✅ c) Record<State, className>
const SOURCE_CLASS: Record<TodoSource, string> = {
  공통: styles.sourceCommon,
  알람: styles.sourceAlarm,
  Thesis: styles.sourceThesis,
};
<span className={SOURCE_CLASS[todo.source]}>{todo.source}</span>
```

Inline `style` stays only for genuinely dynamic numeric values (`width: ${percent}%`, `gridColumn: span ${n}`).

### AP-3. Keys from sliced strings (rule C-6)

```tsx
// ❌
{news.map((n) => <article key={`news-${n.title.slice(0, 16)}`}>…</article>)}

// ✅ fixtures define `id` up front
{news.map((n) => <article key={n.id}>…</article>)}
```

### AP-4. Helper recomputed every render (rule C-8)

```tsx
// ❌
function FooChart() {
  const path = buildPath("portfolio", 600, 130);  // same inputs every render
  return <path d={path} />;
}

// ✅ module scope when inputs are constant
const PORTFOLIO_PATH = buildPath("portfolio", 600, 130);
function FooChart() { return <path d={PORTFOLIO_PATH} />; }

// ✅ useMemo when inputs vary per instance
function HeatmapCard({ seed }: { seed: number }) {
  const cells = useMemo(() => buildCells(seed), [seed]);
  …
}
```

### AP-5. Frankenstein fixture type (rule C-9)

```ts
// ❌
export const MARKET_STATUS: PortfolioSummary & {
  date: string; day: string; krxOpen: boolean;
} = { totalAssets: "…", date: "5/06", krxOpen: true, … };

// ✅
export const PORTFOLIO_SUMMARY: PortfolioSummary = { … };
export const MARKET_STATUS: MarketStatus = { date: "5/06", krxOpen: true, … };
```

### AP-6. Decorative SVG labelled (rule C-7)

```tsx
// ❌ — duplicate of the change-percent text next to it
<svg aria-label={`${symbol} sparkline`}>…</svg>

// ✅
<svg aria-hidden="true">…</svg>
```

## PR Review Checklist

Run this list before opening any UI PR and again before merging. The reviewing agent uses the same list, so passing it locally avoids the round-trip.

1. Every new page exports a component that wraps content in `PageContainer` with a string `title`.
2. Every `<h2>` is rendered inside a `Card` or `Section` header region. No `<h2>` in primitive bodies.
3. Every new component has a co-located `*.module.css`. No new entry in `src/styles/*` beyond `tokens.css`/`base.css`.
4. No `style={{ color: ... }}`, `style={{ background: ... }}`, `style={{ borderColor: ... }}` with token references — these belong in CSS classes.
5. Color/spacing values inside CSS reference `var(--...)` tokens (chart palette constants OK; raw hex in component `style` is not).
6. Row/list borders use `:last-child` / `:nth-child(n)`, not JS ternaries on index.
7. Every list `key` is a stable id (preferably a fixture `id` field), not a substring of user-facing text.
8. Decorative SVGs (sparklines that duplicate a number, mark icons) have `aria-hidden="true"`. Informational SVGs have `aria-label` or `role="img"` + `aria-label`.
9. Pure helpers whose inputs are static are hoisted to module scope or wrapped in `useMemo`.
10. Each fixture type names one concept. No `A & { ...B fields }` Frankenstein types.
11. Changed files match the PR's Files/Scope. Unrelated fixes go to a sibling commit with a one-line note in the description.
12. `npm run lint` and `npm run build` pass.
13. `docs/FRONTEND-MAP.md` is updated for any added/renamed/removed file under `web/src/`.

## Where To Find Things

- Module index (components, props, fixtures): `docs/FRONTEND-MAP.md`
- Folder-local entry pointer for agents: `web/AGENTS.md`
- Wires inventory: `docs/design-docs/wires-inventory.md`
- Core product beliefs: `docs/design-docs/core-beliefs.md`
