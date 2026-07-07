# Frontend Decisions (ADR Log)

Append-only. Same format as `apps/api/kyp/decisions.md`.

---

## ADR-001: Next.js App Router with three route groups
2026-07-07 · Accepted

**Context:** Three audiences (auth, super admin, tenant) with different shells and guards.
**Decision:** `(auth)` / `(super-admin)` / `(dashboard)` route groups, each with its own layout; `middleware.ts` enforces session → group mapping and auto-redirect (§17).
**Consequences:** Guards live in one place; tenant illusion (§19.1) is structural — super-admin vocabulary can't leak into the tenant shell.

## ADR-002: Express API is the only data source
2026-07-07 · Accepted

**Context:** Next.js could own API routes / server actions with direct DB access.
**Decision:** No business logic in Next; all data via `lib/api-client.ts` → Express. Server Components may call the same API server-side.
**Consequences:** One security boundary (backend middleware chain); frontend deploys independently; costs an extra hop, acceptable.

## ADR-003: TanStack Query for server state; no global store
2026-07-07 · Accepted

**Context:** ERP screens are 90% server data with caching/invalidations; Redux-style stores duplicate cache badly.
**Decision:** TanStack Query owns server state; URL owns filters; Zustand only for small UI/draft state ([state-management.md](state-management.md)).
**Consequences:** Invalidation discipline required after mutations (documented per-module in queries.ts); no store boilerplate.

## ADR-004: Tailwind + shadcn/ui with token-only colors
2026-07-07 · Accepted

**Context:** Demo design (`Shashvat Jewels ERP Design Improved v1`) approved as visual reference; needs faithful, consistent implementation.
**Decision:** Design tokens extracted into CSS variables ([design-system.md](design-system.md)); shadcn components restyled via tokens; raw hex in components banned.
**Consequences:** Reskinning/theming stays one-file cheap; PR review can mechanically reject hex literals.

## ADR-005: Permission-driven rendering via PermissionGate
2026-07-07 · Accepted

**Context:** §19.3 requires nav/actions hidden (absent) without permission; scattered `if` checks rot.
**Decision:** Single `use-permissions` hook + `permission-gate.tsx`; nav items declare permissions in `config/navigation.ts`.
**Consequences:** One tested code path for visibility; new modules must register nav + permission together; UI hiding remains UX-only — API enforces.

## ADR-006: Filters, sort, and cursor live in the URL
2026-07-07 · Accepted

**Context:** ERP users share views, refresh mid-work, and paginate large lists.
**Decision:** List state serialized to searchParams matching backend param names 1:1 (`apps/api/kyp/filtering.md`).
**Consequences:** Shareable/bookmarkable views; browser back works; query keys derive from URL, so cache aligns with what's visible.

## ADR-007: RHF + Zod with schemas mirroring backend
2026-07-07 · Accepted

**Context:** Validation must match backend exactly (§21: same-Zod-twice rule).
**Decision:** React Hook Form + zodResolver; field shapes sourced from shared types; backend remains source of truth.
**Consequences:** 400 responses map cleanly to field errors; drift between client and server validation is a bug, not a debate.
