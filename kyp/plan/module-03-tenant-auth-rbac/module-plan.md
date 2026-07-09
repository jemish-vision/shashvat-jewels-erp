# Module 03 — Company Onboarding, Tenant Auth & RBAC

Status: planned
Depends on: Module 02 (Super Admin Platform Portal)
Master: [../master-plan.md](../master-plan.md)

## Goal

Creating a company seeds a **complete working tenant** (currency, HQ branch, system roles with a real permission matrix, chart of accounts, admin user). Tenant users log in through the same login page, get a correctly-scoped JWT (`companyId` / `branchId` / flattened `permissions[]`), and land in the right shell. The tenant security stack — `tenant-scope.ts`, `require-permission.ts`, Prisma tenant extension — becomes real and proven, so Modules 04–13 can mount routes behind it without thinking.

## Scope

- In: permission catalog + seeding, onboarding transaction, tenant login/refresh/reset hardening, suspension enforcement mid-session, tenant Prisma extension rewrite, tenant AuditLog LOGIN/LOGOUT rows, frontend role-routing (`middleware.ts` per §17.3), minimal `(dashboard)` shell (sidebar + topbar + placeholder dashboard), `use-permissions` / `permission-gate` finalization, tenant-isolation test harness.
- Out: masters CRUD screens and full ERP shell polish (Module 04), any inventory/transaction logic (Module 05+), role-editor UI (Module 04 settings), email delivery for password reset (still console/dev-URL), WhatsApp/SMS anything.

## Reality audit (2026-07-09) — what already exists from Module 02

Module 02 built ahead of plan; Module 03 is **half wired, quarter correct**. Plan below assumes these facts:

| Area | State |
|---|---|
| Unified login (`auth.service.ts login()`) | ✅ Resolves `super_admins` → `users`, flattens `resource:action` permissions into JWT |
| `getSession()` | ✅ Handles both principals |
| Refresh (`auth.service.ts refresh()`) | 🔴 **Security bug**: re-mints every refreshed token as `role: 'SUPER_ADMIN', companyId: null` regardless of principal (line ~118). A tenant user who refreshes gets a super-admin-shaped token |
| `createCompany` seeding | 🟡 Seeds HQ branch + "Company Administrator" role + admin user, but: role has **zero permissions** (Permission table is empty, nothing ever seeds it); admin user gets `branchId = HQ` (branch-scoped — must be `null` per §17.2); no `$transaction`; no Branch Admin role, no base Currency row, no CoA; seeding skipped entirely when email/adminPassword absent |
| `tenant-scope.ts`, `require-permission.ts` | 🟡 Exist, minimal, **wired to nothing** (app.ts mounts only auth + super-admin routes) |
| `db/tenant-extension.ts` | 🔴 Creates `new PrismaClient()` per call (connection leak); scopes only `findUnique/findFirst/findMany`; does **not** inject `companyId` on create, does not scope update/delete/count/aggregate; used nowhere |
| Forgot/reset password | 🟡 Super admins only; tenant emails silently no-op |
| Web `middleware.ts` | 🟡 Only checks cookie presence — no role → route-group mapping (§17.3) |
| Web `(dashboard)` group | 🔴 No `layout.tsx`, no root page; all pages 0B. `tenant-sidebar.tsx`, `branch-switcher.tsx`, `session-provider.tsx` stubs. `use-permissions`, `permission-gate.tsx`, `config/navigation.ts` tenantNav exist |
| Route collision | 🔴 `(super-admin)/page.tsx` owns `/`; tenantNav points Dashboard at `/` too — Next.js can't have both. Tenant dashboard needs its own URL (decision below) |
| Tests | Factories: only `company.factory.ts`. No tenant-isolation harness |

Two doc inconsistencies to settle as ADRs in this module:
- **Permission string format**: code emits `resource:action` (§1.3 example agrees); §19.3 example shows `purchase.view`. → Standardize on **colon** everywhere; nav config uses colon.
- **Tenant email uniqueness**: schema is `@@unique([companyId, email])` but §17.2 login resolution requires email to identify exactly one user globally. → Add **global unique** on `users.email` (+ reject emails already in `super_admins`).

---

## Phase 1 — Backend: permission catalog + onboarding transaction

