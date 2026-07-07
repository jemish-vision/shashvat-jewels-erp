# Frontend Architecture — Know Your Project (KYP)

> Platform source of truth: [`/ARCHITECTURE.md`](../../../ARCHITECTURE.md). This doc is the frontend-only working reference.

## What this app is

Next.js 15 (App Router) + TypeScript frontend for the ERP. It talks **only** to the Express API (`apps/api`) through the typed fetch wrapper `src/lib/api-client.ts` — no direct DB access, no Next API routes for business logic.

Three route groups = three experiences:

| Group | Who | Feel |
|---|---|---|
| `(auth)` | everyone | login (email + password only, §17), forgot password, reset password |
| `(super-admin)` | Super Admin | platform portal: companies, analytics, subscriptions |
| `(dashboard)` | tenant users | **a standalone company ERP** — see Tenant Illusion Rule below |

## Non-negotiable UX rules (root doc §19)

1. **Tenant Illusion:** tenant users never see "Tenant", "SaaS", "Workspace", "Multi-Tenant", plans, or any hint other companies exist. Company logo + name everywhere. Multi-tenant vocabulary lives only in `(super-admin)` and code.
2. **One login → one destination.** After auth, `middleware.ts` routes by session: Super Admin → platform dashboard; Company Admin → ERP dashboard; branch-scoped user → branch dashboard with the branch switcher locked. User never picks.
3. **Permission-driven UI.** Nav items, buttons, and report cards render only if the session holds the permission (`purchase.view` → Purchase menu). Hidden = absent from DOM, not disabled. Declared per item in `config/navigation.ts`, filtered by `use-permissions`, wrapped by `components/layout/permission-gate.tsx`. UI hiding is UX only — the API is the security boundary.

## Layers

```
app/            routes only — thin pages that compose feature components
features/<x>/   module UI: components/, queries.ts (server-state hooks), types.ts
components/     cross-module: ui/ (shadcn), layout/, data-table/, forms/, charts/, barcode/
hooks/          use-permissions, use-notifications, use-debounce, use-barcode-scanner
lib/            api-client, money, carat, dates, constants
config/         site, navigation (nav + permission map), env
middleware.ts   session → route-group guard + auto-redirect
```

Dependency direction: `app → features → components/hooks/lib`. Features never import from other features; shared things get promoted to `components/` or `lib/`.

## Data flow

- **Server state**: TanStack Query hooks in each feature's `queries.ts`, calling `api-client`. See [state-management.md](state-management.md).
- **Auth**: Custom auth context (`src/lib/auth-context.tsx`) — JWT stored in memory, refresh token in localStorage; `api-client` auto-attaches Bearer token from module-level var; session shape mirrors `SessionPayload` from `packages/shared-types`.
- **Errors**: `api-client` normalizes the backend envelope; components switch on `error.code` (catalog in `packages/shared-types/src/error-codes.ts`). Validation `details` map to form field errors.
- **Money/carats**: render via `lib/money.ts` / `lib/carat.ts` only — no ad-hoc `toFixed`.

## Server vs client components

Default to Server Components for layout and static chrome. Anything with interactivity, TanStack Query, forms, or barcode scanning is a Client Component (`"use client"` at the feature-component level, not the page level when avoidable).

## Related KYP docs

[project-structure.md](project-structure.md) · [coding-standards.md](coding-standards.md) · [design-system.md](design-system.md) · [ui-guidelines.md](ui-guidelines.md) · [state-management.md](state-management.md) · [testing.md](testing.md) · [decisions.md](decisions.md) · [plan/](plan/)
