import { PrismaClient, Prisma } from '@prisma/client';

export interface PermissionDefinition {
  resource: string;
  action: string;
}

export const PERMISSION_CATALOG: PermissionDefinition[] = [
  // Branch
  { resource: 'branch', action: 'view' },
  { resource: 'branch', action: 'create' },
  { resource: 'branch', action: 'update' },
  { resource: 'branch', action: 'delete' },

  // User
  { resource: 'user', action: 'view' },
  { resource: 'user', action: 'create' },
  { resource: 'user', action: 'update' },
  { resource: 'user', action: 'delete' },

  // Role
  { resource: 'role', action: 'view' },
  { resource: 'role', action: 'create' },
  { resource: 'role', action: 'update' },
  { resource: 'role', action: 'delete' },

  // Currency
  { resource: 'currency', action: 'view' },
  { resource: 'currency', action: 'create' },
  { resource: 'currency', action: 'update' },
  { resource: 'currency', action: 'delete' },

  // Sequence
  { resource: 'sequence', action: 'view' },
  { resource: 'sequence', action: 'create' },
  { resource: 'sequence', action: 'update' },
  { resource: 'sequence', action: 'delete' },

  // Settings
  { resource: 'settings', action: 'view' },
  { resource: 'settings', action: 'update' },

  // Customer
  { resource: 'customer', action: 'view' },
  { resource: 'customer', action: 'create' },
  { resource: 'customer', action: 'update' },
  { resource: 'customer', action: 'delete' },

  // Vendor
  { resource: 'vendor', action: 'view' },
  { resource: 'vendor', action: 'create' },
  { resource: 'vendor', action: 'update' },
  { resource: 'vendor', action: 'delete' },

  // Inventory
  { resource: 'inventory', action: 'view' },
  { resource: 'inventory', action: 'create' },
  { resource: 'inventory', action: 'update' },
  { resource: 'inventory', action: 'delete' },
  { resource: 'inventory', action: 'adjust' },

  // Certified Diamond
  { resource: 'certified-diamond', action: 'view' },
  { resource: 'certified-diamond', action: 'create' },
  { resource: 'certified-diamond', action: 'update' },
  { resource: 'certified-diamond', action: 'delete' },

  // Loose Diamond
  { resource: 'loose-diamond', action: 'view' },
  { resource: 'loose-diamond', action: 'create' },
  { resource: 'loose-diamond', action: 'update' },
  { resource: 'loose-diamond', action: 'delete' },

  // Jewelry
  { resource: 'jewelry', action: 'view' },
  { resource: 'jewelry', action: 'create' },
  { resource: 'jewelry', action: 'update' },
  { resource: 'jewelry', action: 'delete' },

  // Purchase
  { resource: 'purchase', action: 'view' },
  { resource: 'purchase', action: 'create' },
  { resource: 'purchase', action: 'update' },
  { resource: 'purchase', action: 'delete' },
  { resource: 'purchase', action: 'approve' },
  { resource: 'purchase', action: 'receive' },

  // Sale
  { resource: 'sale', action: 'view' },
  { resource: 'sale', action: 'create' },
  { resource: 'sale', action: 'update' },
  { resource: 'sale', action: 'delete' },
  { resource: 'sale', action: 'discount-approve' },
  { resource: 'sale', action: 'return' },

  // Memo
  { resource: 'memo', action: 'view' },
  { resource: 'memo', action: 'create' },
  { resource: 'memo', action: 'return' },
  { resource: 'memo', action: 'convert' },

  // Hold
  { resource: 'hold', action: 'view' },
  { resource: 'hold', action: 'create' },
  { resource: 'hold', action: 'release' },

  // Transfer
  { resource: 'transfer', action: 'view' },
  { resource: 'transfer', action: 'create' },
  { resource: 'transfer', action: 'receive' },

  // Manufacturing
  { resource: 'manufacturing', action: 'view' },
  { resource: 'manufacturing', action: 'create' },
  { resource: 'manufacturing', action: 'update' },
  { resource: 'manufacturing', action: 'complete' },

  // Accounting
  { resource: 'accounting', action: 'view' },
  { resource: 'accounting', action: 'create' },
  { resource: 'accounting', action: 'update' },

  // Payment
  { resource: 'payment', action: 'view' },
  { resource: 'payment', action: 'create' },

  // Report
  { resource: 'report', action: 'view' },
  { resource: 'report', action: 'export' },

  // Audit
  { resource: 'audit', action: 'view' },

  // Notification
  { resource: 'notification', action: 'view' },
  { resource: 'notification', action: 'manage' },
];

export const COMPANY_ADMIN_PERMISSIONS: PermissionDefinition[] = PERMISSION_CATALOG;

export const BRANCH_ADMIN_PERMISSIONS: PermissionDefinition[] = PERMISSION_CATALOG.filter((p) => {
  if (['branch', 'user', 'role', 'currency', 'sequence', 'settings', 'audit'].includes(p.resource)) {
    return false;
  }
  if (p.resource === 'inventory' && p.action !== 'view') {
    return false;
  }
  if (p.resource === 'purchase' && ['delete', 'approve'].includes(p.action)) {
    return false;
  }
  if (p.resource === 'sale' && ['delete', 'discount-approve'].includes(p.action)) {
    return false;
  }
  if (p.resource === 'report' && p.action !== 'view') {
    return false;
  }
  if (p.resource === 'notification' && p.action !== 'view') {
    return false;
  }
  return true;
});

export async function syncPermissionCatalog(tx: Prisma.TransactionClient | PrismaClient) {
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

  return tx.permission.findMany();
}
