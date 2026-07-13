import { PrismaClient, Prisma } from '@prisma/client';

export interface PermissionDefinition {
  resource: string;
  action: string;
}

export const PERMISSION_CATALOG: PermissionDefinition[] = [
  // Branch
  { resource: 'branch', action: 'list' },
  { resource: 'branch', action: 'create' },
  { resource: 'branch', action: 'update' },
  { resource: 'branch', action: 'delete' },

  // User
  { resource: 'user', action: 'list' },
  { resource: 'user', action: 'view' },
  { resource: 'user', action: 'create' },
  { resource: 'user', action: 'update' },
  { resource: 'user', action: 'delete' },

  // Role
  { resource: 'role', action: 'list' },
  { resource: 'role', action: 'view' },
  { resource: 'role', action: 'create' },
  { resource: 'role', action: 'update' },
  { resource: 'role', action: 'delete' },

  // Currency
  { resource: 'currency', action: 'list' },
  { resource: 'currency', action: 'view' },
  { resource: 'currency', action: 'create' },
  { resource: 'currency', action: 'update' },
  { resource: 'currency', action: 'delete' },

  // Sequence
  { resource: 'sequence', action: 'list' },
  { resource: 'sequence', action: 'update' },

  // Settings
  { resource: 'settings', action: 'view' },
  { resource: 'settings', action: 'update' },

  // Customer
  { resource: 'customer', action: 'list' },
  { resource: 'customer', action: 'view' },
  { resource: 'customer', action: 'create' },
  { resource: 'customer', action: 'update' },
  { resource: 'customer', action: 'delete' },

  // Vendor
  { resource: 'vendor', action: 'list' },
  { resource: 'vendor', action: 'view' },
  { resource: 'vendor', action: 'create' },
  { resource: 'vendor', action: 'update' },
  { resource: 'vendor', action: 'delete' },

  // Inventory
  { resource: 'inventory', action: 'list' },
  { resource: 'inventory', action: 'view' },
  { resource: 'inventory', action: 'create' },
  { resource: 'inventory', action: 'update' },
  { resource: 'inventory', action: 'delete' },
  { resource: 'inventory', action: 'adjust' },

  // Certified Diamond
  { resource: 'certified-diamond', action: 'list' },
  { resource: 'certified-diamond', action: 'view' },
  { resource: 'certified-diamond', action: 'create' },
  { resource: 'certified-diamond', action: 'update' },
  { resource: 'certified-diamond', action: 'delete' },

  // Loose Diamond
  { resource: 'loose-diamond', action: 'list' },
  { resource: 'loose-diamond', action: 'view' },
  { resource: 'loose-diamond', action: 'create' },
  { resource: 'loose-diamond', action: 'update' },
  { resource: 'loose-diamond', action: 'delete' },

  // Jewelry
  { resource: 'jewelry', action: 'list' },
  { resource: 'jewelry', action: 'view' },
  { resource: 'jewelry', action: 'create' },
  { resource: 'jewelry', action: 'update' },
  { resource: 'jewelry', action: 'delete' },

  // Purchase
  { resource: 'purchase', action: 'list' },
  { resource: 'purchase', action: 'view' },
  { resource: 'purchase', action: 'create' },
  { resource: 'purchase', action: 'update' },
  { resource: 'purchase', action: 'delete' },
  { resource: 'purchase', action: 'approve' },
  { resource: 'purchase', action: 'receive' },

  // Sale
  { resource: 'sale', action: 'list' },
  { resource: 'sale', action: 'view' },
  { resource: 'sale', action: 'create' },
  { resource: 'sale', action: 'update' },
  { resource: 'sale', action: 'delete' },
  { resource: 'sale', action: 'discount-approve' },
  { resource: 'sale', action: 'return' },

  // Memo
  { resource: 'memo', action: 'list' },
  { resource: 'memo', action: 'view' },
  { resource: 'memo', action: 'create' },
  { resource: 'memo', action: 'return' },
  { resource: 'memo', action: 'convert' },

  // Hold
  { resource: 'hold', action: 'list' },
  { resource: 'hold', action: 'view' },
  { resource: 'hold', action: 'create' },
  { resource: 'hold', action: 'release' },

  // Transfer
  { resource: 'transfer', action: 'list' },
  { resource: 'transfer', action: 'view' },
  { resource: 'transfer', action: 'create' },
  { resource: 'transfer', action: 'receive' },

  // Manufacturing
  { resource: 'manufacturing', action: 'list' },
  { resource: 'manufacturing', action: 'view' },
  { resource: 'manufacturing', action: 'create' },
  { resource: 'manufacturing', action: 'update' },
  { resource: 'manufacturing', action: 'complete' },

  // Accounting
  { resource: 'accounting', action: 'list' },
  { resource: 'accounting', action: 'view' },
  { resource: 'accounting', action: 'create' },
  { resource: 'accounting', action: 'update' },

  // Payment
  { resource: 'payment', action: 'list' },
  { resource: 'payment', action: 'view' },
  { resource: 'payment', action: 'create' },

  // Report
  { resource: 'report', action: 'list' },
  { resource: 'report', action: 'view' },
  { resource: 'report', action: 'export' },

  // Audit
  { resource: 'audit', action: 'list' },
  { resource: 'audit', action: 'view' },

  // Notification
  { resource: 'notification', action: 'list' },
  { resource: 'notification', action: 'view' },
  { resource: 'notification', action: 'manage' },
];

