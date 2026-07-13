# Module 04 — Tenant Masters & ERP Shell

Status: completed (Customers, Vendors, Settings Hub, Currencies, Sequences, Uploads, UI theme & API paths shipped)
Depends on: Module 03 (Company Onboarding, Tenant Auth & RBAC)
Master: [../master-plan.md](../master-plan.md)

## Goal

Company Admin can manage every master the ERP needs before inventory exists: customers, vendors, currencies + exchange rates, number sequences, company settings (profile + logo via MinIO). The tenant shell reaches its "approved demo" bar: role-aware dashboard skeleton, working branch context, breadcrumbs, all lists on the shared data-table/filter/pagination standard. Modules 05+ then only add domain logic — never shell or master plumbing.

## Scope

- In: customers CRUD, vendors CRUD, currencies + exchange rates, number-sequence settings, company profile settings (name/address/logo — slug & admin email immutable), media upload service (MinIO) + `MediaFile` rows, tenant `audit.service.ts` (first real consumer), dashboards skeleton per role (§19.2), settings screens, customers/vendors screens, Module 04 test gate.
- Out: consuming sequences for document numbers (`numbering.service.ts` — Module 05), any inventory/stock logic (Module 05), pricing (`pricing.service.ts`), accounting effects of masters (Module 11), notification bell logic (Module 13 — placeholder stays), email delivery changes.

## Reality audit (2026-07-13) — what already exists

Module 03 overshot into Module 04 territory. Facts the plan below assumes:

| Area | State |
|---|---|
| Branches CRUD (`branches.routes/controller/service`) | ✅ Built + mounted at `/api/tenant/branches`, page at `/dashboard/branches` |
| Roles + permission matrix (`roles.*`, `/dashboard/roles`) | ✅ Built, incl. read-only matrix protection, `autoIncludeListPermissions` |
| Users (`team.*`, `/dashboard/sub-admins`) | ✅ Built (branch assignment, status toggle, RBAC-gated UI) |
| Dashboard stats (`dashboard.service.ts`, `/dashboard`) | ✅ Basic version exists |
| Permission catalog | ✅ `customer/vendor/currency/sequence/settings` resources already seeded (incl. `list` actions) |
| Nav config | ✅ `/dashboard/customers`, `/dashboard/vendors` entries exist with permissions |
| Prisma models | ✅ `Customer`, `Vendor`, `Currency`, `ExchangeRate`, `NumberSequence`, `MediaFile` all migrated |
| MinIO | ✅ In docker-compose; 🔴 `storage.service.ts` 0B, `uploads.routes/controller` 0B |
| Customers / vendors / settings API | 🔴 routes + controllers + services 0B; not mounted in `tenant.routes.ts` |
| `currency.service.ts` | 🔴 0B (base currency row exists from onboarding seed) |
| `audit.service.ts` | 🔴 0B — Module 03 wrote audit rows ad-hoc in auth; masters need the shared service (§22: same-transaction writes) |
| Web pages | 🔴 `/dashboard/customers|vendors` pages = "Under construction" stubs; no `/dashboard/settings` pages; `features/customers|vendors|settings` queries/types 0B |
| Branch switcher | 🟡 v1 static chip (Module 03); branches CRUD now exists so real switching is unblocked |
| Test factories | 🔴 only `company.factory.ts` + `tenant-fixture.ts`; no customer/vendor factories |

Decisions to record as ADRs during this module:
- **Master `code` generation**: `Customer.code` / `Vendor.code` are `@@unique([companyId, code])`. Decide: server auto-generates (`CUST-0001`, `VEND-0001` via `NumberSequence` keys) with no client override v1. Manual codes = support burden; sequences already exist.
- **Branch context for company admins**: switcher is a **client-side filter** (query param + context), never a JWT change. Branch admins stay locked (JWT `branchId` wins server-side, per filtering.md).
- **Logo/media storage**: direct upload through API (multer → MinIO) v1, presigned URLs deferred until large media (item photos, Module 05) demand it.

---

## Phase 1 — Backend: audit service + customers & vendors CRUD