1. **Permission catalog** — `src/lib/permissions.ts`, single source of truth:
   - `PERMISSION_CATALOG`: array of `{ resource, action }`. Resources × actions:
     - `branch`, `user`, `role`, `currency`, `sequence`, `settings` — `view/create/update/delete` (settings: `view/update`)
     - `customer`, `vendor` — `view/create/update/delete`
     - `inventory`, `certified-diamond`, `loose-diamond`, `jewelry` — `view/create/update/delete` (+ `inventory:adjust`)
     - `purchase` — `view/create/update/delete/approve/receive`
     - `sale` — `view/create/update/delete`, `sale:discount-approve`, `sale:return`
     - `memo` — `view/create/return/convert`; `hold` — `view/create/release`
     - `transfer` — `view/create/receive`; `manufacturing` — `view/create/update/complete`
     - `accounting` — `view/create/update`; `payment` — `view/create`
     - `report` — `view/export`; `audit` — `view`; `notification` — `view/manage`
   - `COMPANY_ADMIN_PERMISSIONS` = full catalog. `BRANCH_ADMIN_PERMISSIONS` = subset per §18.2 (sales, purchases, memos, holds, transfers, manufacturing, customers, vendors, inventory view, `report:view`, `notification:view` — **no** branch/user/role/currency/sequence/settings/audit).
   - Unit-testable invariants: no duplicates; branch subset ⊆ full; every `permission` string in `config/navigation.ts` exists in the catalog (shared via a small JSON or duplicated constant checked in tests).
2. `syncPermissionCatalog(tx)` — idempotent upsert of global `permissions` rows (`@@unique([resource, action])` already exists). Called from `prisma/seed.ts` and defensively at API boot.
3. **Default chart of accounts** — `src/lib/default-coa.ts`: template tree (Assets → Cash/Bank/Inventory/Receivables; Liabilities → Payables/Taxes; Equity; Income → Sales/Other; Expenses → COGS/Operating/Wastage), `isSystem: true`, stable codes (`1000`, `1100`, …). Validated by unit test (unique codes, parents exist).
4. **`onboardCompanySeed(tx, company, adminInput?)`** in `company.service.ts` — runs inside one `prisma.$transaction` with company creation:
   - base `Currency` row from `company.baseCurrency` (`isBase: true`)
   - HQ branch (`code: 'HQ'`)
   - `Company Admin` role (isSystem) + full `RolePermission` matrix; `Branch Admin` role (isSystem) + subset matrix
   - CoA seed from template
   - admin `User` **with `branchId: null`** when email + adminPassword provided — otherwise everything else still seeds unconditionally
5. Refactor `updateCompany` admin-password path to reuse the same helpers (no more ad-hoc role/branch creation; created user gets `branchId: null`).
6. **Backfill script** `scripts/backfill-tenant-seed.ts` for companies created before this module: sync catalog, attach matrix to existing "Company Administrator" roles, create missing Branch Admin role / Currency / CoA, flip existing admin users `branchId → null`. Run once per environment; idempotent.
7. `prisma/seed.ts`: seed demo company through the real onboarding path + one branch admin user (`branchId = HQ`) for manual testing and E2E.
8. Platform audit unchanged (CREATE_COMPANY already logged); add `after` snapshot noting seeded role/branch ids.

**Done when:** `POST /api/super-admin/companies` → one transaction produces company + currency + branch + 2 roles (with expected permission counts) + CoA + admin user (`branchId: null`); induced mid-seed failure leaves zero rows.

## Phase 2 — Backend: tenant auth hardening + RBAC middleware chain

1. **Fix refresh escalation (P0)**: refresh must re-resolve the principal from DB (`getSession(userId)`-style) and mint the token with the *current* scope + permissions — never a hardcoded payload. Store principal type alongside the refresh record. Side benefit: role edits propagate at next refresh (≤15 min), which becomes the documented permission-propagation story (extend ADR-004).
2. **Login hardening** in `auth.service.ts`:
   - distinct failure codes: `INVALID_CREDENTIALS` (unknown email / wrong password — identical envelope), `ACCOUNT_DISABLED` (user `isActive: false`), `COMPANY_SUSPENDED` (company SUSPENDED / CANCELLED / deleted)
   - tenant `AuditLog` LOGIN rows — success and failure (failure: email + IP, no user link, §22); LOGOUT row on logout. Fire-and-forget appends.
   - verify Module-02 login rate limit actually exists; add per-IP + per-email limiter if missing.
