# Backend Project Structure

Full tree lives in root [`ARCHITECTURE.md`](../../../ARCHITECTURE.md) §3. This is the "where does X go" cheat sheet for `apps/api/`.

```
apps/api/
+-- kyp/                       # You are here — project knowledge + plans
+-- prisma/
|   +-- schema/                # Multi-file Prisma schema, one file per domain
|   |   schema.prisma          #   datasource + generator + shared enums
|   |   platform.prisma        #   SuperAdmin, Company, PlatformAuditLog
|   |   core.prisma            #   User, Role, Permission, Branch, Customer, Vendor, Currency, AuditLog...
|   |   inventory.prisma       #   InventoryItem + detail tables, StockMovement
|   |   purchase.prisma / sales.prisma / memo-hold-transfer.prisma
|   |   manufacturing.prisma / accounting.prisma / notifications.prisma
|   +-- migrations/
|   +-- seed.ts                # super admin, demo company, roles, permissions, CoA
+-- src/
    +-- index.ts               # bootstrap + listen
    +-- app.ts                 # middleware stack + router mounting
    +-- middleware/            # authenticate, tenant-scope, require-super-admin,
    |                          # require-permission, error-handler
    +-- routes/
    |   +-- auth.routes.ts
    |   +-- super-admin/       # companies, platform
    |   +-- tenant/            # one file per module: sales.routes.ts, memos.routes.ts...
    +-- controllers/           # mirrors routes/ — thin: validate → service → respond
    +-- services/              # business logic; *.service.ts per concern
    +-- db/                    # prisma.ts singleton, tenant-extension.ts
    +-- jobs/                  # node-cron jobs, *.job.ts
    +-- schemas/               # Zod input schemas, *.schema.ts
    +-- lib/                   # money.ts, carat.ts, errors.ts, constants.ts
```

## Placement rules

| You are writing… | It goes in… |
|---|---|
| New endpoint for existing module | that module's `routes/tenant/<module>.routes.ts` + controller |
| New module (e.g. gift cards) | new routes + controller + service + Zod schema file, same names |
| Business rule / status transition | the domain service, never the controller |
| Anything touching stock status/carats/branch | `stock-movement.service.ts` call inside `$transaction` |
| New table | the matching domain `.prisma` file; new domain → new file, register in root doc §4 table inventory |
| Reusable pure helper (money, dates) | `src/lib/` |
| Input validation shape | `src/schemas/<entity>.schema.ts`, exported for reuse in tests |
| Cross-app type (enums, error codes, API envelope) | `packages/shared-types/src/` — never duplicate in web and api |

## Naming (root doc §16)

- Routes `noun.routes.ts`, controllers `noun.controller.ts`, services `verb-noun.service.ts` or `noun.service.ts`, jobs `noun.job.ts`, schemas `entity.schema.ts`.
- Prisma models PascalCase singular; tables snake_case plural via `@@map`; columns camelCase.
- Document numbers: `PREFIX-BRANCH-YEAR-SEQ` via `numbering.service.ts`.
