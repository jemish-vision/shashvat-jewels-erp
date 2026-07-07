# Module 01 — Foundation & Database Core

Status: done ✓
Depends on: — (first module)
Master: [../master-plan.md](../master-plan.md)

## Goal

A bootable monorepo where: both apps start, the **entire** database schema exists (all 53 tables — later modules never force schema rework, per ARCHITECTURE.md's design promise), shared types compile across apps, dev infra runs in one command, and the test harness is proven with real passing tests. Nothing user-visible ships; everything after this stands on it.

## Scope

- In: workspace scaffold, tooling, Docker dev infra, full Prisma schema + migration + seed skeleton, shared-types package, Express/Next bootstraps, test harnesses.
- Out: any business endpoint, any real UI, auth logic (Module 02/03), design-system components (Module 04 builds the shell; here only tokens land in `globals.css`).

---

## Phase 1 — Monorepo scaffold

1. pnpm workspaces: root `package.json` + `pnpm-workspace.yaml` covering `apps/*`, `packages/*`.
2. Root TS base config (`tsconfig.base.json`): strict, path alias strategy; each app extends it.
3. ESLint + Prettier shared config at root (single source; apps consume). Scripts: `lint`, `format`, `typecheck` runnable from root via `pnpm -r`.
4. `apps/web`: Next.js 15 App Router init (TS, Tailwind, `src/` layout as in ARCHITECTURE.md §3) — boots to a placeholder page.
5. `apps/api`: Express + TS init (`tsx` dev runner, `tsc` build) — boots and listens.
6. `.gitignore`, `README.md` (run instructions), editorconfig.

**Done when:** `pnpm install` at root, `pnpm -r typecheck && pnpm -r lint` pass, both apps start.

## Phase 2 — Dev infrastructure

1. `docker-compose.yml`: PostgreSQL 16 (volume, healthcheck) + MinIO (S3-compatible media store) — as specified in root tree. Separate `shashvat_test` database created for integration tests.
2. `.env.example` complete: `DATABASE_URL`, `TEST_DATABASE_URL`, `JWT_SECRET`, `MINIO_*`, `NEXT_PUBLIC_API_URL`, ports. `config/env.ts` (web) and api env loader validate with Zod at boot — fail fast on missing vars.
3. Root scripts: `pnpm dev` (compose up + both apps), `pnpm db:migrate`, `pnpm db:seed`, `pnpm db:studio`.

**Done when:** fresh clone → copy env → `pnpm dev` gives a running stack.

## Phase 3 — Full Prisma schema + initial migration

1. Multi-file schema under `apps/api/prisma/schema/` exactly per ARCHITECTURE.md:
   - `schema.prisma` (datasource, generator, **all enums** §5 incl. NotificationType/NotificationChannel)
   - `platform.prisma` (§6) · `core.prisma` (§7 incl. AuditLog with branchId) · `inventory.prisma` (§8) · `purchase.prisma` (§9 incl. paymentDueDate) · `sales.prisma` (§10 incl. dueDate) · `memo-hold-transfer.prisma` (§11) · `manufacturing.prisma` (§12) · `accounting.prisma` (§13) · `notifications.prisma` (Notification, NotificationPreference, StockAlertRule) · StockMovement (§14)
2. Verify every tenant table: `companyId` present, every index leads with `companyId`, `@@map` snake_case names match §4 table inventory (53 tables).
3. `prisma migrate dev --name init` → single clean initial migration.
4. `prisma/seed.ts` skeleton: one super admin, one demo company shell, global `Permission` catalog rows (resource × action list drafted here — first pass of the permission matrix), base currency. (Full onboarding seeding is Module 03; this seed just makes the DB non-empty for dev.)
5. `db/prisma.ts` singleton + empty `db/tenant-extension.ts` stub (real filter logic in Module 03).

**Done when:** `migrate dev` from empty DB succeeds; `prisma studio` shows 53 tables; seed runs idempotently.

## Phase 4 — packages/shared-types

1. `session.types.ts` — `SessionPayload` (§1.3).
2. `api.types.ts` — `ApiResponse<T>`, `Paginated<T>` + `PageInfo` (must match `apps/api/kyp/pagination.md` envelope exactly).
3. `error-codes.ts` — initial catalog: `VALIDATION_ERROR`, `UNAUTHENTICATED`, `PERMISSION_DENIED`, `TENANT_SCOPE_VIOLATION`, `NOT_FOUND`, `STOCK_NOT_AVAILABLE`, `INSUFFICIENT_CARATS`, `INVALID_STATUS_TRANSITION`, `DUPLICATE_ENTRY`, `INTERNAL`.
4. `enums.ts` — re-export Prisma enums needed by web (or mirrored const objects — decide and record as ADR in `apps/api/kyp/decisions.md`).
5. Both apps import it; build order wired in workspace.

**Done when:** `import { SessionPayload } from '@shashvat/shared-types'` compiles in web and api.

## Phase 5 — App skeletons

Backend:
1. `app.ts` — middleware stack order fixed now: json/cors/logging → (auth slots reserved) → routers → `error-handler.ts`.
2. `lib/errors.ts` — the four ApiError classes (§21) + `error-handler.ts` producing the standard envelope with correlation id; unknown errors → 500 generic.
3. `GET /health` (DB ping). Logger with request correlation id.
4. Empty route modules mounted (`auth.routes.ts` etc. returning 501) so URL space is fixed early.

Frontend:
5. `globals.css` — **all design tokens from `apps/web/kyp/design-system.md`** as CSS variables; Inter + Material Symbols loaded; Tailwind config mapped to tokens.
6. Route groups `(auth)`/`(super-admin)`/`(dashboard)` with minimal layouts (empty shells, correct backgrounds) + placeholder pages.
7. `lib/api-client.ts` — typed fetch wrapper: base URL from env, JSON, parses `ApiResponse`/error envelope into typed `ApiError`; auth-header slot reserved.
8. shadcn/ui initialized; `lib/money.ts`, `lib/carat.ts`, `lib/dates.ts` implemented with `decimal.js` (these are pure and fully testable now).

**Done when:** web renders a token-styled placeholder; api serves `/health`; api-client can call it from a page.

## Phase 6 — Testing (module gate)

1. **API harness:** Vitest config (unit + integration projects); integration setup connects `TEST_DATABASE_URL`, runs `migrate deploy`, truncation between files; Supertest wired against `app` (no listen). Factory folder started (`companyFactory`, `userFactory`).
2. **Web harness:** Vitest + RTL + jsdom; MSW server with handlers built from shared-types; Playwright installed with a boot smoke test.
3. **Real tests proving the harness:**
   - unit: `money.ts` (rounding, Decimal exactness — `0.1 + 0.2` class of cases), `carat.ts`, error classes → envelope mapping
   - integration: `/health` 200; error-handler envelope shape for each of the four error classes; seed idempotency
   - web: api-client parses success + error envelopes; a token exists smoke (CSS var present)
4. Coverage reporting wired (gates activate from Module 03 when logic exists).
**Done when:** a deliberately broken money test fails our test harness (harness proven).

---

## Deliverables checklist

- [x] `pnpm dev` full stack from fresh clone
- [x] 53 tables migrated, seed runs
- [x] shared-types consumed by both apps
- [x] Error envelope + four error classes live behind `/health`-only API
- [x] Design tokens in `globals.css` matching design-system.md
- [x] API tests: 17 unit + 8 integration passing
- [x] Web test harness: 18 tests (unit + MSW api-client + CSS tokens)
- [ ] ESLint config not yet installed — deferred to Module 02

## Risks / notes

- Schema is the whole point — review it against ARCHITECTURE.md §4–14 line by line before `migrate dev`; renaming tables later is the expensive mistake this module exists to prevent.
- Prisma multi-file schema requires the `prismaSchemaFolder` preview feature (or concatenation step) — verify with current Prisma version at implementation time; record outcome as ADR.
- Permission catalog (resource × action) drafted in seed here becomes the §19.3 navigation contract — keep the list in one exported constant in shared-types so web and api never diverge.
- ESLint was never wired in Phase 1 — `lint` scripts stubbed as echo. Install and configure in Module 02.
