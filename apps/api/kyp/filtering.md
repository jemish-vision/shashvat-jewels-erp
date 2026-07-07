# Filtering & Sorting Standard (Backend)

Companion to [pagination.md](pagination.md). Applies to all list endpoints.

## Query parameter conventions

```
GET /api/certified-diamonds
  ?search=GIA-2141               # free text
  &shape=ROUND,OVAL              # enum, comma = IN
  &color=G&clarity=VS1           # exact enum match
  &caratMin=1.0&caratMax=2.5     # range pairs: <field>Min / <field>Max
  &status=IN_STOCK
  &branchId=...                  # ignored/overridden for branch-scoped sessions
  &createdFrom=2026-01-01&createdTo=2026-06-30   # date ranges: <field>From / <field>To
  &sortBy=caratWeight&sortDir=desc
```

Rules:

- Multi-value = comma-separated single param (`shape=ROUND,OVAL`), not repeated params.
- Ranges: numeric `Min`/`Max`, dates `From`/`To` (inclusive; dates are `@db.Date`-safe, compare at day granularity).
- Booleans: literal `true`/`false`.
- Unknown params → 400 `VALIDATION_ERROR` (strict Zod schema), not silently ignored — catches client typos early.

## Per-endpoint Zod filter schema

Every list endpoint defines its filter schema in `src/schemas/`:

```ts
export const certifiedDiamondListQuery = paginationQuery.extend({
  search: z.string().trim().max(100).optional(),
  shape: csvEnum(DiamondShape).optional(),      // helper: "A,B" → enum[]
  color: z.nativeEnum(DiamondColor).optional(),
  caratMin: z.coerce.number().positive().optional(),
  caratMax: z.coerce.number().positive().optional(),
  status: csvEnum(StockStatus).optional(),
  branchId: z.string().cuid().optional(),
  sortBy: z.enum(['createdAt', 'caratWeight', 'listPrice']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
}).strict();
```

- **`sortBy` is a whitelist enum per endpoint** — never pass client strings into `orderBy`. Every allowed value must be backed by an index leading with `companyId`.
- `search` targets a small, documented set of columns per module (e.g. certified diamonds: `stoneId`, `certificateNo`, `barcode`) using `OR` + `contains`/prefix on indexed columns. Free-text growth → Postgres `tsvector` (root doc §15).

## Building the Prisma `where`

One builder per module in the service, pure and unit-testable:

```ts
function buildWhere(f: CertifiedDiamondListQuery, session: SessionPayload): Prisma.InventoryItemWhereInput {
  return {
    companyId: session.companyId!,                        // always
    ...(session.branchId && { branchId: session.branchId }), // branch scope wins over f.branchId
    ...(f.status && { status: { in: f.status } }),
    ...(!f.status && { deletedAt: null }),                // default: hide soft-deleted
    certifiedDiamond: {
      ...(f.shape && { shape: { in: f.shape } }),
      ...(f.caratMin != null || f.caratMax != null
        ? { caratWeight: { gte: f.caratMin, lte: f.caratMax } } : {}),
    },
    ...(f.search && { OR: [ /* documented search columns */ ] }),
  };
}
```

Hard rules:

- `companyId` and (when present) session `branchId` are injected from the session **after** client filters — a client-sent `branchId` can never widen scope.
- Soft-deleted rows excluded by default; expose `includeDeleted=true` only on endpoints with an explicit permission.
- Saved views / quick tabs in the UI (demo: "Available", "On Hold" chips) are just presets of these same params — no separate API.
