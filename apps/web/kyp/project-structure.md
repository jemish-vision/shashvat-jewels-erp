# Frontend Project Structure

Full tree in root [`ARCHITECTURE.md`](../../../ARCHITECTURE.md) §3. "Where does X go" cheat sheet for `apps/web/`.

```
apps/web/
+-- kyp/                         # project knowledge + plans (you are here)
+-- src/
    +-- app/
    |   +-- (auth)/              # login, forgot-password
    |   +-- (super-admin)/       # platform portal (companies CRUD, settings)
    |   +-- (dashboard)/         # tenant ERP — one folder per module
    |       certified-diamonds/ loose-diamonds/ jewelry/ purchases/ sales/
    |       memos/ holds/ transfers/ manufacturing/ customers/ vendors/
    |       accounting/ reports/ reconciliation/ notifications/ settings/
    +-- features/<module>/       # components/, queries.ts, types.ts per module
    +-- components/
    |   +-- ui/                  # shadcn/ui primitives — generated, tweak via tokens
    |   +-- layout/              # sidebars, topbar, branch-switcher, notification-bell,
    |   |                        # permission-gate, page-header
    |   +-- data-table/          # TanStack Table wrapper (server pagination/sort/filter)
    |   +-- forms/               # RHF + zod field primitives
    |   +-- charts/              # Recharts wrappers themed to design system
    |   +-- barcode/             # barcode-label (bwip-js), scanner-input
    +-- hooks/                   # use-permissions, use-notifications, use-debounce, use-barcode-scanner
    +-- lib/                     # api-client, money, carat, dates, constants
    +-- types/                   # index.ts
    +-- config/                  # site.ts, navigation.ts (nav+permission map), env.ts
    +-- middleware.ts            # route-group guard + auto-redirect (§17/§19)
```

## Placement rules

| You are writing… | It goes in… |
|---|---|
| A page | `app/(group)/<module>/.../page.tsx` — thin: fetch shell + compose feature components |
| Module-specific component | `features/<module>/components/` |
| Component used by 2+ modules | promote to `components/` (right subfolder) |
| Server-state hook (fetch/mutate) | `features/<module>/queries.ts` |
| Generic hook (no module knowledge) | `hooks/` |
| Pure formatting/calc helper | `lib/` |
| New nav entry | `config/navigation.ts` **with its required permission** |
| Types shared with backend | `packages/shared-types` — never redefine locally |

## Conventions

- Files/folders kebab-case; components PascalCase exports.
- Route segments follow module names exactly (they mirror API route modules).
- Dynamic segments: `[id]`, nested detail actions as folders (`[id]/edit`).
- Feature `queries.ts` exports hooks named `use<Entity>List`, `use<Entity>`, `useCreate<Entity>`, etc. Query keys: [state-management.md](state-management.md).
- No `features/a` importing `features/b`. No page importing another page.
