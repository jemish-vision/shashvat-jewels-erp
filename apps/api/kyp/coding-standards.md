# Backend Coding Standards

## TypeScript

- `strict: true`, no `any` (use `unknown` + narrowing). No `@ts-ignore` without a comment explaining why.
- Explicit return types on exported functions and all service methods.
- `import type` for type-only imports.
- Async everywhere; never mix callbacks/`.then` chains with `await`.

## Layer discipline

- **Route files**: wiring only — path, middleware chain, controller method. Zero logic.
- **Controllers**: `req` in, response out. Validate with the Zod schema, call one service method, return. No Prisma, no business rules.
- **Services**: all business logic. Accept plain typed params (not `req`). Throw typed errors from `lib/errors.ts`; never send responses.
- **Session access**: read `companyId`/`branchId`/`permissions` from the verified session middleware attached — never from body/query/headers.

## Data rules (root doc §16, non-negotiable)

1. Money/carats are **never** `number` floats in computation — use `decimal.js` / Prisma `Decimal`. `Decimal(14,2)` money, `Decimal(12,3)` carats, `Decimal(14,6)` rates.
2. Every tenant query carries `companyId` (extension enforces reads; writes must set it explicitly).
3. Financial documents freeze `exchangeRate` + `baseTotal` at write time.
4. Soft delete (`deletedAt`) on business records; never hard-delete anything that touched money or stock.
5. Stock mutations only via `stock-movement.service.ts` inside `prisma.$transaction`.
6. Status transitions validated in services against an explicit allowed-transitions map, not ad-hoc `if`s.
7. Audit writes for Create/Update/Delete/Approval in the same transaction (`audit.service.ts`).

## Validation & errors

- Every mutating endpoint has a Zod schema in `src/schemas/`. Parse with `safeParse`; on failure throw `ValidationError` with field details.
- Throw only classes from `lib/errors.ts`. Error `code` values come from `packages/shared-types/src/error-codes.ts` — add new codes there first.
- Never leak Prisma errors, SQL, stack traces, or other tenants' existence in responses.

## Prisma

- Access only via `db/prisma.ts` singleton.
- Multi-step writes → `$transaction` (interactive form for read-then-write).
- `select`/`include` the fields you need on hot list endpoints; no unbounded `findMany` — always paginate ([pagination.md](pagination.md)).
- Schema changes: edit domain `.prisma` file → `prisma migrate dev --name <kebab-case-change>` → commit migration. Never edit applied migrations.

## Style

- ESLint + Prettier, no debates. 2-space indent, single quotes, semicolons.
- kebab-case filenames. One exported class/object of responsibility per service file.
- Comments only for non-obvious constraints (why, not what).
- No `console.log` — use the shared logger; include `companyId` + correlation id in log context.
