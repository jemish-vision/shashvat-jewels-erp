# Frontend Testing

## Stack

| Layer | Tool |
|---|---|
| Unit / component | Vitest + React Testing Library + jsdom |
| API mocking | MSW (mock the Express API contract, incl. error envelope) |
| E2E | Playwright against web + api + test Postgres (docker) |

Layout: component tests colocated `*.test.tsx`; E2E in `apps/web/e2e/`.

## What gets tested where

**Unit (pure):** `lib/money`, `lib/carat`, `lib/dates` formatting; filter → searchParams serialization; navigation permission filtering logic.

**Component (RTL + MSW):**
- Feature components with queries: render list from mocked `Paginated<T>`, empty state, error state per `code` (validation → field errors; permission → toast; stock 409 → status refresh).
- `PermissionGate` / sidebar: item renders with permission, is **absent from the DOM** without it (assert `queryBy... === null`, not visibility).
- Forms: Zod validation messages, submit disabled while pending, server 400 `details` mapped to fields.
- Data-table wrapper: sort/filter/page emit correct query params (contract with `apps/api/kyp/filtering.md`).
- Test user-visible behavior via roles/labels — no snapshot tests, no testing implementation details (hook internals, class names).

**E2E (Playwright) — the flows that matter:**
1. **Login & auto-redirect** (§17): super admin → platform dashboard; company admin → ERP; branch admin → branch dashboard, branch switcher locked.
2. **Tenant illusion** (§19.1): logged in as tenant, assert forbidden words ("Tenant", "SaaS", "Workspace", "Multi-Tenant") never appear in `(dashboard)` pages.
3. **Permission visibility**: user without `purchase.view` sees no Purchase menu and direct URL `/purchases` is blocked.
4. Core business path: purchase receive → item appears in inventory → POS sale by barcode → invoice → stock status SOLD.
5. Memo/hold/transfer happy paths; notification bell shows event.

E2E seeds through the API/seed script, never through UI-only setup. Each run gets a fresh company to keep tests independent.

## Conventions

- MSW handlers mirror real backend shapes from `packages/shared-types` — when the contract changes, handlers fail to compile, which is the point.
- Fixed clock for date-sensitive UI (aging, expiry chips).
- Accessibility smoke: RTL queries by role/label double as a11y checks; add `axe` scan on key pages in E2E.
- CI: unit + component on every push; E2E on PR to main.

```
pnpm --filter web test        # unit + component
pnpm --filter web test:e2e    # playwright (starts api + db)
```
