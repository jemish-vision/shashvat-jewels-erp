# Master Implementation Plan — Shashvat Jewels ERP Platform

Module-wise roadmap for the whole project. Source of truth for **what gets built in what order**. Technical truth lives in [`/ARCHITECTURE.md`](../../ARCHITECTURE.md); app-level rules in `apps/api/kyp/` and `apps/web/kyp/`.

## Reality snapshot (2026-07-09)

Code audit revealed plan was stale. Key delta:
- **Module 02** (Super Admin) backend + frontend fully built — was marked `planned`, actually `in-progress` (test phase remaining).
- **Modules 03-14** (all tenant ERP) have DB schema + empty route/controller/page skeletons (0B files). No business logic written for any tenant module.
- Only Module 01 lib-level tests exist. No route/controller/integration/E2E tests for Module 02+ exist.
- Test factories: only `company.factory.ts` exists.
- Playwright E2E infrastructure not installed — `test:e2e` script will fail.

## How this plan works

- The project is split into **14 modules**, built in dependency order (derived from ARCHITECTURE.md §24).
- Every module is delivered in **phases**; the **last phase of every module is always Testing** (unit + integration + E2E for that module's flows). A module is not "done" until its testing phase passes.
- Each module gets a folder here: `kyp/plan/module-NN-<slug>/` containing:
  - `module-plan.md` — detailed module plan (created when the module is next up)
  - `phase-N-<slug>.md` — detailed phase plans, created one at a time as we reach them
- Statuses: `pending → scaffolded → planned → in-progress → done`. `scaffolded` = route/DB skeleton exists but no business logic. Update the table below as modules move.
- Most modules follow the same phase skeleton: **1) DB & services → 2) API endpoints → 3) Frontend UI → 4) Integration polish → 5) Testing.** Deviations noted per module.

## Module index

| # | Module | Depends on | Real status | Notes |
|---|--------|-----------|--------|-------|
| 01 | Foundation & Database Core | — | done ✓ | Full schema (54 models), shared-types, app skeleton, test harness |
| 02 | Super Admin Platform Portal | 01 | done ✓ | All phases complete. Unified Super/Tenant Login, auto Company Admin seeding, password toggle, custom confirm modal |
| 03 | Company Onboarding, Tenant Auth & RBAC | 02 | done ✓ | All phases complete: transactional onboarding seed, tenant isolation extension, mid-session suspension check, dynamic RBAC sidebar & tenant shell v1 |
| 04 | Tenant Masters & ERP Shell | 03 | scaffolded | Settings/customers/vendors routes empty. Web settings pages empty |
| 05 | Inventory Core & Certified Diamonds | 04 | scaffolded | Certified diamond routes/controller/schema empty. Web pages empty |
| 06 | Purchases | 05 | scaffolded | Route/controller empty. Web purchases pages empty |
| 07 | Sales (POS) | 05 | scaffolded | Route/controller empty. Web sales pages empty |
| 08 | Memo, Hold & Branch Transfers | 05 | scaffolded | Memo/hold/transfer routes empty. Web pages empty |
| 09 | Loose Diamonds & Packet Operations | 05 | scaffolded | Loose diamond routes empty. Web pages empty |
| 10 | Jewelry & Manufacturing | 09 | scaffolded | Jewelry/manufacturing routes empty. Web pages empty |
| 11 | Accounting | 06, 07 | scaffolded | Accounting routes/controller/service empty. Web pages empty |
| 12 | Reports, Analytics & Reconciliation | 06–11 | scaffolded | Report routes empty. Web pages empty |
| 13 | Notifications & Background Jobs | 06–08 | scaffolded | Notification/job files exist (0B). Web notification page empty |
| 14 | Hardening & Launch | all | pending | Not started |

---

## Module 01 — Foundation & Database Core

**Goal:** a bootable monorepo with the complete database schema, shared types, dev infrastructure, and test harnesses — everything later modules build on without schema churn.

Phases:
1. Monorepo scaffold (pnpm workspaces, TS/ESLint/Prettier, both apps boot)
2. Dev infrastructure (Docker: Postgres + MinIO; env management)
3. Full Prisma schema (all 53 tables, ARCHITECTURE.md §5–14) + initial migration
4. `packages/shared-types` (SessionPayload, ApiResponse/Paginated, error codes, enums)
5. App skeletons (Express: app.ts + error-handler + health; Next: fonts + design tokens + empty route groups)
6. **Testing** — Vitest harness both apps, integration DB setup

Detail: [module-01-foundation/module-plan.md](module-01-foundation/module-plan.md)

## Module 02 — Super Admin Platform Portal

**Goal:** platform layer working end to end — super admin can log in, create/suspend/delete companies, see platform dashboard.

Status: Phases 1-3 done ✓, Phase 4 (testing) in progress

