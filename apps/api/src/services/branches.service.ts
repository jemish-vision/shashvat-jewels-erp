import { getTenantClient } from '../db/tenant-extension.js';
import { BusinessRuleError, NotFoundError } from '../lib/errors.js';

export async function listBranches(companyId: string) {
  const tenantDb = getTenantClient(companyId);

  const branches = await tenantDb.branch.findMany({
    where: {
      code: { not: 'HQ' },
      name: { not: 'Headquarters' },
    },
    orderBy: { createdAt: 'asc' },
    include: {
      _count: {
        select: {
          users: true,
          inventoryItems: true,
        },
      },
    },
  });

  return branches.map((b) => ({
    id: b.id,
    code: b.code,
    name: b.name,
    address: b.address,
    city: b.city,
    phone: b.phone,
    isActive: b.isActive,
    userCount: b._count.users,
    stockCount: b._count.inventoryItems,
    createdAt: b.createdAt,
  }));
}

export async function createBranch(
  companyId: string,
  input: {
    code: string;
    name: string;
    address?: string;
    city?: string;
    phone?: string;
    isActive?: boolean;
  }
) {
  if (!input.code || !input.name) {
    throw new BusinessRuleError('Branch code and name are required');
  }

  const tenantDb = getTenantClient(companyId);

  const existing = await tenantDb.branch.findFirst({
    where: {
      code: input.code.toUpperCase().trim(),
    },
  });

  if (existing) {
    throw new BusinessRuleError('A branch with this code already exists');
  }

  const branch = await tenantDb.branch.create({
    data: {
      companyId,
      code: input.code.toUpperCase().trim(),
      name: input.name.trim(),
      address: input.address?.trim() || null,
      city: input.city?.trim() || null,
      phone: input.phone?.trim() || null,
      isActive: input.isActive ?? true,
    },
  });

  return {
    id: branch.id,
    code: branch.code,
    name: branch.name,
    address: branch.address,
    city: branch.city,
    phone: branch.phone,
    isActive: branch.isActive,
    userCount: 0,
    stockCount: 0,
  };
}

export async function updateBranch(
  companyId: string,
  branchId: string,
  input: {
    code?: string;
    name?: string;
    address?: string;
    city?: string;
    phone?: string;
    isActive?: boolean;
  }
) {
  const tenantDb = getTenantClient(companyId);

  const existing = await tenantDb.branch.findFirst({
    where: { id: branchId },
  });

  if (!existing) {
    throw new NotFoundError('Branch not found');
  }

  const updateData: {
    code?: string;
    name?: string;
    address?: string | null;
    city?: string | null;
    phone?: string | null;
    isActive?: boolean;
  } = {};

  if (input.code) updateData.code = input.code.toUpperCase().trim();
  if (input.name) updateData.name = input.name.trim();
  if (input.address !== undefined) updateData.address = input.address?.trim() || null;
  if (input.city !== undefined) updateData.city = input.city?.trim() || null;
  if (input.phone !== undefined) updateData.phone = input.phone?.trim() || null;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;

  const updated = await tenantDb.branch.update({
    where: { id: branchId },
    data: updateData,
    include: {
      _count: {
        select: {
          users: true,
          inventoryItems: true,
        },
      },
    },
  });

  return {
    id: updated.id,
    code: updated.code,
    name: updated.name,
    address: updated.address,
    city: updated.city,
    phone: updated.phone,
    isActive: updated.isActive,
    userCount: updated._count.users,
    stockCount: updated._count.inventoryItems,
  };
}

export async function deleteBranch(companyId: string, branchId: string) {
  const tenantDb = getTenantClient(companyId);

  const existing = await tenantDb.branch.findFirst({
    where: { id: branchId },
    include: {
      _count: {
        select: {
          users: true,
          inventoryItems: true,
        },
      },
    },
  });

  if (!existing) {
    throw new NotFoundError('Branch not found');
  }

  if (existing._count.users > 0) {
    throw new BusinessRuleError(
      `Cannot delete branch assigned to ${existing._count.users} user(s). Please reassign them first.`
    );
  }

  if (existing._count.inventoryItems > 0) {
    throw new BusinessRuleError(
      `Cannot delete branch containing ${existing._count.inventoryItems} stock item(s). Transfer stock first.`
    );
  }

  await tenantDb.branch.delete({
    where: { id: branchId },
  });

  return { success: true, message: 'Branch deleted successfully' };
}
