# Development Plans (Backend)

> Project-wide module roadmap lives at [`/kyp/plan/master-plan.md`](../../../../kyp/plan/master-plan.md) — module + phase plans (full-stack) live there. This folder is only for backend-internal plans (refactors, migrations, spikes) that belong to no module.

One markdown file per planned piece of work. Naming: `NNN-short-slug.md` (e.g. `001-auth-and-rbac.md`), numbered in intended build order (root ARCHITECTURE.md §24 is the master sequence).

Template:

```markdown
# NNN — Title
Status: draft | approved | in-progress | done
Depends on: NNN, NNN

## Goal
What ships and how we know it works.

## Scope
- In:
- Out:

## Steps
1. ...

## Schema / API impact
Tables touched, new endpoints, error codes added.

## Test plan
Isolation, RBAC, invariants to cover (see ../testing.md).
```

Plans are working documents — update status as work proceeds; when done, fold lasting decisions into [../decisions.md](../decisions.md) and delete or archive the plan.