Phases:
1. Backend: super admin auth (login, JWT `companyId:null`), `require-super-admin.ts`, `PlatformAuditLog` writes — **done**
2. Backend: company CRUD API + platform analytics endpoints — **done**
3. Frontend: `(auth)` login page (email+password only, §17) + `(super-admin)` shell, companies list/new/detail, platform dashboard — **done**
4. **Testing** — auth flows, company lifecycle, super-admin-only guard (tenant token → 403), E2E login → create company — **written** (46 unit tests pass, 53 integration tests need Postgres, 41 frontend tests pass, 7 E2E specs need full stack)

Detail: [module-02-super-admin/module-plan.md](module-02-super-admin/module-plan.md)

## Module 03 — Company Onboarding, Tenant Auth & RBAC

**Goal:** creating a company seeds a working tenant; tenant users log in through the same login page and land in the right place with the right permissions.

Status: done ✓ — detail: [module-03-tenant-auth-rbac/module-plan.md](module-03-tenant-auth-rbac/module-plan.md)

Phases:
1. Backend: `company.service.ts` onboarding transaction (base currency, main branch, system roles Company Admin + Branch Admin, permission matrix, CoA seed)
2. Backend: unified login resolution in `auth.service.ts` (§17.2: super_admins → users; branchId null/set), tenant JWT with flattened permissions, `tenant-scope.ts`, `require-permission.ts`, Prisma tenant extension
3. Frontend: auto-redirect by session (§17.3) in `middleware.ts`, `use-permissions` + `permission-gate.tsx`, session augmentation
4. **Testing** — the tenant-isolation harness becomes mandatory here (two seeded companies, cross-access denied everywhere); RBAC 403s; E2E: three logins → three destinations, branch switcher locked for branch admin

## Module 04 — Tenant Masters & ERP Shell

**Goal:** the ERP looks and navigates like the approved demo; Company Admin can manage branches, users, roles, customers, vendors, currencies.

Phases:
1. Backend: CRUD APIs — branches, users (+ branch admin assignment), roles/permissions, customers, vendors, currencies + exchange rates, number sequences, media upload (MinIO)
2. Frontend: ERP shell per design system (sidebar 272px, header, notification bell placeholder, permission-filtered navigation, dashboards skeleton per role §19.2)
3. Frontend: settings screens (branches, users, roles matrix, currencies, sequences) + customers/vendors modules (list per data-table standard, forms)
4. **Testing** — Company Admin vs Branch Admin capability matrix (§18) enforced; masters CRUD integration; E2E: create branch → create branch admin → that user sees only their branch; tenant-illusion word scan (§19.1)

## Module 05 — Inventory Core & Certified Diamonds

**Goal:** the inventory backbone (InventoryItem supertype + StockMovement ledger + barcode) proven on the first item type, with the demo's inventory list/detail UI.

Phases:
1. Backend: `stock-movement.service.ts` (single writer, $transaction invariant), `numbering.service.ts`, `barcode.service.ts` (company-prefixed Code 128)
2. Backend: certified diamonds CRUD + list (pagination/filtering contract from `apps/api/kyp/`), search endpoint, media attach, OPENING_STOCK movements
3. Frontend: certified diamonds module — list (filter grid, quick-view chips, status badges, kebab actions), new/edit forms, detail page with movement timeline, barcode label print, scanner input
4. **Testing** — ledger invariant suite (every status change = exactly one movement row, atomically); barcode uniqueness per company; filter/pagination contract tests; E2E: add diamond → appears filtered → print label

## Module 06 — Purchases

**Goal:** full purchase lifecycle: entry → approval → receive (creates inventory + PURCHASE_IN) → returns, with import costs and landed cost.

Phases:
1. Backend: purchase entry + status machine (DRAFT → PENDING_APPROVAL → APPROVED → RECEIVED), charges, landed-cost allocation, receive step creating InventoryItems atomically, purchase returns
2. Frontend: purchases module — list, multi-line entry form, approval queue, receive flow, returns
3. **Testing** — status transition matrix (invalid transitions 422); receive atomicity (items + movements + audit in one transaction); currency freeze (exchangeRate/baseTotal); E2E purchase-to-stock

## Module 07 — Sales (POS)

**Goal:** POS flow from barcode scan to printed invoice with payments and returns/exchange.

Phases:
1. Backend: sale creation (scan/search → cart), stock checks in-transaction (409 stock errors), discount approval flow, payments + allocation, sales returns & exchange linkage, `costAtSale` freeze
2. Backend: invoice numbering + PDF generation
3. Frontend: POS screen (scanner-first UX), discount approval queue, invoice view/print, returns/exchange flow, payment recording
4. **Testing** — concurrency: same item sold twice → exactly one succeeds; discount permission gating; margin math (Decimal exact); payment status transitions; E2E scan → sell → invoice PDF → stock SOLD