3. **Email uniqueness migration**: global unique index on `users.email` (keep `@@unique([companyId, email])` or drop — decide in migration); pre-migration duplicate check; user-creation paths reject emails present in `super_admins`. ADR.
4. **Mid-session suspension enforcement**: `tenant-scope.ts` looks up company status (in-memory 60s TTL cache keyed by companyId — one query per company per minute) → 403 `COMPANY_SUSPENDED`. ADR: cache-based enforcement, ≤60 s staleness accepted.
5. `tenant-scope.ts` also attaches typed `req.companyId` / `req.branchId` for downstream handlers; keeps 403 for `companyId: null` sessions.
6. `require-permission.ts` unchanged in shape; add `enforceBranchScope(session, requestedBranchId?)` helper in `src/lib/` — branch-scoped session may never widen to another branch (utility consumed from Module 04 on; unit-tested now).
7. **Rewrite `db/tenant-extension.ts`**:
   - extend the shared `prisma` singleton via `$extends` (no `new PrismaClient()`); cache extended clients per `companyId` (Map)
   - inject `companyId` into `create`/`createMany`/`upsert` data; add `where.companyId` on every read **and** `update/updateMany/delete/deleteMany/count/aggregate/groupBy`
   - explicit skip list only for the platform models + `Permission` (global)
   - export `getTenantClient(companyId)`; tenant controllers use it exclusively.
8. `/api/auth/me` augmentation: include `companyName`, `branchName` (and `companyLogoUrl`) for the tenant shell — no extra endpoint needed.
9. **Forgot/reset password for tenant users**: extend both functions to fall through to `users` (global-unique email makes lookup safe); reset transaction updates the right table; same anti-enumeration response either way.
10. Mount the tenant chain in `app.ts`: `app.use('/api/tenant', authenticate, tenantScope, tenantRouter)` where `tenant.routes.ts` is the aggregator Modules 04+ plug into. Include one real probe route now — `GET /api/tenant/company` (own company profile, needs `settings:view`) — so the full chain is exercised end to end by tests.

**Done when:** curl matrix passes — tenant refresh keeps tenant scope; super-admin token on `/api/tenant/*` → 403; tenant token on `/api/super-admin/*` → 403; suspend company → that tenant's next request 403 `COMPANY_SUSPENDED` (≤60 s); reset-password works for a tenant user.

## Phase 3 — Frontend: session routing + tenant shell v1

1. **Route decision (ADR)**: `/` stays the super-admin dashboard (`(super-admin)/page.tsx`); tenant dashboard lives at **`/dashboard`** (`(dashboard)/dashboard/page.tsx`). Update `tenantNav` Dashboard href. Login redirect: `SUPER_ADMIN → /`, tenant → `/dashboard` (replaces current `/sales` redirect from README-era Module 02).
2. **`middleware.ts` full §17.3**: cookie carries a scope hint (`session-scope=platform|tenant`, set at login/refresh alongside `auth-token`) so Edge middleware can route without JWT verification: unauthenticated → `/login`; tenant session hitting super-admin paths → `/dashboard`; super admin hitting tenant paths → `/`. Defense-in-depth only — API remains the security boundary.
3. **Session augmentation**: `AuthUser` + `companyName`/`branchName` from `/me`; `session-provider.tsx` implemented (wraps AuthProvider consumption for server-component-free shell parts).
4. **`(dashboard)/layout.tsx` — tenant shell v1** (design-system tokens; full polish is Module 04):
   - `tenant-sidebar.tsx`: 272px, renders `tenantNav` filtered through `use-permissions` — item without matching `view` permission is **absent from DOM** (§19.3)
   - topbar: company name + logo (tenant illusion §19.1 — no platform vocabulary anywhere), user chip, logout
   - `branch-switcher.tsx` v1: company admin sees "All branches" static chip; branch admin sees own branch name, visibly locked (real switching lands with Module 04 masters)
5. `(dashboard)/dashboard/page.tsx` placeholder: welcome card + role-aware subtitle (company-wide vs "<Branch> branch"), stat-card skeletons per design system.
6. `use-permissions`: add `hasAny` / `hasAll`; finalize `permission-gate.tsx` (children render only when permission held).
7. `api-client.ts`: map 403 `COMPANY_SUSPENDED` → force logout + login-page banner "Your account is currently unavailable. Please contact support." (no multi-tenant wording).
8. Forgot-password page copy already principal-agnostic — verify flow with a tenant email end to end.