export const COMPANY_ADMIN_PERMISSIONS: PermissionDefinition[] = PERMISSION_CATALOG;

export const BRANCH_ADMIN_PERMISSIONS: PermissionDefinition[] = PERMISSION_CATALOG.filter((p) => {
  if (['branch', 'user', 'role', 'currency', 'sequence', 'settings', 'audit'].includes(p.resource)) {
    return false;
  }
  if (p.resource === 'inventory' && !['list', 'view'].includes(p.action)) {
    return false;
  }
  if (p.resource === 'purchase' && ['delete', 'approve'].includes(p.action)) {
    return false;
  }
  if (p.resource === 'sale' && ['delete', 'discount-approve'].includes(p.action)) {
    return false;
  }
  if (p.resource === 'report' && !['list', 'view'].includes(p.action)) {
    return false;
  }
  if (p.resource === 'notification' && !['list', 'view'].includes(p.action)) {
    return false;
  }
  return true;
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function syncPermissionCatalog(tx: any) {
  // 1. Upsert all catalog permissions — add new ones, skip existing ones.
  // We intentionally do NOT delete removed permissions here because they
  // may be referenced by RolePermission foreign keys and deleting them
  // would violate constraints. Obsolete permissions are simply filtered
  // out of the catalog returned to the UI.
  for (const item of PERMISSION_CATALOG) {
    await tx.permission.upsert({
      where: {
        resource_action: {
          resource: item.resource,
          action: item.action,
        },
      },
      update: {},
      create: {
        resource: item.resource,
        action: item.action,
      },
    });
  }

  const allPerms: { id: string; resource: string; action: string }[] = await tx.permission.findMany();
  const permMap = new Map<string, string>();
  for (const p of allPerms) {
    permMap.set(`${p.resource}:${p.action}`, p.id);
  }

  // 2. Re-sync system role permissions so Company Admin and Branch Admin
  //    always match PERMISSION_CATALOG (fixes stale roles after catalog changes).
  const systemRoles: { id: string; name: string }[] = await tx.role.findMany({
    where: { isSystem: true },
  });

  for (const role of systemRoles) {
    const isCompanyAdminRole =
      role.name === 'Company Administrator' || role.name === 'COMPANY_ADMIN';
    const isBranchAdminRole =
      role.name === 'Branch Administrator' || role.name === 'BRANCH_ADMIN';

    if (!isCompanyAdminRole && !isBranchAdminRole) continue;

    const targetPerms = isCompanyAdminRole
      ? COMPANY_ADMIN_PERMISSIONS
      : BRANCH_ADMIN_PERMISSIONS;

    // Delete all existing role permissions and re-insert from current catalog
    await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
    for (const p of targetPerms) {
      const permId = permMap.get(`${p.resource}:${p.action}`);
      if (permId) {
        await tx.rolePermission.create({
          data: { roleId: role.id, permissionId: permId },
        });
      }
    }
  }

  return allPerms;
}