## Module 08 — Memo, Hold & Branch Transfers

**Goal:** the three "stock out but not sold" flows, all on the movement service.

Phases:
1. Backend: memos (issue/partial return/convert-to-sale), holds (place/release/expire), transfers (send → in-transit → receive/reject) with branch scoping both ends
2. Frontend: memos module, holds board, transfers module (send/receive with acknowledgement)
3. **Testing** — item state exclusivity (can't memo a held item, etc. — full state matrix); transfer visibility limited to sender/receiver branches; memo → sale conversion keeps history; E2E per flow

## Module 09 — Loose Diamonds & Packet Operations

**Goal:** parcel/packet inventory with carat-level operations: split, merge, weight adjustments.

Phases:
1. Backend: parcels + packets CRUD, split/merge services (SPLIT_OUT/IN, MERGE_OUT/IN movements, carat conservation), weight adjustments, availableCarats tracking
2. Frontend: loose diamonds module — packet list/detail, split & merge wizards, adjustments log
3. **Testing** — carat conservation property tests (split/merge totals always balance, Decimal exact); partial-carat sales/memos; E2E split → sell one child packet

## Module 10 — Jewelry & Manufacturing

**Goal:** jewelry catalog + manufacturing jobs consuming loose stock and producing jewelry pieces.

Phases:
1. Backend: jewelry categories (tree) + pieces CRUD; manufacturing jobs (issue materials → MANUFACTURING_ISSUE, returns + wastage, complete → output JewelryPiece linkage)
2. Frontend: jewelry module (catalog, categories), manufacturing module (job board, issue/return forms, completion)
3. **Testing** — consumption math (issued = returned + wastage + consumed); output piece carries manufacturing lineage; E2E job lifecycle

## Module 11 — Accounting

**Goal:** double-entry backbone with auto-posting from documents, payment allocation, ledgers and statements.

Phases:
1. Backend: chart of accounts, journal entries (balanced-lines invariant), `accounting-posting.service.ts` auto-journals from sales/purchases/payments
2. Backend: payments + allocations (against invoices/purchases), account ledgers, trial balance, P&L, balance sheet, aging
3. Frontend: accounting module — CoA tree, journals, payments, ledger drill-down, statements
4. **Testing** — every journal balances (property test); every financial document produces its expected journal; allocation cannot exceed due; statement totals reconcile with ledger

## Module 12 — Reports, Analytics & Reconciliation

**Goal:** movement-ledger-powered reports and dashboards, report permission scoping (§23), stock reconciliation.

Phases:
1. Backend: report endpoints (stock, sales, purchases, aging, fast/slow/dead stock, consumption) — all branch-scope-forced per §23; export (CSV/PDF) with audit logging (§22 Export)
2. Backend + Frontend: dashboards per role (§19.2) with real data (charts per design system)
3. Frontend: reports module + stock reconciliation flow (start → count → variance → resolve)
4. **Testing** — branch admin sees only branch reports (including "no company aggregates" §23); export audit rows; reconciliation variance math; report numbers cross-checked against seeded ledger fixtures

## Module 13 — Notifications & Background Jobs

**Goal:** §20 delivered: in-app notification center + the six event types + cron jobs + preferences.

Phases:
1. Backend: `notification.service.ts` + Notification/NotificationPreference/StockAlertRule endpoints; event hooks in existing services (approval pending, transfer received)
2. Backend: cron jobs — hold-expiry, memo-expiry, stock-low (alert rules), payment-due; channel dispatch (email first; WhatsApp/SMS behind preference flags)
3. Frontend: notification bell (badge + dropdown), notifications page, preferences settings, stock alert rules UI
4. **Testing** — each job fires on seeded fixtures with fake clock; branch scoping of recipients; preference matrix respected; E2E: hold expires → bell shows → link opens hold

## Module 14 — Hardening & Launch

**Goal:** production readiness.

Phases:
1. Security pass — full RBAC/isolation audit, optional Postgres RLS net, rate limiting, secrets review, dependency audit
2. Performance — index verification against real query plans (§15), slow-query log review, connection pooling, load test on inventory/sales lists
3. Ops — backups, migrations runbook, seed/demo data polish, logging + correlation ids, monitoring/alerts
4. **Testing** — full E2E regression across modules 02–13, accessibility scan on key pages, UAT script for the business

---

## Cross-cutting rules (apply to every module)

- Testing phase gates the module — no starting the next module's frontend against an untested API.
- Every backend list endpoint follows `apps/api/kyp/pagination.md` + `filtering.md` from day one.
- Every module adds its tenant-isolation + RBAC integration tests (backend `testing.md`).
- Every frontend module follows the design system tokens — demo pages are the visual acceptance bar.
- Decisions made during a module → the relevant `decisions.md` (ADR), then the phase file is archived.