**Done when:** three seeded logins in the browser land correctly: super admin → `/` (platform shell), company admin → `/dashboard` (all nav groups, "All branches"), branch admin → `/dashboard` (Settings absent from sidebar, branch chip locked); deep-linking across groups bounces per §17.3.

## Phase 4 — Testing (module gate)

Backend unit:
- catalog invariants (no dupes; branch ⊆ full; nav permissions ⊆ catalog); CoA template validity; `enforceBranchScope` matrix; refresh payload shape per principal type.

Backend integration (Supertest + test DB; new factories: `user.factory.ts`, `role.factory.ts`, `branch.factory.ts`):
- onboarding: full seed assertions (row counts, admin `branchId: null`, permission counts per role); forced mid-transaction failure → nothing persisted; backfill script idempotency.
- login matrix: super admin / company admin / branch admin / suspended company (`COMPANY_SUSPENDED`) / cancelled / inactive user / wrong password (envelope identical to unknown email); tenant LOGIN/LOGOUT audit rows written.
- **refresh regression (the escalation bug)**: tenant refresh → token still `companyId` set, correct role, fresh permissions after a role-permission edit; super admin refresh unchanged.
- guard matrix: no token / expired / tenant token on `/api/super-admin/*` / super-admin token on `/api/tenant/*` → 401/403 with correct codes.
- **tenant-isolation harness (mandatory from here per testing.md)**: seed two companies; via `getTenantClient` + the probe route assert company A can never read/update/delete/count company B rows; `create` auto-injects `companyId`; client-sent foreign `companyId`/`branchId` in bodies is ignored/rejected.
- mid-session suspension: suspend → tenant request 403 after cache TTL (fake timers).
- `require-permission`: role without `settings:view` → 403 `PERMISSION_DENIED` on probe route.

Frontend (RTL + MSW):
- sidebar renders only permitted groups/items (absent, not disabled); `permission-gate` show/hide; login redirect per role; suspended-company banner on forced logout.

E2E (Playwright):
1. three logins → three destinations (§17.3), correct shell each.
2. branch admin: Settings absent; direct `/settings` URL entry → bounced.
3. super admin suspends company → tenant user's next navigation lands on login with the unavailable-account message.
4. tenant-illusion word scan on tenant pages: "tenant", "SaaS", "workspace", "multi-tenant" never rendered (§19.1).

**Done when:** all green in CI; master table Module 03 → done.

---

## Deliverables checklist

- [ ] Permission catalog seeded globally; both system roles carry correct matrices
- [ ] Onboarding is one transaction: currency + HQ + roles + CoA + admin (`branchId: null`); backfill run for existing companies
- [ ] Refresh-token escalation bug fixed and regression-tested
- [ ] `COMPANY_SUSPENDED` enforced at login **and** mid-session
- [ ] Tenant Prisma extension rewritten (singleton-based, create-inject, full operation coverage) and used by the probe route
- [ ] Global-unique tenant email migration + cross-table (super_admins) guard
- [ ] Forgot/reset password works for tenant users
- [ ] §17.3 routing in `middleware.ts`; tenant shell v1 with permission-filtered sidebar
- [ ] Tenant-isolation + RBAC harness established (factories, two-company fixture) for all future modules
- [ ] ADRs recorded: permission string format (colon), tenant email global uniqueness, suspension-cache enforcement, refresh re-resolution, `/dashboard` route split

## Risks / notes

- **Fix refresh escalation first** — it is exploitable the moment any tenant user exists. It can ship as a standalone patch before the rest of Phase 2.
- Global email uniqueness is a data migration on a live table shape (`@@unique([companyId, email])` → global). Any existing cross-company duplicate blocks the migration — backfill script must detect and report before migrating.
- `$extends` returns a new client wrapper per call; without the per-company cache map you recreate query engines under load. Cache is bounded by company count — fine.
- Permission catalog grows with later modules — additions are append-only upserts; **removals/renames need a migration note** (stale strings live inside issued JWTs until refresh).
- The `/` vs `/dashboard` split deviates from nav config and §17.3's implied grouping; ADR keeps it explicit. Revisit only if marketing wants a public landing page at `/`.
- Suspension cache (60 s TTL) trades one query/company/minute against instant lockout; if instant lockout becomes a requirement, swap to a checked-every-request flag without changing the middleware contract.
- Branch switcher is deliberately v1-static — real branch switching needs branches CRUD (Module 04); locking behavior for branch admins is still fully testable now.
