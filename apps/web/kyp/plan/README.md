# Development Plans (Frontend)

> Project-wide module roadmap lives at [`/kyp/plan/master-plan.md`](../../../../kyp/plan/master-plan.md) — module + phase plans (full-stack) live there. This folder is only for frontend-internal plans (refactors, spikes) that belong to no module.

One markdown file per planned piece of work. Naming: `NNN-short-slug.md` (e.g. `001-erp-shell-and-navigation.md`), numbered in intended build order (root ARCHITECTURE.md §24 is the master sequence).

Template:

```markdown
# NNN — Title
Status: draft | approved | in-progress | done
Depends on: NNN (frontend), api NNN (backend plan)

## Goal
What ships and how we know it works.

## Scope
- In:
- Out:

## Screens / components
Pages, feature components, shared components touched. Reference the demo page if one exists.

## API contract
Endpoints consumed; params per apps/api/kyp/pagination.md + filtering.md.

## Test plan
Component + E2E coverage (see ../testing.md).
```

Update status as work proceeds; when done, fold lasting decisions into [../decisions.md](../decisions.md) and archive the plan.
