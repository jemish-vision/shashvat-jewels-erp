# Backend Decisions (ADR Log)

Append-only. One entry per architectural decision. Format:

```
## ADR-NNN: Title
Date · Status (Accepted | Superseded by ADR-NNN)
Context → Decision → Consequences
```

---

## ADR-001: Shared-schema multi-tenancy by `companyId`
2026-07-07 · Accepted

**Context:** Platform hosts many jewelry companies; options were DB-per-tenant, schema-per-tenant, shared schema.
**Decision:** Single PostgreSQL DB, shared schema, mandatory `companyId` FK on every tenant table, enforced by middleware + Prisma Client Extension; optional RLS as hard net.
**Consequences:** Cheap onboarding and ops; isolation depends on code discipline → mandatory tenant-isolation tests per module ([testing.md](testing.md)); every index leads with `companyId`.

## ADR-002: Class Table Inheritance for inventory
2026-07-07 · Accepted

**Context:** Three item kinds (certified, loose packet, jewelry) share lifecycle, transactions reference "an item".
**Decision:** One `InventoryItem` supertype + 1:1 detail tables; all transaction lines FK `InventoryItem.id`.
**Consequences:** One FK pattern everywhere; detail read needs a join; a detail row must match `itemType` (validated in services).

## ADR-003: Append-only `StockMovement` ledger with a single writer
2026-07-07 · Accepted

**Context:** Stock history, aging, traceability, and race-free status changes needed.
**Decision:** Every stock change writes a ledger row inside the same `$transaction`, only via `stock-movement.service.ts`. Current state lives on `InventoryItem.status`.
**Consequences:** Full traceability + analytics from one table; discipline required — no direct status updates anywhere else.

## ADR-004: JWT carries scope; identity resolved server-side at login
2026-07-07 · Accepted

**Context:** Login must be email+password only (root doc §17); client must not choose company/role/branch.
**Decision:** `auth.service.ts` resolves super admin vs tenant user from DB; JWT embeds `companyId`, `branchId`, `role`, flattened `permissions[]`.
**Consequences:** Simple stateless authz; permission changes require re-login/refresh to take effect (acceptable; force-refresh on role edit is a future option).

## ADR-005: Keyset pagination as default
2026-07-07 · Accepted

**Context:** Inventory and ledger tables grow unbounded; OFFSET degrades linearly.
**Decision:** Cursor pagination with `id` tiebreaker as the standard list contract ([pagination.md](pagination.md)); offset allowed only for tiny admin lists.
**Consequences:** Stable performance; no "jump to page N" — UI uses infinite/next-prev pattern; totals optional.

## ADR-006: Single error envelope with fixed code catalog
2026-07-07 · Accepted

**Context:** Frontend must branch on failures reliably (root doc §21).
**Decision:** Four error classes (Validation/Permission/Stock/BusinessRule), stable `code` strings centralized in `packages/shared-types/src/error-codes.ts`.
**Consequences:** Frontend switches on `code`, never message text; adding an error = adding a code first.

## ADR-007: node-cron in-process jobs (no queue) for v1
2026-07-07 · Accepted

**Context:** Expiry/threshold checks are minute-level, low volume.
**Decision:** node-cron inside the API process; jobs are pure functions creating `Notification` rows.
**Consequences:** Zero infra; single-instance assumption — moving to multiple API instances requires a lock or extracting a worker (revisit then).
