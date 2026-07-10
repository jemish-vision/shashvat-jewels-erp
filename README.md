# Shashvat Jewels — Cloud-Native Jewelry & Diamond ERP Platform

Shashvat Jewels is a state-of-the-art, multi-tenant enterprise resource planning (ERP) platform designed specifically for the jewelry and diamond manufacturing, trading, and retail industries.

## Technology Stack
- **Monorepo**: pnpm workspaces
- **Frontend (`apps/web`)**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, TanStack Query v5, Lucide / React Icons, Custom Glassmorphism UI Components
- **Backend API (`apps/api`)**: Node.js, Express, TypeScript, Prisma ORM, Zod validation, JWT Authentication (Unified access for Super Admins and Tenant Administrators)
- **Shared Types (`packages/shared-types`)**: Shared domain models and TypeScript interfaces

## Key Architecture & Features

### 1. Unified Authentication & Multi-Tenancy
- **Unified Login API (`POST /api/auth/login`)**: Supports authenticating both platform **Super Admins** (`super_admins`) and **Tenant Users / Company Admins** (`users`) seamlessly.
- **Automatic Role Routing**:
  - Super Admins are directed to `/` (Super Admin Control Panel).
  - Company Administrators and Tenant Users are directed to `/sales` (Tenant Operations Dashboard).
- **Automated Tenant Onboarding**:
  - Creating a company provisions default Headquarters (`HQ`) branch, default `Company Administrator` role with full permissions, and automatically seeds the initial Company Administrator user account.
  - Setting or updating an admin password hashes credentials via `bcrypt` and enables immediate login.
  - Read-only email address constraint after creation ensures tenant administrator identity integrity.

### 2. UI / UX Design Standards
- **Consistent Theme & Glassmorphism**: Tailored HSL color tokens (`primary`, `primary-light`, `background`, `card`, `border`, etc.).
- **Common Custom Confirm Modal (`E:\jemish\Sashvat jewels\source-code\apps\web\src\components\ui\confirm.tsx`)**:
  - All disruptive or irreversible actions (suspend company, delete company, delete records) MUST use `useConfirm()` custom dialog matching our design tokens rather than native browser alerts.
- **Password Visibility Inspection**: Eye toggle icons implemented across all password inputs (login form, company onboarding form, company password reset modal) for accuracy verification.

### 3. Super Admin Module (`Module 02`)
- **Dashboard Overview**: Metrics for Active, Trial, and Suspended companies, real-time audit trail widgets.
- **Company Management**:
  - Create company with automatic slug generation and instant admin user seeding.
  - Edit company name and manage admin password resets.
  - Status management (Suspending / Activating / Deleting companies) using custom modal dialogs.
- **Comprehensive Audit Trail**:
  - Tracks actions across Super Admin and Tenant activities (`LOGIN`, `CREATE_COMPANY`, `UPDATE_COMPANY`, `SUSPEND_COMPANY`, etc.).
  - Detailed Audit Log inspector (`/audit-log/[id]`) displaying before/after JSON diffs.

### 4. Tenant Authentication, RBAC & Tenant Shell (`Module 03`)
- **Mid-Session Scope Enforcement**:
  - Tenant sessions carry automatic cache-backed suspension checks (`COMPANY_SUSPENDED`), immediately blocking access within ≤60 seconds if a company account is suspended or cancelled.
- **Robust Multi-Tenant Data Isolation**:
  - Extended Prisma client (`db/tenant-extension.ts`) automatically injects `companyId` into all writes and enforces `where.companyId` on all database reads and updates.
- **Dynamic RBAC & Permission Catalog**:
  - Granular permission strings (`resource:action`, e.g., `sale:view`, `certified-diamond:view`) seeded globally and assigned to system and branch roles.
- **Tenant Shell v1 (`/dashboard`)**:
  - **Tenant Brand Illusion**: Displays tenant logo and company name in topbar and sidebar with zero platform administrative terminology.
  - **Permission-Filtered Sidebar**: Navigation menu items (`tenantNav`) are dynamically filtered based on logged-in user permissions.
  - **Branch Switcher Chip**: Indicates company-wide (`HQ`) vs. branch-scoped environment.

### 5. Access & Governance — Roles, Branches & User Management (`Module 04`)
- **Showrooms & Branch Directory (`/dashboard/branches`)**:
  - Provision and govern physical showrooms and branch locations with instant active/suspended status toggles.
  - Automatic exclusion of `HQ` from branch selection lists while maintaining HQ administrative supervision across all branches.
- **Granular Roles & Permission Matrix (`/dashboard/roles`, `/dashboard/roles/[id]`)**:
  - Interactive tabular Permission Matrix aligned with tenant sidebar module names (`Overview`, `Access & Governance`, `Diamond & Jewelry Catalog`, `Sales & CRM`, etc.).
  - **Automatic List Permission Granting (`autoIncludeListPermissions`)**: Assigning `create`, `update`, `delete`, or `view` on any resource automatically grants the corresponding `list` permission, ensuring consistent UI data access.
  - **Read-Only Matrix Protection**: Staff members with view-only permissions see a prominent **Read-Only** badge, hidden mutation buttons (`Toggle All Filtered`, `Edit Role`, `Delete Role`, `Save Permissions`), and disabled checkboxes.
- **User Management (`/dashboard/sub-admins`)**:
  - Provision company users assigned to specific Role Profiles and scoped to Headquarters or individual showrooms.
  - **RBAC UI & Backend Enforcement**: Frontend UI dynamically hides action controls (`Add Company User`, `Edit`, `Delete`, status toggles) via `usePermissions()`, while backend routes strictly enforce `requirePermission` and flexible `requireAnyPermission` middleware.

## Local Development Setup

1. **Install Dependencies**:
   ```bash
   pnpm install
   ```

2. **Database Setup**:
   Ensure PostgreSQL is running and `.env` is configured in `apps/api`.
   ```bash
   pnpm --filter @shashvat/api prisma:migrate
   ```

3. **Start Development Servers**:
   ```bash
   pnpm dev
   ```
   - Frontend Web App: `http://localhost:3000`
   - Backend API Server: `http://localhost:4000`
