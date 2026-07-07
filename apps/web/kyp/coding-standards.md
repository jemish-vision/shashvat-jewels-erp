# Frontend Coding Standards

## TypeScript

- `strict: true`; no `any`, no non-null `!` without a comment justifying it.
- Props interfaces named `<Component>Props`, colocated with the component.
- Shared API/domain types come from `packages/shared-types` — never re-declare enums or payload shapes locally.
- `import type` for types; absolute imports via `@/` alias, ordered: react/next → libs → `@/` → relative.

## Components

- Server Component by default; add `"use client"` at the lowest level that needs it (interactive leaf, not the page).
- One component per file; file kebab-case, export PascalCase. Small (<~150 lines) — split view vs logic (extract hooks) before it grows.
- No business logic in components: calculations belong in `lib/` or the backend. Frontend **displays** money/margins; it does not compute financial truth.
- Render money/carats/dates only through `lib/money.ts`, `lib/carat.ts`, `lib/dates.ts`.
- Lists come from `components/data-table/` wrapper — don't hand-roll tables per module.
- Gate UI with `<PermissionGate permission="sale.create">` (or `use-permissions`) — never `role === 'admin'` string checks.

## Styling

- Tailwind only; tokens from [design-system.md](design-system.md) via CSS variables — **no raw hex** in components (`bg-[#3fa393]` is a review reject; use `bg-primary`).
- shadcn/ui primitives in `components/ui/` are the base; restyle via tokens/variants, don't fork copies per module.
- Class order: layout → spacing → typography → color → effects. Use `cn()` helper for conditionals.
- No inline `style=` except truly dynamic values (chart coords, computed widths).
- Every interactive element: hover + focus-visible states per design system; respect `prefers-reduced-motion`.

## Data & effects

- All fetching via feature `queries.ts` hooks ([state-management.md](state-management.md)). No `fetch` in components, no `useEffect` data loading.
- `api-client` is the only place that knows base URL, auth header, and error envelope parsing.
- Handle every mutation's error by `error.code` — at minimum a toast; validation errors map to form fields.
- Loading = skeletons matching layout; empty = designed empty state (see ui-guidelines) — never a blank div.

## Files & naming recap

| Thing | Convention |
|---|---|
| Files/folders | kebab-case (`diamond-form.tsx`) |
| Hooks | `use-*.ts`, camelCase export |
| Query hooks | `use<Entity>List` / `use<Entity>` / `useCreate<Entity>` |
| Route folders | mirror API modules exactly |
| Tests | `*.test.tsx` next to source or in `tests/` mirror |

## Review reject-list (fast fails)

Raw hex colors · `any` · fetch in component · server data in Zustand · role string checks · unpaginated list render · float money math · "tenant/SaaS" words in `(dashboard)` UI · disabled-instead-of-hidden unpermitted nav.