1. **`audit.service.ts`** (blocking everything else): `writeAudit(tx, { companyId, branchId?, userId, action, entityType, entityId, before?, after? })` — accepts the transaction client so audit rows commit atomically with the mutation (§22). Used by every mutation from here on; retrofit branches/roles/team writes only if they currently skip it (verify, don't rewrite).
2. **Schemas** `customer.schema.ts`, `vendor.schema.ts`:
   - create/update bodies (Zod, strict) — name required; email/phone/taxId/addresses optional; `creditLimit` money-string → Decimal (customer); `currencyId`/`paymentTerms` (vendor).
   - list query per [filtering.md](../../../apps/api/kyp/filtering.md): `search` (name, code, phone, email), `type` (csv), `isActive`, `sortBy ∈ {createdAt, name, code}` + pagination params.
3. **Services** `customers.service.ts`, `vendors.service.ts` via `getTenantClient(companyId)`:
   - `list` (cursor pagination per [pagination.md](../../../apps/api/kyp/pagination.md), `buildWhere` pure + unit-testable, soft-deleted hidden by default)
   - `getById`, `create` (auto `code` from `NumberSequence` keys `customer`/`vendor`, in `$transaction` with audit row), `update` (code immutable), `softDelete` (sets `deletedAt`; never hard delete — rows may be referenced by future sales/purchases), `restore` optional-out.
   - status toggle (`isActive`) as part of update.
4. **Controllers + routes** behind `requirePermission('customer:*')` / `('vendor:*')`; mount `/customers`, `/vendors` in `tenant.routes.ts`.
5. Every mutation → tenant `AuditLog` row via `audit.service.ts` (CREATE/UPDATE/DELETE with before/after JSON).

**Done when:** curl matrix passes — create/list/filter/paginate/update/soft-delete both masters; duplicate handling safe (sequence retry); role without `customer:view` → 403 `PERMISSION_DENIED`; company A cannot touch company B rows.

## Phase 2 — Backend: settings, currencies & rates, sequences, uploads (MinIO)

1. **Settings** (`settings.routes/controller` + extend `tenant-company.service.ts`):
   - `GET /settings/company` — profile (name, address, phone, logoUrl, baseCurrency read-only, slug read-only).
   - `PATCH /settings/company` (`settings:update`) — name/address/phone/logoUrl only; slug + admin email rejected.
2. **Currencies** (`currency.service.ts` + routes):
   - CRUD currencies (`currency:*`); base currency: cannot delete/deactivate/unset `isBase`; one base per company invariant.
   - Exchange rates: `POST /currencies/:id/rates` (append; `@@unique([currencyId, effectiveDate])` upsert-by-day), `GET` rate history; latest-rate helper exported for Module 06/07 reuse.
3. **Sequences** (`GET /settings/sequences`, `PATCH /settings/sequences/:id` — prefix only; `lastValue`/`year` read-only from API). Seed default keys (`customer`, `vendor`, doc types) idempotently at onboarding + backfill for existing companies.
4. **Uploads**:
   - `storage.service.ts`: MinIO client from env, bucket-per-purpose (`logos`, `media`), `putObject` + public URL builder; fail fast at boot if env missing.
   - `uploads.routes/controller`: `POST /uploads` (multer memory, size/mime whitelist — images only v1) → MinIO → `MediaFile` row → `{ url, id }`. Permission: any authenticated tenant user with a mutating permission on target entity; logo path requires `settings:update`.
5. All mutations audited (same transaction).

**Done when:** company logo uploads end to end (file → MinIO → `logoUrl` persisted → served); currency + rate CRUD works with base-currency invariants enforced; sequences editable (prefix) and used by Phase 1 code generation.

## Phase 3 — Frontend: customers & vendors modules

1. `features/customers/` + `features/vendors/`: `types.ts`, `queries.ts` (`useCustomerList(filters)`, `useCustomer(id)`, `useCreateCustomer()`, … per [state-management.md](../../../apps/web/kyp/state-management.md) key conventions).
2. List pages (`/dashboard/customers`, `/dashboard/vendors`) per data-table standard: `FilterCard` + `CustomSelect` filters (search debounced 300ms, type, status), quick chips (All / Active / Inactive), `TablePagination` + `usePaginatedQuery`, filters in URL params 1:1 with API, kebab actions (View / Edit / Deactivate / Delete-danger with `useConfirm`).
3. Forms (`new`, `[id]/edit` or edit-in-detail): RHF + Zod mirroring backend schemas; money input via `lib/money.ts`; server 400 `details` → field errors; `value={field || ''}` fallbacks.
4. Detail pages: profile card + (empty-state) activity section placeholders for future sales/purchases lists.
5. All mutation buttons behind `PermissionGate`; list columns per ui-guidelines (identifier 13/700, code monospace muted, status badge).

**Done when:** browser flow — create customer → appears in filtered list → edit → deactivate → soft-delete via confirm modal; user without `customer:create` sees no Add button; direct POST still 403 (API-verified).

## Phase 4 — Frontend: settings screens + shell polish

1. `/dashboard/settings` (`settings:view` nav entry already gated): tabbed screens —
   - **Company profile**: name/address/phone + logo upload (drag-drop or file input → `POST /uploads` → preview → save); slug/email rendered read-only.
   - **Currencies**: list + add/edit modal, base badge, rate history drawer + add-rate form (date + rate, Decimal-safe input).
   - **Sequences**: table (key, branch, prefix editable, year, last value read-only).
2. **Branch context switcher v2**: company admin picks branch (or "All branches") from real branches list — stored in context + URL param, passed as `branchId` filter to dashboard/list queries. Branch admin: chip locked (unchanged). No JWT/session change.
3. **Dashboard skeleton per role (§19.2)**: stat cards + placeholder charts wired to `dashboard.service.ts` (extend with counts now available: customers, vendors, users, branches); company-wide vs branch-scoped variant driven by session/branch context.
4. Shell polish to demo bar: breadcrumbs in topbar (`Module › Page`), tenant logo from settings in sidebar/topbar (falls back to initial), section labels, empty/loading skeletons on all new pages.

**Done when:** settings tabs all functional in browser; logo appears in shell after upload; branch admin sees no Settings nav and locked chip; company admin switches branch context and dashboard numbers change.

## Phase 5 — Testing (module gate)

Backend unit:
- `buildWhere` builders (customers, vendors, currencies); Zod schemas boundary cases; code-generation formatting; base-currency invariant logic.

Backend integration (new factories: `customer.factory.ts`, `vendor.factory.ts`, `currency.factory.ts`):
- CRUD happy + failure paths per module through full middleware chain.
- **Capability matrix §18**: Branch Admin token → 403 on branches/users/roles/currencies/sequences/settings mutations; allowed on customers/vendors per matrix.
- **Tenant isolation** (two-company fixture): customers/vendors/currencies/sequences/uploads — read/update/delete/count cross-company all denied; create auto-injects `companyId`.
- Pagination/filtering contract tests on both list endpoints (cursor stability, limit clamp, unknown param 400).
- Audit: every mutation writes expected row in same transaction (induced failure → neither).
- Sequence concurrency: parallel creates → unique codes, no gap explosion (transaction-level test).
- Upload: mime/size rejection; `MediaFile` row written; foreign `companyId` in body ignored.

Frontend (RTL + MSW):
- lists render `Paginated<T>`, filters emit correct params, empty + error states; forms map 400 details; `PermissionGate` hides mutations (absent from DOM); settings tabs render per permission.

E2E (Playwright):
1. Company admin: create customer → list → edit → deactivate.
2. Branch admin: Settings absent from sidebar; direct `/dashboard/settings` bounced; customers still usable.
3. Logo upload → topbar/sidebar logo updates.
4. Tenant-illusion word scan over new pages (§19.1).

**Done when:** all green in CI; master table Module 04 → done.

---

## Deliverables checklist

- [x] `audit.service.ts` real and used by every Module 04 mutation
- [x] Customers + vendors CRUD (API + UI) on the shared list/filter/pagination standard
- [x] Auto `code` generation from `NumberSequence` (ADR recorded)
- [x] Currencies + exchange rates with base-currency invariants; latest-rate helper ready for Modules 06/07
- [x] Sequences visible/editable (prefix) in settings; defaults seeded + backfilled
- [x] MinIO `storage.service.ts` + uploads endpoint + `MediaFile` rows; company logo end to end
- [x] Settings screens (profile / currencies / sequences); slug + admin email immutable
- [x] Branch context switcher v2 (client-side filter; branch admins locked) — ADR recorded
- [x] Role-aware dashboard skeleton with real master counts
- [x] Factories + isolation/RBAC/capability-matrix/audit test suites green; E2E flows pass

## Risks / notes

- **Sequence-based codes under concurrency**: `NumberSequence.lastValue` increment must be atomic (`UPDATE … RETURNING` semantics via `$transaction` + `update` increment). Naive read-then-write duplicates codes under parallel creates — integration test covers this explicitly.
- **Soft-deleted masters with unique codes**: `@@unique([companyId, code])` includes deleted rows — a re-created "CUST-0001" collides. Sequence-generated codes never reuse values, so this is only a risk if manual codes sneak in later; note in ADR.
- `audit.service.ts` retrofit temptation: verify what branches/roles/team already write before touching them — scope here is masters only; a full retrofit belongs to Module 14 hardening if gaps exist.
- MinIO env vars differ dev/prod (public URL vs internal endpoint) — URL builder must come from config, not the client connection string, or logos break outside docker.
- Branch context switcher is a filter, not a security change — server keeps enforcing JWT `branchId`. Do not let dashboard endpoints trust the client-sent `branchId` for branch-scoped sessions (filtering.md rule already covers; test asserts it).
- Exchange-rate history grows unbounded but tiny (1 row/currency/day max) — no pagination needed v1; revisit if bulk imports appear.
