import { getTenantClient } from '../db/tenant-extension.js';
import { PERMISSION_CATALOG, syncPermissionCatalog } from '../lib/permissions.js';
import { BusinessRuleError, NotFoundError } from '../lib/errors.js';

export function autoIncludeListPermissions(permissions: string[]): string[] {
  const set = new Set(permissions);
  for (const key of permissions) {
    const [res] = key.split(':');
    if (res) {
      set.add(`${res}:list`);
    }
  }
  return Array.from(set);
}

export async function listRoles(companyId: string) {
  const tenantDb = getTenantClient(companyId);
  await syncPermissionCatalog(tenantDb);

  const roles = await tenantDb.role.findMany({
    where: {
      name: { notIn: ['Company Administrator', 'Branch Administrator'] },
    },
    orderBy: { createdAt: 'asc' },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
      _count: {
        select: { users: true },
      },
    },
  });

  const formattedRoles = roles.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    isSystem: r.isSystem,
    userCount: r._count.users,
    createdAt: r.createdAt,
    permissions: r.permissions.map(
      (rp) => `${rp.permission.resource}:${rp.permission.action}`
    ),
  }));

  return {
    roles: formattedRoles,
    catalog: PERMISSION_CATALOG,
  };
}

export async function createRole(
  companyId: string,
  input: {
    name: string;
    description?: string;
    permissions?: string[];
  }
) {
  if (!input.name || input.name.trim().length < 2) {
    throw new BusinessRuleError('Role name must be at least 2 characters long');
  }

  const tenantDb = getTenantClient(companyId);
  await syncPermissionCatalog(tenantDb);

  const allPerms = await tenantDb.permission.findMany();
  const permMap = new Map<string, string>();
  for (const p of allPerms) {
    permMap.set(`${p.resource}:${p.action}`, p.id);
  }

  const newRole = await tenantDb.role.create({
    data: {
      companyId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      isSystem: false,
    },
  });

  if (Array.isArray(input.permissions) && input.permissions.length > 0) {
    const normalizedPerms = autoIncludeListPermissions(input.permissions);
    for (const key of normalizedPerms) {
      const permId = permMap.get(key);
      if (permId) {
        await tenantDb.rolePermission.create({
          data: {
            roleId: newRole.id,
            permissionId: permId,
          },
        });
      }
    }
  }

  return newRole;
}

export async function updateRole(
  companyId: string,
  roleId: string,
  input: {
    name?: string;
    description?: string;
    permissions?: string[];
  }
) {
  const tenantDb = getTenantClient(companyId);

  const existingRole = await tenantDb.role.findFirst({
    where: { id: roleId },
  });

  if (!existingRole) {
    throw new NotFoundError('Role not found');
  }

  const updateData: { name?: string; description?: string | null } = {};
  if (!existingRole.isSystem && input.name !== undefined) {
    updateData.name = input.name.trim();
  }
  if (input.description !== undefined) {
    updateData.description = input.description.trim() || null;
  }

  await tenantDb.role.update({
    where: { id: roleId },
    data: updateData,
  });

  if (Array.isArray(input.permissions)) {
    await syncPermissionCatalog(tenantDb);
    const allPerms = await tenantDb.permission.findMany();
    const permMap = new Map<string, string>();
    for (const p of allPerms) {
      permMap.set(`${p.resource}:${p.action}`, p.id);
    }

    await tenantDb.rolePermission.deleteMany({
      where: { roleId },
    });

    const normalizedPerms = autoIncludeListPermissions(input.permissions);
    for (const key of normalizedPerms) {
      const permId = permMap.get(key);
      if (permId) {
        await tenantDb.rolePermission.create({
          data: {
            roleId,
            permissionId: permId,
          },
        });
      }
    }
  }

  return { success: true, message: 'Role updated successfully' };
}

export async function deleteRole(companyId: string, roleId: string) {
  const tenantDb = getTenantClient(companyId);

  const existingRole = await tenantDb.role.findFirst({
    where: { id: roleId },
    include: { _count: { select: { users: true } } },
  });

  if (!existingRole) {
    throw new NotFoundError('Role not found');
  }

  if (existingRole.isSystem) {
    throw new BusinessRuleError('Cannot delete system roles');
  }

  if (existingRole._count.users > 0) {
    throw new BusinessRuleError(
      `Cannot delete role assigned to ${existingRole._count.users} user(s). Please reassign them first.`
    );
  }

  await tenantDb.role.delete({
    where: { id: roleId },
  });

  return { success: true, message: 'Role deleted successfully' };
}

export async function getRoleById(companyId: string, roleId: string) {
  const tenantDb = getTenantClient(companyId);
  await syncPermissionCatalog(tenantDb);

  const role = await tenantDb.role.findFirst({
    where: { id: roleId },
    include: {
      permissions: {
        include: { permission: true },
      },
      _count: { select: { users: true } },
    },
  });

  if (!role) {
    throw new NotFoundError('Role not found');
  }

  return {
    role: {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      userCount: role._count.users,
      createdAt: role.createdAt,
      permissions: role.permissions.map(
        (rp) => `${rp.permission.resource}:${rp.permission.action}`
      ),
    },
    catalog: PERMISSION_CATALOG,
  };
}

