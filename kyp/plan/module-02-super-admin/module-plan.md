# Module 02 — Super Admin Platform Portal

Status: planned
Depends on: Module 01 (Foundation)
Master: [../master-plan.md](../master-plan.md)

## Goal

The platform layer works end to end: a super admin logs in through the single login page (email + password only), lands on the platform dashboard, and can create, view, suspend, reactivate, and soft-delete companies — every action audited in `PlatformAuditLog`. This module also builds the **shared login page and JWT machinery** that Module 03 extends for tenant users.

## Scope

- In: super admin authentication, JWT issue/verify infrastructure, `require-super-admin` guard, company CRUD API + UI, platform dashboard (real counts, placeholder charts allowed), platform audit log, `(auth)` login page, `(super-admin)` shell per design system.
- Out: tenant login resolution and tenant seeding on company create (Module 03 — here creating a company just creates the `Company` row), subscriptions/billing logic (status + plan fields only), platform analytics beyond basic counts (Module 12 revisits).

---

## Phase 1 — Backend: auth foundation + super admin identity

1. `auth.service.ts` (first half):
   - `login(email, password)` → looks up `super_admins` (Module 03 adds the `users` fallback — design the function signature for that now, per §17.2 resolution order).
   - bcrypt password hashing (cost 12); constant-time comparison; identical error for wrong-email vs wrong-password (`INVALID_CREDENTIALS` — add to error-codes catalog).
   - On success: sign JWT with full `SessionPayload` — `{ userId, companyId: null, branchId: null, role: 'SUPER_ADMIN', permissions: [] }`; update `lastLoginAt`.
2. Token strategy (record as ADR in `apps/api/kyp/decisions.md`): short-lived access token (~15min) + refresh token (httpOnly cookie) with `/api/auth/refresh`; `/api/auth/logout` revokes refresh (in-memory/DB denylist v1).
3. `authenticate.ts` middleware: verify JWT → attach typed `req.session`; missing/expired → 401 `UNAUTHENTICATED`.
4. `require-super-admin.ts`: session must have `role === 'SUPER_ADMIN'` **and** `companyId === null`; otherwise 403 `PERMISSION_DENIED`.
5. Routes: `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me`. Zod schemas in `src/schemas/auth.schema.ts`.
6. Login/logout audit: write `PlatformAuditLog` rows for super admin LOGIN (success + failure with email+IP, no user link) and LOGOUT (§22).
7. Basic rate limit on `/api/auth/login` (per IP + per email) — brute-force guard now, not Module 14.
8. Seed: real super admin credentials from env (`SEED_SUPER_ADMIN_EMAIL/PASSWORD`) replacing Module 01 placeholder.

**Done when:** curl login → token → `GET /api/auth/me` returns session; wrong password → 401 envelope; audit rows visible.

## Phase 2 — Backend: company CRUD + platform endpoints

1. `companies.controller.ts` + `companies.routes.ts` under `/api/super-admin/*`, all behind `authenticate` + `require-super-admin`:
   - `GET /companies` — list per pagination/filtering contract (`apps/api/kyp/`): filters `status`, `search` (name, slug, email), sort `createdAt|name`; includes soft-deleted only with `includeDeleted=true`.
   - `POST /companies` — create: name, slug (auto-suggest from name, validate `^[a-z0-9-]+$`, unique), email/phone/address, baseCurrency, status (default TRIAL) + `trialEndsAt`, plan. Slug immutable after create (barcode prefix depends on it — §16 rule 13). *Tenant seeding hook left as explicit TODO for Module 03.*
   - `GET /companies/:id` — detail + counts (users, branches — zeros for now).
   - `PATCH /companies/:id` — edit profile fields; slug rejected.
   - `POST /companies/:id/suspend` / `POST /companies/:id/reactivate` — status machine: TRIAL|ACTIVE → SUSPENDED → ACTIVE; invalid transition → 422 `INVALID_STATUS_TRANSITION`.
   - `DELETE /companies/:id` — soft delete (`deletedAt`), only from SUSPENDED; CANCELLED status set.
2. Every mutation writes `PlatformAuditLog` (action, targetType `Company`, before/after JSON, IP).
3. `platform.routes.ts`: `GET /api/super-admin/dashboard` — company counts by status, recent companies, recent platform audit events. `GET /api/super-admin/audit-log` — paginated, filter by targetType/action.
4. Suspension enforcement hook: `authenticate.ts` (or tenant-scope, decide now) rejects tenant tokens whose company is SUSPENDED/CANCELLED with 403 `COMPANY_SUSPENDED` (new error code). Dead code until Module 03 tenant logins exist — but the check lands here so it's never forgotten.

