# State Management

Four kinds of state, four homes. Don't mix them.

| Kind | Home | Examples |
|---|---|---|
| Server state | **TanStack Query** (`features/<m>/queries.ts`) | lists, documents, dashboards, notifications |
| URL state | **searchParams** | filters, sort, cursor/page, active tab |
| Session state | **Auth.js session** | user, companyId, branchId, role, permissions |
| Local UI state | `useState` / small **Zustand** stores | modals, sidebar collapse, POS cart draft |

No global "app store" duplicating server data. If it came from the API, it lives in Query cache only.

## TanStack Query conventions

Query keys — array form, module-scoped, filters object last:

```ts
['certified-diamonds', 'list', { ...filters, cursor }]
['certified-diamonds', 'detail', id]
['dashboard', 'company']        // vs ['dashboard', 'branch', branchId]
['notifications', 'unread-count']
```

- Each feature's `queries.ts` exports hooks: `useSaleList(filters)`, `useSale(id)`, `useCreateSale()`, etc. Components never call `api-client` directly.
- Defaults: `staleTime` 30s for lists, 5min for masters (customers, branches, categories); dashboards `refetchInterval` where live feel matters; notifications unread-count polled ~60s (`use-notifications`).
- Mutations invalidate the module's `['<module>', 'list']` + touched `detail` keys. Cross-module effects must be invalidated too — e.g. a sale invalidates `['inventory', ...]`, `['dashboard', ...]`, a transfer receive invalidates both branches' stock lists.
- Optimistic updates only for trivial, reversible things (mark notification read). Stock/money mutations are **never** optimistic — wait for the server, then invalidate; the backend is the source of truth for status machines.
- On 409 stock errors: invalidate the item's detail + list so the UI shows the real status immediately.

## URL as state (lists)

Filters/sort/pagination live in the URL (`useSearchParams` + router replace):
- shareable/bookmarkable views, survives refresh;
- matches backend contract (`apps/api/kyp/filtering.md` param names 1:1);
- filter change ⇒ drop `cursor`, back to first page;
- debounce free-text `search` (300ms, `use-debounce`) before it hits the URL/query key.

## Session & permissions

- `types/next-auth.d.ts` augments the session with `SessionPayload` fields (shared-types).
- `use-permissions` reads `session.permissions`; `has('purchase.view')` powers `permission-gate.tsx` and `config/navigation.ts` filtering. Never fetch permissions separately; the JWT is the source.
- Role/permission edits require re-login or token refresh to reflect — acceptable v1 behavior (backend ADR-004).

## Forms

React Hook Form + zodResolver. Form state stays in RHF — never mirrored into Zustand/Query. Server 400 `details` map to `setError(field, …)`. Multi-step flows (POS cart, transfer builder) keep a draft in a small Zustand store, cleared on success; treat drafts as disposable — never persist stock-reserving state client-side.

## What NOT to do

- No Redux; no context providers holding server data.
- No `useEffect`-fetches — Query hooks only.
- No caching permissions/branch lists in localStorage (stale scope = §19 leak risk).
- No component reading another feature's store; promote shared UI state or lift to URL.
