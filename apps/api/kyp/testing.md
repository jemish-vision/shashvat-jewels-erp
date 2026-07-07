# Backend Testing

## Stack

| Layer | Tool |
|---|---|
| Unit + integration runner | Vitest |
| HTTP integration | Supertest against the Express `app` (no listen) |
| Test DB | PostgreSQL via docker-compose (separate `shashvat_test` database) |
| Data setup | factory helpers in `tests/factories/` (build on Prisma) |

Layout: `apps/api/tests/unit/`, `apps/api/tests/integration/`, `apps/api/tests/factories/`. Test files `*.test.ts` mirror source paths.

## What gets tested where

**Unit (no DB, fast):**
- Pure logic: money/carat math, `numbering.service` formatting, status-transition maps, `buildWhere` filter builders, cursor pagination slicing, error classes.
- Zod schemas: valid/invalid/boundary inputs per schema.

**Integration (real Postgres, real Prisma):**
- Every route happy path + main failure paths through the full middleware chain.
- **Tenant isolation** — the most important suite in the repo: seed two companies, assert company A's session can never read/write/count company B's rows on every module. A new module without an isolation test does not merge.
- **Branch scoping**: branch-scoped session cannot see other branches' inventory/sales/reports; client-sent `branchId` cannot widen scope.
- **RBAC**: missing permission → 403 with `PERMISSION_DENIED`; Super Admin on tenant route → 403.
- **Stock invariants**: any stock mutation produces exactly one matching `StockMovement` row in the same transaction; failed transaction leaves neither.
- **Money**: totals computed via Decimal — assert exact string equality (`"1234.56"`), never float closeness.
- **Audit**: mutating endpoints write the expected `AuditLog` row.

## Conventions

- Each integration test seeds its own data via factories; DB truncated between files (or per-test transactions rolled back). No shared fixtures mutated across tests.
- Never mock Prisma in integration tests. In unit tests, prefer extracting pure functions over mocking the client.
- Time-dependent logic (hold expiry, payment due) uses injected `now` / fake timers — jobs must be testable without waiting.
- Jobs tested by calling the job function directly, asserting created `Notification` rows.
- Coverage gate: services and middleware ≥ 80% lines; no gate on generated/bootstrap code.

## Commands

```
pnpm --filter api test           # all
pnpm --filter api test:unit
pnpm --filter api test:int       # spins up test DB (docker compose) + migrate deploy
```