**Done when:** full company lifecycle via curl: create → suspend → reactivate → suspend → delete, each audited; list filters/pagination pass contract tests.

## Phase 3 — Frontend: login page + super admin portal

1. `(auth)/login/page.tsx` — per §17.1 and design system: card on `--background` canvas, brand gradient logo tile, **email + password only**, no company/role/branch anything. Inline field errors (Zod), top-level error for `INVALID_CREDENTIALS`, submit pending state. `forgot-password` page: static "contact administrator" v1 (real reset flow deferred; note in decisions.md).
2. Auth wiring: Auth.js credentials provider calling `POST /api/auth/login`; JWT + session callbacks carry `SessionPayload`; `types/next-auth.d.ts` augmentation; `api-client` attaches access token, auto-refresh on 401 once, then sign-out.
3. `middleware.ts` (first version of §17.3): unauthenticated → `/login`; `role === 'SUPER_ADMIN'` → `/(super-admin)`; any other session → placeholder `/(dashboard)` (Module 03 completes); super admin hitting `(dashboard)` routes → redirected back.
4. `(super-admin)` shell: `super-admin-sidebar.tsx` (272px, design tokens — nav: Dashboard, Companies, Audit Log, Settings), topbar (breadcrumb + profile + logout). Super admin portal MAY use platform vocabulary — §19.1 restricts tenant UI only.
5. Companies feature (`features/super-admin/`):
   - `companies/page.tsx` — data-table per ui-guidelines: columns name, slug, status badge (TRIAL `--info`, ACTIVE `--success`, SUSPENDED `--warning`, CANCELLED `--neutral`), plan, created; filters (status, search); kebab actions View/Edit/Suspend/Reactivate/Delete (confirm dialogs stating consequence).
   - `companies/new/page.tsx` — `company-form.tsx` (RHF+Zod, slug auto-suggest with edit-before-create, uniqueness error mapped to field).
   - `companies/[id]/page.tsx` — profile card, status timeline from audit entries, danger zone (suspend/delete).
6. `(super-admin)/page.tsx` dashboard — stat cards (companies by status) per design system, recent companies table, recent audit feed.
7. Audit log page — paginated table, action/targetType filters.

**Done when:** full flow in browser: login → dashboard → create company → suspend → audit trail visible → logout.

## Phase 4 — Testing (module gate)

Backend unit:
- password hash/verify; JWT sign/verify/expiry; company status-transition map (valid + all invalid pairs); slug validation/suggestion.

Backend integration (Supertest + test DB):
- login: success, wrong password, unknown email (identical envelope), rate-limit 429, refresh rotation, logout revokes.
- guard matrix: no token / expired / (fabricated tenant-shaped token) against `/api/super-admin/*` → 401/403 correctly.
- company CRUD: create (dup slug → `DUPLICATE_ENTRY`), patch (slug rejected), suspend/reactivate/delete lifecycle, invalid transitions 422, soft-delete visibility rules.
- list endpoint passes shared pagination/filtering contract tests (cursor stability, limit clamp, unknown param 400).
- every mutation → expected `PlatformAuditLog` row (action, before/after).

Frontend component (RTL + MSW):
- login form: validation, pending state, `INVALID_CREDENTIALS` render; company form field errors from 400 details; companies table renders statuses/badges; confirm dialog gates suspend/delete.

E2E (Playwright):
1. login as super admin → platform dashboard (correct redirect §17.3).
2. create company → appears in list → suspend → status badge updates → audit log shows both actions.
3. invalid login stays on login page with error.
4. deep-link `/companies` unauthenticated → login → back to `/companies` after auth.

**Done when:** all green in CI; module status → done in master table.

---

## Deliverables checklist

- [ ] Login works for super admin end to end (browser)
- [ ] Company lifecycle CRUD + status machine, fully audited
- [ ] `require-super-admin` guard proven by tests
- [ ] Platform dashboard with real counts
- [ ] Auth infrastructure (JWT + refresh + middleware) reusable by Module 03 without rework
- [ ] Error codes added: `INVALID_CREDENTIALS`, `COMPANY_SUSPENDED`, `DUPLICATE_ENTRY` (in shared-types)

## Risks / notes

- **Design auth for two identity tables now** (§17.2) even though only `super_admins` is live — the login function's resolution order and JWT shape must not change in Module 03, only extend.
- Slug immutability matters early: barcodes embed it (`SASH-CERT-00001`); allowing rename later means barcode migration pain.
- Refresh-token storage choice (DB table vs in-memory) → ADR; in-memory dies on restart, acceptable for dev, note production path.
- Auth.js v5 + external Express JWT is the fiddliest integration in this module — timebox a spike; fallback is a thin custom session cookie handler around the same endpoints (record whichever wins as ADR).
