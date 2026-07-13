# Shashvat Jewels ERP — Architecture & Database Design

**Stack:** Next.js 15 (App Router, Frontend) · Express.js (Backend API) · TypeScript · PostgreSQL · Prisma ORM

This document is the single source of truth for the project folder architecture and database design.

The system is a **multi-tenant SaaS ERP Platform**. A single platform hosts multiple independent jewelry companies. A **Super Admin** manages the platform and all company tenants. Each company (tenant) gets its own fully isolated ERP — including its own users, branches, stock, transactions, accounting, and RBAC — with zero data leakage between tenants.

Every module described in the project scope (Certified Diamonds, Loose Diamonds, Jewelry, Sales, Purchases, Memo, Hold, Branch Transfers, Manufacturing, Accounting, CRM, Barcode, Analytics) maps to a concrete place in the folder tree and a concrete set of tables below.

---

## Table of Contents

1. [Platform Overview & Tenancy Model](#1-platform-overview--tenancy-model)
2. [Core Design Principles](#2-core-design-principles)
3. [Folder Architecture](#3-folder-architecture)
4. [Database Design — Overview & ERD](#4-database-design--overview--erd)
5. [Prisma Schema — Enums](#5-prisma-schema--enums)
6. [Prisma Schema — Platform & Company Models](#6-prisma-schema--platform--company-models)
7. [Prisma Schema — Tenant Core & Shared Models](#7-prisma-schema--tenant-core--shared-models)
8. [Prisma Schema — Inventory Models](#8-prisma-schema--inventory-models)
9. [Prisma Schema — Purchase Models](#9-prisma-schema--purchase-models)
10. [Prisma Schema — Sales Models](#10-prisma-schema--sales-models)
11. [Prisma Schema — Memo, Hold & Branch Transfer](#11-prisma-schema--memo-hold--branch-transfer)
12. [Prisma Schema — Manufacturing & Packet Operations](#12-prisma-schema--manufacturing--packet-operations)
13. [Prisma Schema — Accounting Models](#13-prisma-schema--accounting-models)
14. [Stock Movement Ledger](#14-stock-movement-ledger)
15. [Indexing & Performance Strategy](#15-indexing--performance-strategy)
16. [Conventions & Rules](#16-conventions--rules)
17. [Authentication Flow](#17-authentication-flow)
18. [Roles & Capabilities](#18-roles--capabilities)
19. [Frontend UX & Visibility Rules](#19-frontend-ux--visibility-rules)
20. [Notifications](#20-notifications)
21. [Error Handling Standards](#21-error-handling-standards)
22. [Audit Strategy](#22-audit-strategy)
23. [Reporting Permissions](#23-reporting-permissions)
24. [Recommended Build Order](#24-recommended-build-order)

---

## 1. Platform Overview & Tenancy Model

### 1.1 Two-Tier System

```
+---------------------------------------------------------+
|                   PLATFORM (Super Admin)                |
|  - Manages Company CRUD (create, suspend, delete)       |
|  - Views platform-level analytics (all companies)       |
|  - Manages platform subscriptions / plans               |
|  - Cannot touch tenant ERP transactions directly        |
+-------------------------+-------------------------------+
                          |  1 : N
        +-----------------+-----------------+
        |                 |                 |
+-------+------+  +-------+------+  +-------+------+
|  Company A   |  |  Company B   |  |  Company C   |
|  (Tenant)    |  |  (Tenant)    |  |  (Tenant)    |
|  Full ERP    |  |  Full ERP    |  |  Full ERP    |
|  Own RBAC    |  |  Own RBAC    |  |  Own RBAC    |
|  Own Branches|  |  Own Branches|  |  Own Branches|
|  Own Stock   |  |  Own Stock   |  |  Own Stock   |
|  Own Accounts|  |  Own Accounts|  |  Own Accounts|
+--------------+  +--------------+  +--------------+
```

### 1.2 Isolation Guarantee

- Every tenant table carries a mandatory `companyId` column (FK to `companies`).
- All Express API route handlers attach `companyId` (from the verified JWT) to every Prisma query — enforced at the middleware layer, not ad hoc in controllers.
- A Prisma Client Extension adds a global `where: { companyId: ctx.companyId }` filter to all read operations so tenant data never bleeds even if a controller forgets.
- Optional: PostgreSQL Row-Level Security (RLS) policies as a hard database-layer safety net.

### 1.3 User Session Payload (JWT)

```ts
interface SessionPayload {
  userId: string;
  companyId: string | null;  // null = Super Admin (platform level)
  branchId: string | null;   // null = company-wide access
  role: "SUPER_ADMIN" | string;
  permissions: string[];     // ["sale:create", "purchase:approve", ...]
}
```

Super Admin sessions have `companyId: null`. Any request with `companyId: null` that hits a tenant API route is rejected with 403.

---

## 2. Core Design Principles

### 2.1 Multi-Tenancy by companyId (Shared Schema)

A single PostgreSQL database hosts all tenants. Every tenant-owned table has:

```sql
company_id TEXT NOT NULL REFERENCES companies(id)
```

Shared-schema, shared-database tenancy model. Every composite index includes `company_id` as the leading column so tenant queries never cross-scan.

### 2.2 One unified InventoryItem supertype (Class Table Inheritance)

```
InventoryItem (base: companyId, barcode, branch, status, cost, price)
   +-- CertifiedDiamond   (1:1 detail — certificate, 4Cs, lab)
   +-- LooseDiamondPacket (1:1 detail — packet no, sieve, carats)
   +-- JewelryPiece       (1:1 detail — SKU, metal, weights)
```

Every transaction line (SaleItem, MemoItem, BranchTransferItem, ...) references `InventoryItem.id`. One FK, one pattern, everywhere.

### 2.3 One append-only StockMovement ledger

Every physical/state stock change writes a row to `StockMovement` (scoped by `companyId`). Current state on `InventoryItem.status`; history and analytics in the ledger.

### 2.4 Money is Decimal, never Float; multi-currency is explicit

`Decimal(14,2)` money, `Decimal(10,3)` carats, `Decimal(14,6)` exchange rates. Every financial document stores frozen `exchangeRate` + computed `baseTotal`.

### 2.5 Strict 3-Layer Backend Architecture (Routes -> Controller -> Service)

All Express API endpoints strictly enforce a 3-layer architecture with **zero inline logic in route files**:
1. **Route Layer (`routes/`)**: Pure router mapping HTTP methods and middleware (`authenticate`, `requirePermission`, `requireSuperAdmin`) to controller handlers. Never contains inline request handlers or database queries.
2. **Controller Layer (`controllers/`)**: Extracts HTTP request parameters (`req.params`, `req.body`, `req.query`, `req.companyId`), delegates to the corresponding Service layer, and formats standard JSON responses or forwards errors to `next(err)`.
3. **Service Layer (`services/`)**: Executes 100% of the business rules, data transformation, multi-tenant database operations via Prisma (`tenantDb`), and transaction management.

### 2.6 Documents follow a status machine + approval trail

`DRAFT → PENDING_APPROVAL → APPROVED → ...` Approval columns (`approvedById`, `approvedAt`) on the document make the trail queryable.

### 2.6 Soft deletes + audit log

`deletedAt` on all business records. Mutations write to `AuditLog` (companyId, who, what, before/after JSON). Nothing that touched money or stock is ever hard-deleted.

---

## 3. Folder Architecture

Two separate servers — Next.js frontend and Express backend.

```
shashvat-jewels-platform/
|
+-- apps/
|   +-- web/                                 # Next.js 15 — Frontend (App Router)
|   |   +-- src/
|   |   |   +-- app/
|   |   |   |   +-- layout.tsx
|   |   |   |   +-- globals.css
|   |   |   |   +-- (auth)/
|   |   |   |   |   +-- login/page.tsx
|   |   |   |   |   +-- forgot-password/page.tsx
|   |   |   |   +-- (super-admin)/
|   |   |   |   |   +-- layout.tsx
|   |   |   |   |   +-- page.tsx             # Platform dashboard
|   |   |   |   |   +-- companies/
|   |   |   |   |   |   +-- page.tsx         # All companies list + CRUD
|   |   |   |   |   |   +-- new/page.tsx
|   |   |   |   |   |   +-- [id]/page.tsx    # Detail + suspend/delete
|   |   |   |   |   +-- settings/page.tsx
|   |   |   |   +-- (dashboard)/             # Tenant ERP (companyId in session)
|   |   |   |       +-- layout.tsx           # ERP shell (sidebar + topbar + branch switcher)
|   |   |   |       +-- page.tsx             # Company dashboard
|   |   |   |       +-- certified-diamonds/
|   |   |   |       |   +-- page.tsx
|   |   |   |       |   +-- new/page.tsx
|   |   |   |       |   +-- [id]/page.tsx
|   |   |   |       |   +-- [id]/edit/page.tsx
|   |   |   |       |   +-- search/page.tsx
|   |   |   |       |   +-- analytics/page.tsx
|   |   |   |       +-- loose-diamonds/
|   |   |   |       |   +-- page.tsx
|   |   |   |       |   +-- parcels/page.tsx
|   |   |   |       |   +-- packets/[id]/page.tsx
|   |   |   |       |   +-- packets/[id]/split/page.tsx
|   |   |   |       |   +-- packets/merge/page.tsx
|   |   |   |       |   +-- adjustments/page.tsx
|   |   |   |       |   +-- analytics/page.tsx
|   |   |   |       +-- jewelry/
|   |   |   |       |   +-- page.tsx
|   |   |   |       |   +-- new/page.tsx
|   |   |   |       |   +-- [id]/page.tsx
|   |   |   |       |   +-- orders/page.tsx
|   |   |   |       |   +-- categories/page.tsx
|   |   |   |       +-- purchases/
|   |   |   |       |   +-- page.tsx
|   |   |   |       |   +-- new/page.tsx
|   |   |   |       |   +-- [id]/page.tsx
|   |   |   |       |   +-- approvals/page.tsx
|   |   |   |       |   +-- returns/page.tsx
|   |   |   |       +-- sales/
|   |   |   |       |   +-- page.tsx
|   |   |   |       |   +-- new/page.tsx     # POS: barcode scan / search / cart / invoice
|   |   |   |       |   +-- [id]/page.tsx
|   |   |   |       |   +-- returns/page.tsx
|   |   |   |       |   +-- discount-approvals/page.tsx
|   |   |   |       +-- memos/
|   |   |   |       |   +-- page.tsx
|   |   |   |       |   +-- new/page.tsx
|   |   |   |       |   +-- [id]/page.tsx
|   |   |   |       +-- holds/page.tsx
|   |   |   |       +-- transfers/
|   |   |   |       |   +-- page.tsx
|   |   |   |       |   +-- new/page.tsx
|   |   |   |       |   +-- [id]/page.tsx
|   |   |   |       +-- manufacturing/
|   |   |   |       |   +-- page.tsx
|   |   |   |       |   +-- new/page.tsx
|   |   |   |       |   +-- [id]/page.tsx
|   |   |   |       +-- customers/
|   |   |   |       |   +-- page.tsx
|   |   |   |       |   +-- new/page.tsx
|   |   |   |       |   +-- [id]/page.tsx
|   |   |   |       +-- vendors/
|   |   |   |       |   +-- page.tsx
|   |   |   |       |   +-- new/page.tsx
|   |   |   |       |   +-- [id]/page.tsx
|   |   |   |       +-- accounting/
|   |   |   |       |   +-- page.tsx
|   |   |   |       |   +-- accounts/page.tsx
|   |   |   |       |   +-- journals/page.tsx
|   |   |   |       |   +-- payments/page.tsx
|   |   |   |       |   +-- ledgers/[accountId]/page.tsx
|   |   |   |       +-- reports/
|   |   |   |       |   +-- page.tsx
|   |   |   |       |   +-- stock/page.tsx
|   |   |   |       |   +-- sales/page.tsx
|   |   |   |       |   +-- purchases/page.tsx
|   |   |   |       |   +-- aging/page.tsx
|   |   |   |       +-- reconciliation/
|   |   |   |       |   +-- page.tsx
|   |   |   |       |   +-- [id]/page.tsx
|   |   |   |       +-- notifications/page.tsx   # Notification center (§20)
|   |   |   |       +-- settings/
|   |   |   |           +-- company/page.tsx
|   |   |   |           +-- branches/page.tsx
|   |   |   |           +-- users/page.tsx
|   |   |   |           +-- roles/page.tsx
|   |   |   |           +-- currencies/page.tsx
|   |   |   |           +-- sequences/page.tsx
|   |   |   |
|   |   |   +-- features/
|   |   |   |   +-- super-admin/
|   |   |   |   |   +-- components/company-form.tsx
|   |   |   |   |   +-- components/company-table.tsx
|   |   |   |   |   +-- components/platform-dashboard.tsx
|   |   |   |   |   +-- queries.ts
|   |   |   |   |   +-- types.ts
|   |   |   |   +-- certified-diamonds/   # components/, queries.ts, types.ts
|   |   |   |   +-- loose-diamonds/
|   |   |   |   +-- jewelry/
|   |   |   |   +-- purchases/
|   |   |   |   +-- sales/
|   |   |   |   +-- memos/
|   |   |   |   +-- holds/
|   |   |   |   +-- transfers/
|   |   |   |   +-- manufacturing/
|   |   |   |   +-- customers/
|   |   |   |   +-- vendors/
|   |   |   |   +-- accounting/
|   |   |   |   +-- reports/
|   |   |   |   +-- reconciliation/
|   |   |   |   +-- analytics/
|   |   |   |   +-- notifications/
|   |   |   |   +-- auth/
|   |   |   |   +-- settings/
|   |   |   |
|   |   |   +-- components/
|   |   |   |   +-- ui/                      # shadcn/ui primitives
|   |   |   |   +-- layout/
|   |   |   |   |   +-- super-admin-sidebar.tsx
|   |   |   |   |   +-- tenant-sidebar.tsx
|   |   |   |   |   +-- topbar.tsx
|   |   |   |   |   +-- branch-switcher.tsx      # Hidden/locked for branch-scoped sessions (§18.2)
|   |   |   |   |   +-- notification-bell.tsx    # Unread badge + dropdown (§20)
|   |   |   |   |   +-- permission-gate.tsx      # Renders children only if session holds permission (§19.3)
|   |   |   |   |   +-- page-header.tsx
|   |   |   |   +-- data-table/
|   |   |   |   +-- forms/
|   |   |   |   +-- charts/
|   |   |   |   +-- barcode/
|   |   |   |       +-- barcode-label.tsx
|   |   |   |       +-- scanner-input.tsx
|   |   |   |
|   |   |   +-- lib/
|   |   |   |   +-- api-client.ts            # Typed fetch wrapper to Express backend
|   |   |   |   +-- money.ts
|   |   |   |   +-- carat.ts
|   |   |   |   +-- dates.ts
|   |   |   |   +-- constants.ts
|   |   |   |
|   |   |   +-- hooks/
|   |   |   |   +-- use-debounce.ts
|   |   |   |   +-- use-permissions.ts
|   |   |   |   +-- use-notifications.ts         # Poll/stream unread notifications (§20)
|   |   |   |   +-- use-barcode-scanner.ts
|   |   |   |
|   |   |   +-- types/
|   |   |   |   +-- index.ts
|   |   |   |
|   |   |   +-- config/
|   |   |   |   +-- site.ts
|   |   |   |   +-- navigation.ts
|   |   |   |   +-- env.ts
|   |   |   |
|   |   |   +-- middleware.ts
|   |   |
|   |   +-- kyp/                             # Know Your Project — frontend docs (design-system, ui-guidelines, standards) + plan/
|   |   +-- next.config.ts
|   |   +-- tsconfig.json
|   |   +-- package.json
|   |
|   +-- api/                                 # Express.js — Backend API Server
|       +-- kyp/                             # Know Your Project — backend docs (architecture, pagination, filtering, standards) + plan/
|       +-- prisma/
|       |   +-- schema/
|       |   |   +-- schema.prisma            # datasource + generator + shared enums
|       |   |   +-- platform.prisma          # Company, SuperAdmin, PlatformAuditLog
|       |   |   +-- core.prisma              # User, Role, Permission, Branch, Customer, Vendor
|       |   |   +-- inventory.prisma         # InventoryItem + detail tables, StockMovement
|       |   |   +-- purchase.prisma
|       |   |   +-- sales.prisma
|       |   |   +-- memo-hold-transfer.prisma
|       |   |   +-- manufacturing.prisma
|       |   |   +-- accounting.prisma
|       |   |   +-- notifications.prisma     # Notification, NotificationPreference, StockAlertRule
|       |   +-- migrations/
|       |   +-- seed.ts
|       |
|       +-- src/
|           +-- index.ts                     # Express bootstrap + listen
|           +-- app.ts                       # Express app (middleware stack, routers)
|           +-- middleware/
|           |   +-- authenticate.ts          # JWT verification -> attach session to req
|           |   +-- tenant-scope.ts          # companyId guard for all tenant routes
|           |   +-- require-super-admin.ts   # Guard for /api/super-admin/*
|           |   +-- require-permission.ts    # RBAC check
|           |   +-- error-handler.ts
|           +-- routes/
|           |   +-- auth.routes.ts
|           |   +-- super-admin/
|           |   |   +-- companies.routes.ts
|           |   |   +-- platform.routes.ts
|           |   +-- tenant/
|           |       +-- certified-diamonds.routes.ts
|           |       +-- loose-diamonds.routes.ts
|           |       +-- jewelry.routes.ts
|           |       +-- purchases.routes.ts
|           |       +-- sales.routes.ts
|           |       +-- memos.routes.ts
|           |       +-- holds.routes.ts
|           |       +-- transfers.routes.ts
|           |       +-- manufacturing.routes.ts
|           |       +-- customers.routes.ts
|           |       +-- vendors.routes.ts
|           |       +-- accounting.routes.ts
|           |       +-- reports.routes.ts
|           |       +-- barcode.routes.ts
|           |       +-- uploads.routes.ts
|           |       +-- notifications.routes.ts  # List, mark-read, preferences (§20)
|           |       +-- settings.routes.ts
|           +-- controllers/
|           |   +-- super-admin/companies.controller.ts
|           |   +-- tenant/certified-diamonds.controller.ts
|           |   +-- tenant/...
|           +-- services/
|           |   +-- stock-movement.service.ts
|           |   +-- numbering.service.ts
|           |   +-- barcode.service.ts
|           |   +-- accounting-posting.service.ts
|           |   +-- currency.service.ts
|           |   +-- pricing.service.ts
|           |   +-- storage.service.ts
|           |   +-- company.service.ts       # Tenant CRUD + onboarding
|           |   +-- auth.service.ts          # Identity resolution: super admin vs tenant user (§17.2)
|           |   +-- audit.service.ts         # AuditLog writes, same-transaction for mutations (§22)
|           |   +-- notification.service.ts  # Creates Notification rows + channel dispatch (§20)
|           +-- db/
|           |   +-- prisma.ts               # Prisma client singleton
|           |   +-- tenant-extension.ts     # Auto-inject companyId filter
|           +-- jobs/
|           |   +-- hold-expiry.job.ts       # Hold expiry warnings + expiry (§20)
|           |   +-- memo-expiry.job.ts       # Memo expectedReturnDate overdue (§20)
|           |   +-- stock-low.job.ts         # Evaluate StockAlertRule thresholds (§20)
|           |   +-- payment-due.job.ts       # Invoice/vendor payments past due (§20)
|           |   +-- aging-snapshot.job.ts
|           +-- schemas/
|           |   +-- certified-diamond.schema.ts
|           |   +-- ...
|           +-- lib/
|               +-- money.ts
|               +-- carat.ts
|               +-- errors.ts                # ApiError classes: Validation/Permission/Stock/BusinessRule (§21)
|               +-- constants.ts
|
+-- packages/
|   +-- shared-types/
|       +-- src/
|       |   +-- api.types.ts                 # ApiResponse<T>, Paginated<T>
|       |   +-- session.types.ts             # SessionPayload
|       |   +-- error-codes.ts               # Fixed error code catalog — frontend switches on these (§21)
|       |   +-- enums.ts
|       +-- package.json
|
+-- kyp/
|   +-- plan/                                # Master implementation plan: master-plan.md + module-NN-*/ phase plans
|
+-- docker-compose.yml                       # Postgres + MinIO + In-memory cache
+-- .env.example
+-- package.json                             # Monorepo root (pnpm workspaces)
```

---

## 4. Database Design — Overview & ERD

### Entity map

```
+----------------------------------+
|   PLATFORM LAYER (no companyId)  |
|   SuperAdmin · Company           |
+----------------+-----------------+
                 |  1 : N  (companyId FK on every table below)
+===========================================+
|  TENANT LAYER (all rows have companyId)   |
+===========================================+
  +--------+  +------+  +----------+  +--------+
  | Branch |  | User |  | Customer |  | Vendor |
  +---+----+  +--+---+  +----+-----+  +---+----+
      |           |          |            |
  ====+===========+===+======+============+======
                      |
          +-----------+----------+     +----------------+
          |     InventoryItem    +---->+ StockMovement  |
          |  companyId·barcode   | 1:N | (append-only)  |
          |  status·cost·price   |     +----------------+
          +-----------+----------+
    +------------------+------------------+
+---+----------+ +------+----------+ +----+---------+
| Certified   | | LooseDiamond    | | Jewelry      |
| Diamond     | | Packet--Parcel  | | Piece        |
+-------------+ +-----------------+ +--------------+
                       | referenced by itemId
  +--------+-------+---+----+-------+----------+
+-+------+-++-+---+++-+----+++-+---+|+-+------++
|Purchase||  Sale || Memo  || Hold || Branch  ||
|+Items  ||+Items || +Items||      || Transfer||
|+Returns||+Ret.  ||       ||      || +Items  ||
+----+---++---+---++-+-----++------++----------+
     |        |
     +----+---+
  +-------+-------+  +---------------+  +-------------------+
  | JournalEntry  |  | Payment       |  | Account (CoA)     |
  | + JournalLines|<-| + Allocations +->| ASSET/LIAB/INC... |
  +---------------+  +---------------+  +-------------------+
```

### Table inventory (53 tables)

| Domain | Tables |
|---|---|
| Platform | `super_admins`, `companies`, `platform_audit_logs` |
| Tenant Core | `users`, `roles`, `permissions`, `role_permissions`, `branches`, `customers`, `vendors`, `currencies`, `exchange_rates`, `number_sequences`, `media_files`, `audit_logs` |
| Inventory | `inventory_items`, `certified_diamonds`, `loose_diamond_packets`, `parcels`, `jewelry_pieces`, `jewelry_categories`, `stock_movements` |
| Purchase | `purchases`, `purchase_items`, `purchase_charges`, `purchase_returns`, `purchase_return_items` |
| Sales | `sales`, `sale_items`, `sales_returns`, `sales_return_items` |
| Memo / Hold / Transfer | `memos`, `memo_items`, `holds`, `branch_transfers`, `branch_transfer_items` |
| Manufacturing & Packet Ops | `manufacturing_jobs`, `manufacturing_issues`, `manufacturing_returns`, `packet_splits`, `packet_split_lines`, `packet_merges`, `packet_merge_lines`, `weight_adjustments`, `stock_reconciliations`, `stock_reconciliation_items` |
| Accounting | `accounts`, `journal_entries`, `journal_lines`, `payments`, `payment_allocations` |
| Notifications | `notifications`, `notification_preferences`, `stock_alert_rules` |

---

## 5. Prisma Schema — Enums

```prisma
// platform enums
enum CompanyStatus {
  ACTIVE
  SUSPENDED
  TRIAL
  CANCELLED
}

enum SuperAdminRole {
  SUPER_ADMIN
  SUPPORT
}

// tenant enums
enum ItemType {
  CERTIFIED_DIAMOND
  LOOSE_DIAMOND
  JEWELRY
}

enum StockStatus {
  IN_STOCK
  ON_HOLD
  ON_MEMO
  IN_TRANSIT
  IN_MANUFACTURING
  SOLD
  RETURNED_TO_SUPPLIER
  CONSUMED
  LOST
}

enum DiamondShape {
  ROUND
  PRINCESS
  CUSHION
  OVAL
  EMERALD
  PEAR
  MARQUISE
  RADIANT
  ASSCHER
  HEART
  BAGUETTE
  OTHER
}

enum DiamondColor {
  D
  E
  F
  G
  H
  I
  J
  K
  L
  M
  N_TO_Z
  FANCY
}

enum DiamondClarity {
  FL
  IF
  VVS1
  VVS2
  VS1
  VS2
  SI1
  SI2
  SI3
  I1
  I2
  I3
}

enum GradeQuality {
  EXCELLENT
  VERY_GOOD
  GOOD
  FAIR
  POOR
}

enum Fluorescence {
  NONE
  FAINT
  MEDIUM
  STRONG
  VERY_STRONG
}

enum CertificateLab {
  GIA
  IGI
  HRD
  GSI
  SGL
  OTHER
}

enum MetalType {
  GOLD_24K
  GOLD_22K
  GOLD_18K
  GOLD_14K
  SILVER
  PLATINUM
  OTHER
}

enum CustomerType {
  RETAIL
  WHOLESALE
  DEALER
}

enum VendorType {
  LOCAL
  IMPORT
}

enum PurchaseStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  RECEIVED
  CANCELLED
}

enum SaleType {
  RETAIL
  WHOLESALE
  MEMO_CONVERSION
  EXPORT
  EXCHANGE
}

enum SaleStatus {
  DRAFT
  PENDING_DISCOUNT_APPROVAL
  CONFIRMED
  CANCELLED
}

enum PaymentStatus {
  UNPAID
  PARTIAL
  PAID
}

enum MemoStatus {
  OPEN
  PARTIALLY_RETURNED
  CLOSED
  CONVERTED
}

enum MemoItemStatus {
  ON_MEMO
  RETURNED
  SOLD
}

enum HoldStatus {
  ACTIVE
  RELEASED
  CONVERTED
  EXPIRED
}

enum TransferStatus {
  PENDING
  IN_TRANSIT
  RECEIVED
  REJECTED
}

enum ManufacturingStatus {
  ISSUED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum MovementType {
  PURCHASE_IN
  PURCHASE_RETURN_OUT
  SALE_OUT
  SALES_RETURN_IN
  MEMO_OUT
  MEMO_RETURN_IN
  HOLD
  HOLD_RELEASE
  TRANSFER_OUT
  TRANSFER_IN
  MANUFACTURING_ISSUE
  MANUFACTURING_RETURN
  SPLIT_OUT
  SPLIT_IN
  MERGE_OUT
  MERGE_IN
  WEIGHT_ADJUSTMENT
  RECONCILIATION_ADJUSTMENT
  OPENING_STOCK
}

enum AccountType {
  ASSET
  LIABILITY
  EQUITY
  INCOME
  EXPENSE
}

enum PaymentDirection {
  IN
  OUT
}

enum PaymentMethod {
  CASH
  BANK_TRANSFER
  CARD
  UPI
  CHEQUE
  OTHER
}

enum MediaKind {
  IMAGE
  VIDEO
  CERTIFICATE
  INVOICE
  DOCUMENT
}

enum ReconciliationStatus {
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum NotificationType {
  HOLD_EXPIRY
  MEMO_EXPIRY
  APPROVAL_PENDING
  STOCK_LOW
  TRANSFER_RECEIVED
  PAYMENT_DUE
}

enum NotificationChannel {
  IN_APP
  EMAIL
  WHATSAPP
  SMS
}
```

---

## 6. Prisma Schema — Platform & Company Models

```prisma
model SuperAdmin {
  id           String         @id @default(cuid())
  email        String         @unique
  passwordHash String
  name         String
  role         SuperAdminRole @default(SUPER_ADMIN)
  isActive     Boolean        @default(true)
  lastLoginAt  DateTime?
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  platformAuditLogs PlatformAuditLog[]

  @@map("super_admins")
}

model Company {
  id           String        @id @default(cuid())
  slug         String        @unique    // "shashvat-jewels" used in barcode prefix
  name         String
  email        String?
  phone        String?
  address      String?
  city         String?
  country      String        @default("India")
  baseCurrency String        @default("INR")
  taxId        String?
  logoUrl      String?
  status       CompanyStatus @default(TRIAL)
  trialEndsAt  DateTime?
  plan         String?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  deletedAt    DateTime?

  users           User[]
  roles           Role[]
  branches        Branch[]
  customers       Customer[]
  vendors         Vendor[]
  currencies      Currency[]
  inventoryItems  InventoryItem[]
  purchases       Purchase[]
  sales           Sale[]
  memos           Memo[]
  accounts        Account[]
  payments        Payment[]
  numberSequences NumberSequence[]
  auditLogs       AuditLog[]

  @@index([status])
  @@map("companies")
}

model PlatformAuditLog {
  id           String      @id @default(cuid())
  superAdminId String?
  superAdmin   SuperAdmin? @relation(fields: [superAdminId], references: [id])
  action       String
  targetType   String?
  targetId     String?
  before       Json?
  after        Json?
  ipAddress    String?
  createdAt    DateTime    @default(now())

  @@index([targetType, targetId])
  @@index([superAdminId, createdAt])
  @@map("platform_audit_logs")
}
```

---

## 7. Prisma Schema — Tenant Core & Shared Models

> All models below carry a mandatory `companyId` FK to `companies.id`.

```prisma
model User {
  id           String    @id @default(cuid())
  companyId    String
  company      Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)
  email        String
  passwordHash String
  name         String
  phone        String?
  roleId       String
  role         Role      @relation(fields: [roleId], references: [id])
  branchId     String?
  branch       Branch?   @relation(fields: [branchId], references: [id])
  isActive     Boolean   @default(true)
  lastLoginAt  DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  deletedAt    DateTime?

  salesAsSalesperson Sale[]    @relation("Salesperson")
  auditLogs          AuditLog[]

  @@unique([companyId, email])
  @@index([companyId, roleId])
  @@index([companyId, branchId])
  @@map("users")
}

model Role {
  id          String           @id @default(cuid())
  companyId   String
  company     Company          @relation(fields: [companyId], references: [id], onDelete: Cascade)
  name        String
  description String?
  isSystem    Boolean          @default(false)
  users       User[]
  permissions RolePermission[]
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  @@unique([companyId, name])
  @@index([companyId])
  @@map("roles")
}

model Permission {
  id       String           @id @default(cuid())
  resource String
  action   String
  roles    RolePermission[]

  @@unique([resource, action])
  @@map("permissions")
}

model RolePermission {
  roleId       String
  permissionId String
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
  @@map("role_permissions")
}

model Branch {
  id        String    @id @default(cuid())
  companyId String
  company   Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)
  code      String
  name      String
  address   String?
  city      String?
  phone     String?
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  users          User[]
  inventoryItems InventoryItem[]
  transfersOut   BranchTransfer[] @relation("TransferFrom")
  transfersIn    BranchTransfer[] @relation("TransferTo")

  @@unique([companyId, code])
  @@index([companyId])
  @@map("branches")
}

model Customer {
  id              String       @id @default(cuid())
  companyId       String
  company         Company      @relation(fields: [companyId], references: [id], onDelete: Cascade)
  code            String
  type            CustomerType @default(RETAIL)
  name            String
  email           String?
  phone           String?
  taxId           String?
  billingAddress  String?
  shippingAddress String?
  city            String?
  country         String?      @default("India")
  creditLimit     Decimal      @default(0) @db.Decimal(14, 2)
  notes           String?
  isActive        Boolean      @default(true)
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  deletedAt       DateTime?

  sales    Sale[]
  memos    Memo[]
  holds    Hold[]
  payments Payment[]

  @@unique([companyId, code])
  @@index([companyId, name])
  @@index([companyId, phone])
  @@index([companyId, type])
  @@map("customers")
}

model Vendor {
  id           String     @id @default(cuid())
  companyId    String
  company      Company    @relation(fields: [companyId], references: [id], onDelete: Cascade)
  code         String
  type         VendorType @default(LOCAL)
  name         String
  email        String?
  phone        String?
  taxId        String?
  address      String?
  city         String?
  country      String?    @default("India")
  currencyId   String?
  currency     Currency?  @relation(fields: [currencyId], references: [id])
  paymentTerms String?
  notes        String?
  isActive     Boolean    @default(true)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  deletedAt    DateTime?

  purchases         Purchase[]
  manufacturingJobs ManufacturingJob[]
  payments          Payment[]

  @@unique([companyId, code])
  @@index([companyId, name])
  @@map("vendors")
}

model Currency {
  id        String  @id @default(cuid())
  companyId String
  company   Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  code      String
  name      String
  symbol    String
  decimals  Int     @default(2)
  isBase    Boolean @default(false)
  isActive  Boolean @default(true)

  ratesFrom ExchangeRate[] @relation("RateFrom")
  vendors   Vendor[]
  purchases Purchase[]
  sales     Sale[]
  payments  Payment[]

  @@unique([companyId, code])
  @@index([companyId])
  @@map("currencies")
}

model ExchangeRate {
  id            String   @id @default(cuid())
  currencyId    String
  currency      Currency @relation("RateFrom", fields: [currencyId], references: [id])
  rateToBase    Decimal  @db.Decimal(14, 6)
  effectiveDate DateTime @db.Date
  createdAt     DateTime @default(now())

  @@unique([currencyId, effectiveDate])
  @@map("exchange_rates")
}

model NumberSequence {
  id        String  @id @default(cuid())
  companyId String
  company   Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  key       String
  branchId  String?
  prefix    String
  year      Int
  lastValue Int     @default(0)

  @@unique([companyId, key, branchId, year])
  @@map("number_sequences")
}

model MediaFile {
  id           String    @id @default(cuid())
  companyId    String
  kind         MediaKind
  entityType   String
  entityId     String
  url          String
  fileName     String
  mimeType     String
  sizeBytes    Int
  uploadedById String?
  createdAt    DateTime  @default(now())
  deletedAt    DateTime?

  @@index([companyId, entityType, entityId])
  @@map("media_files")
}

model AuditLog {
  id         String   @id @default(cuid())
  companyId  String
  branchId   String?  // branch scope — lets Branch Admins see only their branch's entries (§22)
  userId     String?
  user       User?    @relation(fields: [userId], references: [id])
  action     String   // CREATE | UPDATE | DELETE | APPROVE | PRINT | EXPORT | LOGIN | LOGOUT | PASSWORD_CHANGE (§22)
  entityType String
  entityId   String
  before     Json?
  after      Json?
  ipAddress  String?
  createdAt  DateTime @default(now())

  @@index([companyId, entityType, entityId])
  @@index([companyId, userId, createdAt])
  @@index([companyId, branchId, createdAt])
  @@map("audit_logs")
}

// ---- Notifications (§20) ----

model Notification {
  id         String           @id @default(cuid())
  companyId  String
  userId     String           // recipient
  branchId   String?          // branch scope; null = company-wide
  type       NotificationType
  title      String
  message    String
  entityType String?          // source document link, e.g. "Hold", "Memo", "BranchTransfer"
  entityId   String?
  isRead     Boolean          @default(false)
  readAt     DateTime?
  createdAt  DateTime         @default(now())

  @@index([companyId, userId, isRead, createdAt])
  @@index([companyId, type, createdAt])
  @@map("notifications")
}

model NotificationPreference {
  id        String              @id @default(cuid())
  companyId String
  type      NotificationType
  channel   NotificationChannel
  enabled   Boolean             @default(true)

  @@unique([companyId, type, channel])
  @@map("notification_preferences")
}

// Configured thresholds evaluated by stock-low.job.ts (§20 Stock Low)
model StockAlertRule {
  id         String        @id @default(cuid())
  companyId  String
  branchId   String?       // null = applies to every branch
  itemType   ItemType
  categoryId String?       // JEWELRY: jewelry category
  sieveSize  String?       // LOOSE_DIAMOND: sieve range
  shape      DiamondShape?
  minPieces  Int?
  minCarats  Decimal?      @db.Decimal(12, 3)
  isActive   Boolean       @default(true)
  createdAt  DateTime      @default(now())
  updatedAt  DateTime      @updatedAt

  @@index([companyId, branchId, isActive])
  @@map("stock_alert_rules")
}
```

---

## 8. Prisma Schema — Inventory Models

```prisma
model InventoryItem {
  id          String      @id @default(cuid())
  companyId   String
  company     Company     @relation(fields: [companyId], references: [id], onDelete: Cascade)
  itemType    ItemType
  barcode     String
  status      StockStatus @default(IN_STOCK)
  branchId    String
  branch      Branch      @relation(fields: [branchId], references: [id])
  costPrice   Decimal     @db.Decimal(14, 2)
  listPrice   Decimal     @db.Decimal(14, 2)
  purchaseItemId String?  @unique
  notes       String?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  deletedAt   DateTime?

  certifiedDiamond    CertifiedDiamond?
  loosePacket         LooseDiamondPacket?
  jewelryPiece        JewelryPiece?
  stockMovements      StockMovement[]
  saleItems           SaleItem[]
  memoItems           MemoItem[]
  holds               Hold[]
  transferItems       BranchTransferItem[]
  purchaseReturnItems PurchaseReturnItem[]
  manufacturingIssues ManufacturingIssue[]

  @@unique([companyId, barcode])
  @@index([companyId, itemType, status, branchId])
  @@index([companyId, branchId, status])
  @@index([companyId, status])
  @@map("inventory_items")
}

model CertifiedDiamond {
  id             String         @id @default(cuid())
  itemId         String         @unique
  item           InventoryItem  @relation(fields: [itemId], references: [id], onDelete: Cascade)
  stoneId        String
  certificateNo  String
  lab            CertificateLab
  certificateUrl String?
  shape          DiamondShape
  caratWeight    Decimal        @db.Decimal(10, 3)
  color          DiamondColor
  fancyColor     String?
  clarity        DiamondClarity
  cut            GradeQuality?
  polish         GradeQuality?
  symmetry       GradeQuality?
  fluorescence   Fluorescence?
  measurements   String?
  depthPct       Decimal?       @db.Decimal(5, 2)
  tablePct       Decimal?       @db.Decimal(5, 2)
  rapRate        Decimal?       @db.Decimal(14, 2)
  rapDiscount    Decimal?       @db.Decimal(6, 2)
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  @@index([shape, caratWeight, color, clarity])
  @@index([lab])
  @@index([caratWeight])
  @@map("certified_diamonds")
}

model Parcel {
  id          String    @id @default(cuid())
  companyId   String
  parcelNo    String
  description String?
  totalCarats Decimal   @db.Decimal(12, 3)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  packets LooseDiamondPacket[]

  @@unique([companyId, parcelNo])
  @@index([companyId])
  @@map("parcels")
}

model LooseDiamondPacket {
  id              String        @id @default(cuid())
  itemId          String        @unique
  item            InventoryItem @relation(fields: [itemId], references: [id], onDelete: Cascade)
  packetNo        String
  parcelId        String?
  parcel          Parcel?       @relation(fields: [parcelId], references: [id])
  shape           DiamondShape?
  isMixed         Boolean       @default(false)
  sieveSize       String?
  sizeDescription String?
  colorRange      String?
  clarityRange    String?
  pieces          Int?
  totalCarats     Decimal       @db.Decimal(12, 3)
  availableCarats Decimal       @db.Decimal(12, 3)
  ratePerCarat    Decimal       @db.Decimal(14, 2)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  weightAdjustments WeightAdjustment[]

  @@index([parcelId])
  @@index([shape, sieveSize])
  @@map("loose_diamond_packets")
}

model JewelryCategory {
  id        String            @id @default(cuid())
  companyId String
  name      String
  parentId  String?
  parent    JewelryCategory?  @relation("CategoryTree", fields: [parentId], references: [id])
  children  JewelryCategory[] @relation("CategoryTree")
  pieces    JewelryPiece[]

  @@unique([companyId, name])
  @@index([companyId])
  @@map("jewelry_categories")
}

model JewelryPiece {
  id            String          @id @default(cuid())
  itemId        String          @unique
  item          InventoryItem   @relation(fields: [itemId], references: [id], onDelete: Cascade)
  sku           String
  name          String
  categoryId    String
  category      JewelryCategory @relation(fields: [categoryId], references: [id])
  metalType     MetalType
  grossWeight   Decimal         @db.Decimal(10, 3)
  netWeight     Decimal         @db.Decimal(10, 3)
  diamondCarats Decimal?        @db.Decimal(10, 3)
  diamondPieces Int?
  makingCharge  Decimal?        @db.Decimal(14, 2)
  description   String?
  manufacturingJobId String?
  manufacturingJob   ManufacturingJob? @relation(fields: [manufacturingJobId], references: [id])
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  @@index([categoryId])
  @@index([metalType])
  @@map("jewelry_pieces")
}
```

---

## 9. Prisma Schema — Purchase Models

```prisma
model Purchase {
  id             String         @id @default(cuid())
  companyId      String
  purchaseNo     String
  vendorId       String
  vendor         Vendor         @relation(fields: [vendorId], references: [id])
  branchId       String
  isImport       Boolean        @default(false)
  status         PurchaseStatus @default(DRAFT)
  currencyId     String
  currency       Currency       @relation(fields: [currencyId], references: [id])
  exchangeRate   Decimal        @db.Decimal(14, 6)
  subtotal       Decimal        @db.Decimal(14, 2)
  freightCharge  Decimal        @default(0) @db.Decimal(14, 2)
  dutyCharge     Decimal        @default(0) @db.Decimal(14, 2)
  otherCharges   Decimal        @default(0) @db.Decimal(14, 2)
  grandTotal     Decimal        @db.Decimal(14, 2)
  baseTotal      Decimal        @db.Decimal(14, 2)
  supplierInvoiceNo   String?
  supplierInvoiceDate DateTime?  @db.Date
  paymentDueDate      DateTime?  @db.Date  // from vendor paymentTerms; drives Payment Due notifications (§20)
  createdById    String
  approvedById   String?
  approvedAt     DateTime?
  receivedById   String?
  receivedAt     DateTime?
  notes          String?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  deletedAt      DateTime?

  items   PurchaseItem[]
  returns PurchaseReturn[]

  @@unique([companyId, purchaseNo])
  @@index([companyId, vendorId, createdAt])
  @@index([companyId, branchId, status])
  @@index([companyId, status])
  @@map("purchases")
}

model PurchaseItem {
  id           String   @id @default(cuid())
  purchaseId   String
  purchase     Purchase @relation(fields: [purchaseId], references: [id], onDelete: Cascade)
  itemType     ItemType
  description  String
  pieces       Int?
  carats       Decimal? @db.Decimal(12, 3)
  ratePerCarat Decimal? @db.Decimal(14, 2)
  unitCost     Decimal  @db.Decimal(14, 2)
  lineTotal    Decimal  @db.Decimal(14, 2)
  landedCost   Decimal? @db.Decimal(14, 2)
  inventoryItemId String? @unique

  @@index([purchaseId])
  @@map("purchase_items")
}

model PurchaseReturn {
  id          String   @id @default(cuid())
  companyId   String
  returnNo    String
  purchaseId  String
  purchase    Purchase @relation(fields: [purchaseId], references: [id])
  reason      String?
  totalAmount Decimal  @db.Decimal(14, 2)
  createdById String
  createdAt   DateTime @default(now())

  items PurchaseReturnItem[]

  @@unique([companyId, returnNo])
  @@index([companyId, purchaseId])
  @@map("purchase_returns")
}

model PurchaseReturnItem {
  id               String         @id @default(cuid())
  purchaseReturnId String
  purchaseReturn   PurchaseReturn @relation(fields: [purchaseReturnId], references: [id], onDelete: Cascade)
  inventoryItemId  String
  inventoryItem    InventoryItem  @relation(fields: [inventoryItemId], references: [id])
  carats           Decimal?       @db.Decimal(12, 3)
  amount           Decimal        @db.Decimal(14, 2)

  @@map("purchase_return_items")
}
```

---

## 10. Prisma Schema — Sales Models

```prisma
model Sale {
  id            String        @id @default(cuid())
  companyId     String
  company       Company       @relation(fields: [companyId], references: [id], onDelete: Cascade)
  invoiceNo     String
  saleType      SaleType      @default(RETAIL)
  status        SaleStatus    @default(DRAFT)
  customerId    String
  customer      Customer      @relation(fields: [customerId], references: [id])
  branchId      String
  salespersonId String
  salesperson   User          @relation("Salesperson", fields: [salespersonId], references: [id])
  currencyId    String
  currency      Currency      @relation(fields: [currencyId], references: [id])
  exchangeRate  Decimal       @db.Decimal(14, 6)
  subtotal       Decimal      @db.Decimal(14, 2)
  discountAmount Decimal      @default(0) @db.Decimal(14, 2)
  taxAmount      Decimal      @default(0) @db.Decimal(14, 2)
  grandTotal     Decimal      @db.Decimal(14, 2)
  baseTotal      Decimal      @db.Decimal(14, 2)
  discountApprovedById String?
  discountApprovedAt   DateTime?
  paymentStatus PaymentStatus @default(UNPAID)
  paidAmount    Decimal       @default(0) @db.Decimal(14, 2)
  dueDate       DateTime?     @db.Date   // drives Payment Due notifications (§20)
  memoId           String?
  memo             Memo?         @relation(fields: [memoId], references: [id])
  exchangeReturnId String?       @unique
  exchangeReturn   SalesReturn?  @relation("ExchangeLink", fields: [exchangeReturnId], references: [id])
  soldAt        DateTime      @default(now())
  notes         String?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  deletedAt     DateTime?

  items       SaleItem[]
  returns     SalesReturn[]
  allocations PaymentAllocation[]

  @@unique([companyId, invoiceNo])
  @@index([companyId, customerId, soldAt])
  @@index([companyId, branchId, soldAt])
  @@index([companyId, salespersonId, soldAt])
  @@index([companyId, saleType, soldAt])
  @@index([companyId, status])
  @@index([companyId, paymentStatus])
  @@index([companyId, paymentStatus, dueDate])
  @@map("sales")
}

model SaleItem {
  id              String        @id @default(cuid())
  saleId          String
  sale            Sale          @relation(fields: [saleId], references: [id], onDelete: Cascade)
  inventoryItemId String
  inventoryItem   InventoryItem @relation(fields: [inventoryItemId], references: [id])
  carats          Decimal?      @db.Decimal(12, 3)
  pieces          Int?
  ratePerCarat    Decimal?      @db.Decimal(14, 2)
  unitPrice       Decimal       @db.Decimal(14, 2)
  discount        Decimal       @default(0) @db.Decimal(14, 2)
  lineTotal       Decimal       @db.Decimal(14, 2)
  costAtSale      Decimal       @db.Decimal(14, 2)

  @@index([saleId])
  @@index([inventoryItemId])
  @@map("sale_items")
}

model SalesReturn {
  id          String   @id @default(cuid())
  companyId   String
  returnNo    String
  saleId      String
  sale        Sale     @relation(fields: [saleId], references: [id])
  reason      String?
  totalAmount Decimal  @db.Decimal(14, 2)
  isExchange  Boolean  @default(false)
  createdById String
  createdAt   DateTime @default(now())

  items        SalesReturnItem[]
  exchangeSale Sale?             @relation("ExchangeLink")

  @@unique([companyId, returnNo])
  @@index([companyId, saleId])
  @@map("sales_returns")
}

model SalesReturnItem {
  id            String      @id @default(cuid())
  salesReturnId String
  salesReturn   SalesReturn @relation(fields: [salesReturnId], references: [id], onDelete: Cascade)
  saleItemId    String
  carats        Decimal?    @db.Decimal(12, 3)
  amount        Decimal     @db.Decimal(14, 2)

  @@map("sales_return_items")
}
```

---

## 11. Prisma Schema — Memo, Hold & Branch Transfer

```prisma
model Memo {
  id                 String     @id @default(cuid())
  companyId          String
  company            Company    @relation(fields: [companyId], references: [id], onDelete: Cascade)
  memoNo             String
  customerId         String
  customer           Customer   @relation(fields: [customerId], references: [id])
  branchId           String
  status             MemoStatus @default(OPEN)
  issuedById         String
  issuedAt           DateTime   @default(now())
  expectedReturnDate DateTime?  @db.Date
  closedAt           DateTime?
  notes              String?
  createdAt          DateTime   @default(now())
  updatedAt          DateTime   @updatedAt

  items MemoItem[]
  sales Sale[]

  @@unique([companyId, memoNo])
  @@index([companyId, customerId, status])
  @@index([companyId, status])
  @@map("memos")
}

model MemoItem {
  id              String         @id @default(cuid())
  memoId          String
  memo            Memo           @relation(fields: [memoId], references: [id], onDelete: Cascade)
  inventoryItemId String
  inventoryItem   InventoryItem  @relation(fields: [inventoryItemId], references: [id])
  carats          Decimal?       @db.Decimal(12, 3)
  memoPrice       Decimal        @db.Decimal(14, 2)
  status          MemoItemStatus @default(ON_MEMO)
  returnedAt      DateTime?
  saleItemId      String?

  @@index([memoId])
  @@index([inventoryItemId, status])
  @@map("memo_items")
}

model Hold {
  id              String        @id @default(cuid())
  companyId       String
  inventoryItemId String
  inventoryItem   InventoryItem @relation(fields: [inventoryItemId], references: [id])
  customerId      String
  customer        Customer      @relation(fields: [customerId], references: [id])
  status          HoldStatus    @default(ACTIVE)
  reason          String?
  heldById        String
  heldAt          DateTime      @default(now())
  expiresAt       DateTime?
  releasedAt      DateTime?

  @@index([companyId, inventoryItemId, status])
  @@index([companyId, customerId])
  @@index([companyId, status, expiresAt])
  @@map("holds")
}

model BranchTransfer {
  id               String         @id @default(cuid())
  companyId        String
  transferNo       String
  fromBranchId     String
  fromBranch       Branch         @relation("TransferFrom", fields: [fromBranchId], references: [id])
  toBranchId       String
  toBranch         Branch         @relation("TransferTo", fields: [toBranchId], references: [id])
  status           TransferStatus @default(PENDING)
  sentById         String
  sentAt           DateTime?
  acknowledgedById String?
  acknowledgedAt   DateTime?
  rejectionReason  String?
  notes            String?
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  items BranchTransferItem[]

  @@unique([companyId, transferNo])
  @@index([companyId, fromBranchId, status])
  @@index([companyId, toBranchId, status])
  @@map("branch_transfers")
}

model BranchTransferItem {
  id              String         @id @default(cuid())
  transferId      String
  transfer        BranchTransfer @relation(fields: [transferId], references: [id], onDelete: Cascade)
  inventoryItemId String
  inventoryItem   InventoryItem  @relation(fields: [inventoryItemId], references: [id])
  carats          Decimal?       @db.Decimal(12, 3)

  @@index([transferId])
  @@map("branch_transfer_items")
}
```

---

## 12. Prisma Schema — Manufacturing & Packet Operations

```prisma
model ManufacturingJob {
  id          String              @id @default(cuid())
  companyId   String
  jobNo       String
  branchId    String
  workshopId  String?
  workshop    Vendor?             @relation(fields: [workshopId], references: [id])
  status      ManufacturingStatus @default(ISSUED)
  description String?
  issuedById  String
  issuedAt    DateTime            @default(now())
  completedAt DateTime?
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt

  issues       ManufacturingIssue[]
  returns      ManufacturingReturn[]
  outputPieces JewelryPiece[]

  @@unique([companyId, jobNo])
  @@index([companyId, status])
  @@index([companyId, workshopId])
  @@map("manufacturing_jobs")
}

model ManufacturingIssue {
  id              String           @id @default(cuid())
  jobId           String
  job             ManufacturingJob @relation(fields: [jobId], references: [id], onDelete: Cascade)
  inventoryItemId String
  inventoryItem   InventoryItem    @relation(fields: [inventoryItemId], references: [id])
  caratsIssued    Decimal          @db.Decimal(12, 3)
  pieces          Int?
  issuedAt        DateTime         @default(now())

  @@index([jobId])
  @@map("manufacturing_issues")
}

model ManufacturingReturn {
  id              String           @id @default(cuid())
  jobId           String
  job             ManufacturingJob @relation(fields: [jobId], references: [id], onDelete: Cascade)
  inventoryItemId String
  caratsReturned  Decimal          @db.Decimal(12, 3)
  caratsWastage   Decimal          @default(0) @db.Decimal(12, 3)
  returnedAt      DateTime         @default(now())

  @@index([jobId])
  @@map("manufacturing_returns")
}

model PacketSplit {
  id           String   @id @default(cuid())
  companyId    String
  sourceItemId String
  createdById  String
  createdAt    DateTime @default(now())

  lines PacketSplitLine[]

  @@index([companyId])
  @@map("packet_splits")
}

model PacketSplitLine {
  id        String      @id @default(cuid())
  splitId   String
  split     PacketSplit @relation(fields: [splitId], references: [id], onDelete: Cascade)
  newItemId String
  carats    Decimal     @db.Decimal(12, 3)
  pieces    Int?

  @@map("packet_split_lines")
}

model PacketMerge {
  id           String   @id @default(cuid())
  companyId    String
  targetItemId String
  createdById  String
  createdAt    DateTime @default(now())

  lines PacketMergeLine[]

  @@index([companyId])
  @@map("packet_merges")
}

model PacketMergeLine {
  id           String      @id @default(cuid())
  mergeId      String
  merge        PacketMerge @relation(fields: [mergeId], references: [id], onDelete: Cascade)
  sourceItemId String
  carats       Decimal     @db.Decimal(12, 3)

  @@map("packet_merge_lines")
}

model WeightAdjustment {
  id             String             @id @default(cuid())
  companyId      String
  packetId       String
  packet         LooseDiamondPacket @relation(fields: [packetId], references: [id])
  previousCarats Decimal            @db.Decimal(12, 3)
  newCarats      Decimal            @db.Decimal(12, 3)
  reason         String
  adjustedById   String
  createdAt      DateTime           @default(now())

  @@index([companyId, packetId])
  @@map("weight_adjustments")
}

model StockReconciliation {
  id          String               @id @default(cuid())
  companyId   String
  branchId    String
  status      ReconciliationStatus @default(IN_PROGRESS)
  startedById String
  startedAt   DateTime             @default(now())
  completedAt DateTime?
  notes       String?

  items StockReconciliationItem[]

  @@index([companyId, branchId, status])
  @@map("stock_reconciliations")
}

model StockReconciliationItem {
  id               String              @id @default(cuid())
  reconciliationId String
  reconciliation   StockReconciliation @relation(fields: [reconciliationId], references: [id], onDelete: Cascade)
  inventoryItemId  String
  systemCarats     Decimal?            @db.Decimal(12, 3)
  physicalCarats   Decimal?            @db.Decimal(12, 3)
  systemFound      Boolean             @default(true)
  physicalFound    Boolean             @default(false)
  variance         Decimal?            @db.Decimal(12, 3)
  resolution       String?

  @@index([reconciliationId])
  @@map("stock_reconciliation_items")
}
```

---

## 13. Prisma Schema — Accounting Models

```prisma
model Account {
  id        String      @id @default(cuid())
  companyId String
  company   Company     @relation(fields: [companyId], references: [id], onDelete: Cascade)
  code      String
  name      String
  type      AccountType
  parentId  String?
  parent    Account?    @relation("AccountTree", fields: [parentId], references: [id])
  children  Account[]   @relation("AccountTree")
  isSystem  Boolean     @default(false)
  isActive  Boolean     @default(true)

  journalLines JournalLine[]

  @@unique([companyId, code])
  @@index([companyId, type])
  @@map("accounts")
}

model JournalEntry {
  id         String   @id @default(cuid())
  companyId  String
  entryNo    String
  entryDate  DateTime @db.Date
  memo       String?
  refType    String?
  refId      String?
  postedById String
  createdAt  DateTime @default(now())

  lines JournalLine[]

  @@unique([companyId, entryNo])
  @@index([companyId, refType, refId])
  @@index([companyId, entryDate])
  @@map("journal_entries")
}

model JournalLine {
  id        String       @id @default(cuid())
  entryId   String
  entry     JournalEntry @relation(fields: [entryId], references: [id], onDelete: Cascade)
  accountId String
  account   Account      @relation(fields: [accountId], references: [id])
  debit     Decimal      @default(0) @db.Decimal(14, 2)
  credit    Decimal      @default(0) @db.Decimal(14, 2)

  @@index([accountId])
  @@index([entryId])
  @@map("journal_lines")
}

model Payment {
  id           String           @id @default(cuid())
  companyId    String
  company      Company          @relation(fields: [companyId], references: [id], onDelete: Cascade)
  paymentNo    String
  direction    PaymentDirection
  customerId   String?
  customer     Customer?        @relation(fields: [customerId], references: [id])
  vendorId     String?
  vendor       Vendor?          @relation(fields: [vendorId], references: [id])
  branchId     String
  method       PaymentMethod
  currencyId   String
  currency     Currency         @relation(fields: [currencyId], references: [id])
  exchangeRate Decimal          @db.Decimal(14, 6)
  amount       Decimal          @db.Decimal(14, 2)
  baseAmount   Decimal          @db.Decimal(14, 2)
  reference    String?
  paymentDate  DateTime         @db.Date
  receivedById String
  notes        String?
  createdAt    DateTime         @default(now())
  deletedAt    DateTime?

  allocations PaymentAllocation[]

  @@unique([companyId, paymentNo])
  @@index([companyId, customerId, paymentDate])
  @@index([companyId, vendorId, paymentDate])
  @@index([companyId, branchId, paymentDate])
  @@map("payments")
}

model PaymentAllocation {
  id         String  @id @default(cuid())
  paymentId  String
  payment    Payment @relation(fields: [paymentId], references: [id], onDelete: Cascade)
  saleId     String?
  sale       Sale?   @relation(fields: [saleId], references: [id])
  purchaseId String?
  amount     Decimal @db.Decimal(14, 2)

  @@index([paymentId])
  @@index([saleId])
  @@map("payment_allocations")
}
```

---

## 14. Stock Movement Ledger

```prisma
model StockMovement {
  id            String        @id @default(cuid())
  companyId     String
  itemId        String
  item          InventoryItem @relation(fields: [itemId], references: [id])
  movementType  MovementType
  fromStatus    StockStatus?
  toStatus      StockStatus?
  fromBranchId  String?
  toBranchId    String?
  carats        Decimal?      @db.Decimal(12, 3)
  pieces        Int?
  refType       String?
  refId         String?
  performedById String
  notes         String?
  createdAt     DateTime      @default(now())

  @@index([companyId, itemId, createdAt])
  @@index([companyId, movementType, createdAt])
  @@index([companyId, refType, refId])
  @@index([companyId, createdAt])
  @@map("stock_movements")
}
```

**Invariant (enforced by `stock-movement.service.ts`, the only writer):** every change to `InventoryItem.status`, `LooseDiamondPacket.availableCarats`, or an item's `branchId` happens inside one `prisma.$transaction` that also inserts the corresponding `StockMovement` row.

Analytics powered by the ledger (all scoped by `companyId`):
- **Stock aging** — days since last `PURCHASE_IN`/`TRANSFER_IN` for items still `IN_STOCK`
- **Fast/slow moving & dead stock** — `SALE_OUT` frequency per shape/color/clarity over a window
- **Consumption analysis** — sum of `MANUFACTURING_ISSUE` minus `MANUFACTURING_RETURN`
- **Complete stone traceability** — stone detail page timeline filtered by `itemId`

---

## 15. Indexing & Performance Strategy

| Query | Index |
|---|---|
| Inventory list per company/branch/status/type | `inventory_items(companyId, itemType, status, branchId)` |
| Barcode scan | `inventory_items(companyId, barcode)` unique |
| Diamond search | `certified_diamonds(shape, caratWeight, color, clarity)` |
| Certificate number lookup | unique via itemId |
| Supplier-wise purchases | `purchases(companyId, vendorId, createdAt)` |
| Branch-wise sales analytics | `sales(companyId, branchId, soldAt)` |
| Salesperson analytics | `sales(companyId, salespersonId, soldAt)` |
| Pending transfers | `branch_transfers(companyId, toBranchId, status)` |
| Stone history | `stock_movements(companyId, itemId, createdAt)` |
| Expired holds | `holds(companyId, status, expiresAt)` |
| Unread notifications per user | `notifications(companyId, userId, isRead, createdAt)` |
| Overdue invoices (payment-due job) | `sales(companyId, paymentStatus, dueDate)` |
| Branch-scoped audit view | `audit_logs(companyId, branchId, createdAt)` |
| Platform companies | `companies(status)` |

Additional practices:
- **Pagination**: keyset (cursor) pagination — never OFFSET on large tables.
- **Analytics**: heavy aggregations via `$queryRaw` or materialized views refreshed nightly.
- **Tenant Client Extension**: `db/tenant-extension.ts` auto-injects `{ companyId }` on all model queries.
- **Full-text search**: OR queries over unique indexes. Add Postgres `tsvector` for free-text growth.
- **Media**: images/videos in object storage (S3/R2); DB stores URLs only.
- **Connection pooling**: PgBouncer / Prisma Accelerate in production.

---

## 16. Conventions & Rules

### Naming

| Thing | Convention | Example |
|---|---|---|
| Prisma models | PascalCase singular | `CertifiedDiamond` |
| DB tables | snake_case plural via `@@map` | `certified_diamonds` |
| DB columns | camelCase | `caratWeight` |
| Document numbers | `PREFIX-BRANCH-YEAR-SEQ` | `INV-MUM01-2026-00042` |
| Files/folders | kebab-case | `diamond-form.tsx` |
| Express controllers | noun-first kebab-case | `certified-diamonds.controller.ts` |
| Express services | verb-noun kebab-case | `stock-movement.service.ts` |
| Zod schemas | `<entity><Action>Schema` | `certifiedDiamondCreateSchema` |

### Data Rules

1. Never `Float` for money or carats. `Decimal(14,2)` money, `Decimal(12,3)` carats, `Decimal(14,6)` exchange rates.
2. `companyId` on every tenant query — enforced via Prisma Client Extension.
3. Base-currency snapshot on every financial document (`exchangeRate` + `baseTotal`). Reports aggregate `baseTotal` only.
4. `costAtSale` frozen on `SaleItem` — margin = lineTotal x exchangeRate - costAtSale.
5. Soft delete (`deletedAt`) on all business records.
6. All stock mutations through `stock-movement.service.ts` inside `$transaction` — no exceptions.
7. Status transitions validated in services.
8. One detail row per `InventoryItem`, matching `itemType`.
9. Document numbers per company — `numbering.service.ts` on `(companyId, key, branchId, year)`.

### Application Rules

10. RBAC at three layers: JWT verify → Express `require-permission.ts` (security boundary) → `use-permissions` hook (UI).
11. Two RBAC namespaces: Super Admin routes (`/api/super-admin/*`) via `require-super-admin.ts`; tenant routes via `tenant-scope.ts` + `require-permission.ts`.
12. Company onboarding (`company.service.ts`): creates company → seeds base currency, branch, system roles, permission matrix, chart of accounts — all scoped to new `companyId`.
13. Barcode prefix includes company slug: `SASH-CERT-00001`.
14. Seed data (`prisma/seed.ts`): one super admin, demo company, branches, roles, permissions, CoA, base currency.
15. Directory UI/UX Standardization: All directory tables (`customers`, `vendors`, `branches`) must follow `branches/page.tsx` executive design — no colored initials logo boxes, display Code Badge + bold Name, use `<MdLocationOn>` pin icons, smooth status toggle switches, square action card buttons (`h-7 w-7 rounded-lg`), and an Executive View Profile Modal (`<MdVisibility>`) accessible even to read-only users.
16. RBAC Synchronization: Any change to `PERMISSION_CATALOG` (`apps/api/src/lib/permissions.ts`) must be verified against backend endpoints in `apps/api/src/routes/tenant/*.routes.ts`. Use `requireAnyPermission('resource:list', 'resource:view')` on directory list routes (`GET /`).
17. Multi-Tab Auth Persistence: Always store `shashvat_refresh_token` in `localStorage` inside `auth-context.tsx` and `api-client.ts` so opening links in new tabs/windows inherits the active session without throwing `UNAUTHORIZED`.

### Suggested Libraries

| Concern | Library |
|---|---|
| Auth (frontend) | Custom auth context — JWT stored in memory, refresh token in localStorage, auto-attach Bearer via api-client |
| Auth (backend) | jsonwebtoken + custom middleware |
| Validation | Zod |
| UI | Tailwind CSS + shadcn/ui |
| Tables | TanStack Table (server-side pagination) |
| Forms | React Hook Form + zodResolver |
| Charts | Recharts |
| Barcode | bwip-js (Code 128), keyboard-wedge scanner input |
| PDF invoices | @react-pdf/renderer |
| File storage | S3-compatible (AWS S3 / Cloudflare R2) |
| Money math | decimal.js |
| Background jobs | node-cron in Express api/src/jobs/ |

---

## 17. Authentication Flow

### 17.1 Single Login Page — No Manual Selection

The login page collects **only two fields**:

- Email / Login ID
- Password

There is **no company selection, no role selection, no branch selection** on the login screen. The user must never be asked "which company?" or "which role?" — the backend figures it out.

### 17.2 Backend Identification

On `POST /api/auth/login` the backend resolves the user in this order:

1. Look up email in `super_admins` → if found and password valid → **Super Admin** session (`companyId: null`, `branchId: null`, `role: "SUPER_ADMIN"`).
2. Otherwise look up email in `users` (tenant table) → if found and password valid:
   - `branchId === null` → **Company Admin** (company-wide access).
   - `branchId !== null` → **Branch Admin / branch-scoped user** (access limited to that branch).
3. The JWT is generated with the resolved `companyId`, `branchId`, `role`, and flattened `permissions[]` (see `SessionPayload` in §1.3).

The user's identity alone determines scope. Company, role, and branch are **derived server-side from the database, never accepted from the client**.

### 17.3 Automatic Frontend Redirect

After login the frontend inspects the session and redirects automatically:

| Session | Redirect target |
|---|---|
| `role === "SUPER_ADMIN"` | `/(super-admin)` — platform dashboard |
| `companyId` set, `branchId === null` | `/(dashboard)` — company ERP dashboard |
| `companyId` set, `branchId` set | `/(dashboard)` — branch dashboard (branch pre-selected, switcher locked) |

The user never chooses a destination; the route guard in `middleware.ts` enforces the same mapping on every navigation, not just after login.

---

## 18. Roles & Capabilities

Three effective access tiers. Super Admin is defined in §1; the two tenant tiers are defined here. (Tenant RBAC is permission-based, so companies can create custom roles — "Company Admin" and "Branch Admin" are the two seeded system roles every company starts with.)

### 18.1 Company Admin

Scope: entire company (`companyId` set, `branchId: null`).

Company Admin **can**:

- Create branches
- Edit branches
- Disable branches
- Create users
- Create branch admins (assign a user to a branch with the Branch Admin role)
- Assign roles and permissions
- View company-wide reports (all branches)
- Manage inventory across all branches
- Transfer stock between branches
- Manage company settings (currencies, sequences, roles, chart of accounts)

Company Admin **cannot**:

- See or manage other companies
- Access any platform / Super Admin functionality

### 18.2 Branch Admin

Scope: single assigned branch (`companyId` set, `branchId` set).

Branch Admin **can** (within the assigned branch only):

- View only the assigned branch's data
- Sell (POS, invoices, returns)
- Purchase (entry, receive)
- Memo (issue, return, convert)
- Hold (place, release)
- Transfer (send to / receive from other branches — sees only transfers where own branch is sender or receiver)
- Manufacturing (jobs, issues, returns)
- Customers (CRUD)
- Vendors (CRUD)

Branch Admin **cannot**:

- Create branches
- Delete or modify the company
- Access company settings (users, roles, currencies, sequences)
- View other branches' stock, sales, or reports

Enforcement: `branchId` in the JWT is applied as a mandatory filter by the backend on every branch-scoped query (same pattern as `companyId` tenant scoping). The frontend hides other branches, but the API is the security boundary.

### 18.3 Granular Access Control & List Permission Synchronization

- **Granular Action Matrix**: Each module resource (`role`, `branch`, `user`, `customer`, `certified-diamond`, `sale`, etc.) supports granular actions (`list`, `view`, `create`, `update`, `delete`).
- **Automatic `list` Permission Synchronization (`autoIncludeListPermissions`)**: When a role is assigned any action (`create`, `update`, `delete`, or `view`) on a resource, the backend automatically attaches `resource:list`. This guarantees that sub-admins and staff members with mutation or view permissions can navigate to and list data in the UI without requiring administrators to manually check `list` checkboxes.
- **Frontend & Backend Gatekeeping**:
  - **Frontend (`usePermissions()`)**: Dynamically hides create buttons, edit modals, delete icons, and disables interactive form controls/checkboxes when the logged-in user lacks `create`, `update`, or `delete` permissions.
  - **Backend (`requirePermission` & `requireAnyPermission`)**: Enforces strict endpoint validation. Reading single or list views allows users with either `list` or `view` (`requireAnyPermission`), while mutation endpoints (`POST`, `PUT`, `DELETE`) enforce exact action permissions (`requirePermission`).

---

## 19. Frontend UX & Visibility Rules

### 19.1 The ERP Must Feel Standalone (Tenant Illusion Rule)

Tenant users (Company Admins, Branch Admins, staff) must **never** see the words:

- "Tenant"
- "SaaS"
- "Workspace"
- "Multi-Tenant"

or any other hint that other companies exist on the platform. To a company user, the product is **their company's standalone ERP** — their logo, their company name, their branches. No plan/subscription banners, no platform branding, no company switcher.

Only the **Super Admin portal** knows about and manages companies. All multi-tenant vocabulary is confined to `(super-admin)` routes, internal code, and this document.

### 19.2 Dashboard Visibility

| Role | Dashboard shown |
|---|---|
| Super Admin | Platform dashboard: **Companies**, **Platform Analytics**, **Subscriptions** |
| Company Admin | **ERP Dashboard**: company-wide KPIs, all branches |
| Branch Admin | **Branch Dashboard**: KPIs for the assigned branch only |

One login → one dashboard. No role ever sees another tier's dashboard.

### 19.3 Navigation Visibility (Permission-Driven Sidebar)

Sidebar items appear **only if the session holds the matching `view` permission**:

```
permissions includes "purchase.view"  →  Purchase menu rendered
otherwise                             →  Purchase menu hidden (not disabled — absent)
```

Rules:

- Every nav item in `config/navigation.ts` declares its required permission; `tenant-sidebar.tsx` filters through `use-permissions`.
- Hidden means removed from the DOM, not greyed out.
- Hiding a menu is UX only — the backend `require-permission.ts` middleware still rejects direct API calls, and route guards block direct URL entry.
- Same rule for in-page actions: buttons like "Approve", "Delete", "Export" render only with the matching action permission.

---

## 20. Notifications

Delivered in-app (notification center + badge), with WhatsApp/SMS/Email channels per event where noted. Generated by `notification.service.ts` as rows in the `notifications` table (see §7); time-based ones fired by cron jobs in `api/src/jobs/`.

| Event | Trigger | Recipients |
|---|---|---|
| **Hold Expiry** | `hold-expiry.job.ts` — hold `expiresAt` reached or approaching (24h warning) | Holder, branch admin |
| **Memo Expiry** | `memo-expiry.job.ts` — memo `expectedReturnDate` reached / overdue | Issuer, branch admin, company admin |
| **Approval Pending** | Purchase or discount enters `PENDING_APPROVAL` / `PENDING_DISCOUNT_APPROVAL` | Users holding the matching `*.approve` permission |
| **Stock Low** | `stock-low.job.ts` — branch stock below a `StockAlertRule` threshold (per item type / category / sieve) | Branch admin, company admin |
| **Transfer Received** | `BranchTransfer` → `RECEIVED` (also: incoming transfer pending acknowledgement) | Sender branch, receiver branch admin |
| **Payment Due** | `payment-due.job.ts` — `Sale.dueDate` unpaid past due; `Purchase.paymentDueDate` reaching due | Company admin, branch admin of selling branch |

Rules:

- All notifications are company-scoped (`companyId`) and respect branch scope — a Branch Admin never receives another branch's notifications.
- Each notification links to its source document.
- Delivery preferences (in-app / email / WhatsApp / SMS) configurable per company in settings — stored in `NotificationPreference` (one row per event type × channel).

---

## 21. Error Handling Standards

All API errors return one envelope (from `error-handler.ts`):

```ts
{
  success: false,
  error: {
    code: string,        // stable machine code, e.g. "STOCK_NOT_AVAILABLE"
    message: string,     // human-readable, safe to show in UI
    details?: unknown    // e.g. Zod field errors
  }
}
```

Four error classes:

| Class | HTTP | Examples | Frontend behavior |
|---|---|---|---|
| **Validation errors** | 400 | Zod schema failure, bad enum, missing field | Show field-level errors on the form (`details` maps field → message) |
| **Permission errors** | 403 | Missing permission, branch-scope violation, tenant-scope violation, Super Admin hitting tenant route | Toast "You don't have permission for this action"; never reveal what the resource was |
| **Stock errors** | 409 | Item not `IN_STOCK` at sale time, insufficient `availableCarats`, item already on memo/hold, barcode not found in branch | Toast with the specific stock reason; refresh item status in UI |
| **Business rule errors** | 422 | Invalid status transition (e.g. approve a non-DRAFT purchase), credit limit exceeded, unbalanced journal entry, memo conversion on returned item | Toast/dialog with the rule violated |

Rules:

- Error `code` values are a fixed catalog in `packages/shared-types` — frontend switches on `code`, never parses `message`.
- Validation happens twice: Zod on the frontend form and the **same Zod schema** on the API (source of truth).
- Stock and business-rule checks run inside the same `$transaction` as the mutation — no check-then-act races.
- Unexpected errors (500) log full detail server-side; client receives only a generic message + correlation id. Never leak stack traces, SQL, or other tenants' data.

---

## 22. Audit Strategy

Every auditable action writes to `AuditLog` (tenant, §7) or `PlatformAuditLog` (Super Admin, §6) — who (`userId`), what (`action`, `entityType`, `entityId`), before/after JSON, IP, timestamp.

Audited actions:

| Action | Notes |
|---|---|
| **Create** | `after` snapshot |
| **Update** | `before` + `after` diff |
| **Delete** | soft delete recorded with `before` snapshot |
| **Approval** | purchase approval, discount approval — who approved, when |
| **Print** | invoice / memo / label print events (document id + user) |
| **Export** | report/CSV/PDF exports (which report, filters used) |
| **Login** | success and failure (failure logs email + IP, no user link) |
| **Logout** | session end |
| **Password Change** | never log the password — event only |

Rules:

- Audit writes happen in the same `$transaction` as the mutation for Create/Update/Delete/Approval; Print/Export/Login/Logout are fire-and-forget appends.
- Audit log is append-only — no update or delete API exists for it.
- Viewing audit logs requires `audit.view` permission (Company Admin by default); Branch Admins see only their branch's entries.

---

## 23. Reporting Permissions

Report access follows role scope:

```
Company Admin  →  All reports, all branches (company-wide + per-branch drill-down)
Branch Admin   →  Only reports for the assigned branch
```

Rules:

- Every report endpoint applies the JWT `branchId` filter: `branchId === null` (Company Admin) may pass any branch filter or none; `branchId` set forces `WHERE branchId = session.branchId` regardless of what the client requests.
- Report list in the UI is permission-filtered like navigation (§19.3) — e.g. `report.sales.view`, `report.stock.view`.
- Exports inherit the same scope and are audit-logged (§22).
- Company-wide aggregates (e.g. total company sales) are never exposed to a branch-scoped session, not even as a summary card.

---

## 24. Recommended Build Order

1. **Platform Foundation** — monorepo scaffold, Prisma multi-file schema, Docker Compose (Postgres + MinIO).
2. **Super Admin** — `SuperAdmin` model, JWT auth, company CRUD, platform dashboard.
3. **Company Onboarding** — `company.service.ts`: create company seeds base currency, branch, system roles, permission matrix, chart of accounts.
4. **Tenant Auth & RBAC** — tenant login, JWT with `companyId`/`branchId`, `tenant-scope.ts`, `require-permission.ts`, Prisma Client Extension auto-inject.
5. **Tenant Masters** — branches, users, customers, vendors, currencies, media upload.
6. **Certified Diamond Inventory** — `InventoryItem` + `CertifiedDiamond` CRUD, barcode generation (company-prefixed), media, `stock-movement.service.ts`.
7. **Purchases** — entry → approval → receive (creates InventoryItem + PURCHASE_IN movement), returns.
8. **Sales** — POS flow, barcode scan, discount approval, invoice PDF, payments, auto-journal posting.
9. **Memo / Hold / Transfers** — status machines on top of the movement service.
10. **Loose Diamonds** — packets, parcels, split/merge, weight adjustments, manufacturing.
11. **Jewelry** — categories, pieces, manufacturing output linkage, order/repair management.
12. **Accounting** — chart of accounts, payment allocation, ledgers, GSTR reports, P&L, balance sheet.
13. **Analytics & Reports** — movement-ledger queries, dashboards per company, exports, stock reconciliation.
14. **Notifications** — WhatsApp/SMS/Email, low-stock alerts, approval alerts, hold-expiry cron job.

Each step ships something usable. Nothing in a later step forces a schema change to an earlier one — that is what the unified InventoryItem + StockMovement + companyId design buys you.
