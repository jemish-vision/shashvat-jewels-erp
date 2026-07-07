# Backend Architecture — Know Your Project (KYP)

> Source of truth for the whole platform: [`/ARCHITECTURE.md`](../../../ARCHITECTURE.md). This doc is the backend-only working reference.

## What this server is

Express.js + TypeScript + Prisma + PostgreSQL API server for a **multi-tenant jewelry ERP**. One shared database, tenant isolation by `companyId` on every tenant table (root doc §1–2). Serves two API surfaces:

- `/api/super-admin/*` — platform layer (company CRUD, platform analytics). Guarded by `require-super-admin.ts`.
- `/api/*` (tenant) — the full ERP: inventory, purchases, sales, memo/hold/transfer, manufacturing, accounting, reports, notifications. Guarded by `tenant-scope.ts` + `require-permission.ts`.

## Request lifecycle

```
Request
  → authenticate.ts        verify JWT → attach SessionPayload to req.session
  → tenant-scope.ts        reject companyId:null on tenant routes; pin companyId
  → require-permission.ts  RBAC check against session.permissions
  → route → controller     parse/validate input (Zod schema from src/schemas/)
  → service                business logic, status machines, $transaction
  → Prisma (+ tenant-extension.ts auto-injects { companyId } on reads)
  → error-handler.ts       any thrown ApiError → standard envelope (§21 root doc)
```

Layering rules:

- **Controllers** never touch Prisma directly. Parse, validate, call service, shape response.
- **Services** own business logic and transactions. One service per domain concern.
- **All stock mutations** go through `stock-movement.service.ts` inside `$transaction` — the only writer of `StockMovement` (root doc §14). No exceptions.
- **All audit writes** go through `audit.service.ts` — same transaction as the mutation for Create/Update/Delete/Approval (root doc §22).

## Auth (root doc §17)

Login is email + password only. `auth.service.ts` resolves identity server-side:

1. `super_admins` lookup → Super Admin JWT (`companyId: null`).
2. `users` lookup → tenant JWT; `branchId` null = Company Admin, set = branch-scoped.

Company/role/branch are **never accepted from the client**.

## Tenant + branch scoping

- `companyId` from JWT injected into every query (middleware + Prisma Client Extension in `db/tenant-extension.ts`).
- Branch-scoped sessions (`branchId` set) additionally get a forced `branchId` filter on branch-scoped resources (inventory, sales, reports…). The frontend hiding things is UX; **this layer is the security boundary**.

## Background jobs (`src/jobs/`, node-cron)

| Job | Purpose |
|---|---|
| `hold-expiry.job.ts` | expire/warn holds (§20) |
| `memo-expiry.job.ts` | overdue memos |
| `stock-low.job.ts` | evaluate `StockAlertRule` thresholds |
| `payment-due.job.ts` | `Sale.dueDate` / `Purchase.paymentDueDate` overdue |
| `aging-snapshot.job.ts` | stock aging analytics snapshot |

Jobs create `Notification` rows via `notification.service.ts`, then dispatch channels per `NotificationPreference`.

## Error model (root doc §21)

Single envelope, stable `code` from `packages/shared-types/src/error-codes.ts`. Four throwable classes in `src/lib/errors.ts`: `ValidationError` (400), `PermissionError` (403), `StockError` (409), `BusinessRuleError` (422). Everything else → 500 with correlation id, no internals leaked.

## Related KYP docs

- [project-structure.md](project-structure.md) — where files live
- [coding-standards.md](coding-standards.md)
- [pagination.md](pagination.md) · [filtering.md](filtering.md) — list endpoint contract
- [testing.md](testing.md)
- [decisions.md](decisions.md) — ADR log
- [plan/](plan/) — development plans
