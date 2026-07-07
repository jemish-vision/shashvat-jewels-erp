# Pagination Standard (Backend)

Every list endpoint paginates. **Keyset (cursor) pagination is the default** — never `OFFSET` on large tables (root doc §15). Offset pagination is allowed only for small, bounded admin lists (< ~1k rows, e.g. branches, roles).

## Request

```
GET /api/sales?limit=25&cursor=cm3xk2...&sortBy=soldAt&sortDir=desc
```

| Param | Type | Default | Notes |
|---|---|---|---|
| `limit` | int 1–100 | 25 | clamp server-side, never trust client |
| `cursor` | string | — | opaque; the `id` of the last row of the previous page |
| `sortBy` | enum | module default | whitelisted per endpoint ([filtering.md](filtering.md)) |
| `sortDir` | `asc\|desc` | `desc` | — |

## Response envelope

```ts
// packages/shared-types/src/api.types.ts — Paginated<T>
{
  success: true,
  data: T[],
  pageInfo: {
    nextCursor: string | null,   // null = last page
    hasNextPage: boolean,
    // totalCount only where the UI truly needs "X of Y" and the table is small,
    // or as a separate cached/estimated count — never COUNT(*) per request on big tables.
    totalCount?: number
  }
}
```

## Prisma implementation pattern

```ts
const rows = await prisma.sale.findMany({
  where,                                   // filters + companyId (+ branchId if branch-scoped)
  orderBy: [{ [sortBy]: sortDir }, { id: sortDir }],  // id tiebreaker — REQUIRED
  take: limit + 1,                         // fetch one extra to detect next page
  ...(cursor && { cursor: { id: cursor }, skip: 1 }),
});
const hasNextPage = rows.length > limit;
const data = hasNextPage ? rows.slice(0, limit) : rows;
const nextCursor = hasNextPage ? data[data.length - 1].id : null;
```

Rules:

- **Always add `id` as sort tiebreaker** — cursor pagination breaks on non-unique sort columns without it.
- The sort column must be covered by an index that leads with `companyId` (root doc §15).
- Cursor is opaque to clients: today it's the row id; if it ever becomes composite, base64-encode a JSON tuple — clients must not parse it.
- Changing filters/sort invalidates the cursor; frontend restarts from page 1 (no cursor).
- `limit` hard cap 100. Export endpoints that need "everything" stream/batch server-side instead of raising the cap.

## UI mapping

Demo design shows "Rows per page 10/25/50 · 1–25 of 312". Map: rows-per-page → `limit`; range label from page position; `totalCount` supplied where cheap, otherwise UI shows "1–25" without total and relies on `hasNextPage`.
