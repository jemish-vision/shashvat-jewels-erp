# Shashvat Jewels ERP — Mandatory AI Agent & Developer Rules

This document defines critical architectural, RBAC, UI/UX, and authentication rules for this workspace. All future implementations, refactors, and feature additions MUST strictly follow these rules.

---

## 1. RBAC & Permission Matrix Synchronization

### 1.1 Permission Catalog & Route Alignment
- **Canonical Source of Truth**: All tenant permissions are defined in `PERMISSION_CATALOG` (`apps/api/src/lib/permissions.ts`).
- **1:1 Backend Route Validation**: Whenever a permission resource is defined or modified in `PERMISSION_CATALOG`, every backend endpoint in `apps/api/src/routes/tenant/*.routes.ts` MUST match the exact actions defined in the catalog.
- **Directory Listing GET Endpoints**:
  - Always use `requireAnyPermission('resource:list', 'resource:view')` on directory list endpoints (`GET /`) so that users with either `list` or `view` permissions can load the directory without receiving `PERMISSION_DENIED`.
  - Example (`apps/api/src/routes/tenant/branches.routes.ts`):
    ```ts
    router.get('/', requireAnyPermission('branch:list', 'branch:view'), branchesController.list);
    ```

### 1.2 Frontend Navigation & Action Buttons
- **Sidebar & Navigation Check**: Every navigation item in `apps/web/src/config/navigation.ts` must declare its required permission (e.g. `branch:list`, `customer:list`, `vendor:list`), which is evaluated by `usePermissions()`.
- **Row-Level Action Buttons**:
  - In directory tables, action buttons (`Edit`, `Delete`, `Status Toggle`) must be conditionally rendered or disabled based on `usePermissions().has('resource:update')` and `'resource:delete'`.
  - **Mandatory Executive View Profile Modal (`<MdVisibility>`)**: Every directory list row MUST include a **View Profile (`<MdVisibility>`) eye button** as its first action button. Clicking this button opens a structured Executive Profile Card Modal displaying full entity details (Contact Info, Financials, Addresses, Notes), accessible even to users with read-only permissions.

---

## 2. UI/UX Design System & Table Standards

### 2.1 Directory Tables (Reference Implementation: `branches/page.tsx`)
All directory management tables (`Customers`, `Vendors`, `Branches`, etc.) MUST mirror the executive design system established in **Branch Management (`branches/page.tsx`)**:
- **No Logo/Initials Boxes**: Do NOT render colored circle/avatar boxes with initials in list rows.
- **Primary Code & Name Display**: Display the entity code as a crisp badge pill (`bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-extrabold text-primary`) directly alongside the bold entity name (`font-extrabold text-foreground`).
- **Location Pin Icon**: Render location/city fields with a clean pin icon (`<MdLocationOn size={14} className="text-text-muted flex-none" />`).
- **Sleek Status Switch**: Always use the smooth toggle switch pill (`bg-emerald-500` active / `bg-slate-300 dark:bg-slate-600` inactive) with descriptive title tooltips indicating current status and update permissions.
- **Square Action Cards**: Format action buttons (`View`, `Edit`, `Delete`) as bordered card squares (`h-7 w-7 rounded-lg border border-border bg-card text-text-secondary transition-colors`) with interactive hover states:
  - View & Edit: `hover:border-primary hover:bg-primary/10 hover:text-primary`
  - Delete: `hover:border-danger hover:bg-danger/10 hover:text-danger`

### 2.2 Form Fields & Dropdowns
- **Uniform Control Heights**: All form input fields, standard `<select>` elements, and custom dropdown components (`<CustomSelect>`) MUST have identical vertical height, rounded corners (`rounded-xl`), padding (`p-3`), and border styling (`border border-input bg-background`).

---

## 3. Multi-Tab Session & Authentication Persistence

### 3.1 Persistent Token Storage Across Tabs
- **Tab Isolation Mitigation**: Web browsers isolate `sessionStorage` strictly per tab. Storing auth session tokens exclusively in `sessionStorage` causes "Open link in new tab" or "Open link in new window" actions to fail with `UNAUTHORIZED`.
- **Mandatory `localStorage` Sync**:
  - Inside `apps/web/src/lib/auth-context.tsx` (`login()` and initial session load) and `apps/web/src/lib/api-client.ts` (token refresh rotation), always store `shashvat_refresh_token` in `localStorage`.
  - This ensures all browser tabs and newly opened windows share the authenticated session seamlessly.
