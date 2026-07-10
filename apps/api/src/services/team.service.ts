import bcrypt from 'bcryptjs';
import { getTenantClient } from '../db/tenant-extension.js';
import { BusinessRuleError, NotFoundError } from '../lib/errors.js';

export async function listTeamMembers(companyId: string) {
  const tenantDb = getTenantClient(companyId);

  const [users, roles, branches] = await Promise.all([
    tenantDb.user.findMany({
      where: {
        role: { name: { not: 'Company Administrator' } },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        role: true,
        branch: true,
      },
    }),
    tenantDb.role.findMany({
      where: {
        name: { not: 'Company Administrator' },
      },
      orderBy: { name: 'asc' },
    }),
    tenantDb.branch.findMany({
      where: {
        isActive: true,
        code: { not: 'HQ' },
        name: { not: 'Headquarters' },
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  const formattedUsers = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    roleName: u.role?.name || 'Custom Profile',
    roleId: u.roleId,
    branchName: u.branch?.name || 'All Branches (HQ / Global)',
    branchId: u.branchId,
    isActive: u.isActive,
    adminType: u.branchId ? 'BRANCH_ADMIN' : 'SUB_ADMIN',
    createdAt: u.createdAt,
  }));

  return {
    members: formattedUsers,
    roles: roles.map((r) => ({
      id: r.id,
      name: r.name,
      isSystem: r.isSystem,
      description: r.description,
    })),
    branches: branches.map((b) => ({
      id: b.id,
      name: b.name,
      code: b.code,
      isDefault: false,
    })),
  };
}

export async function createTeamMember(
  companyId: string,
  input: {
    name: string;
    email: string;
    password: string;
    roleId: string;
    branchId?: string | null;
  }
) {
  if (!input.name || !input.email || !input.password || !input.roleId) {
    throw new BusinessRuleError('Name, email, password, and role are required');
  }

  const tenantDb = getTenantClient(companyId);

  const existing = await tenantDb.user.findUnique({
    where: { email: input.email.toLowerCase().trim() },
  });

  if (existing) {
    throw new BusinessRuleError('A user with this email address already exists');
  }

  const roleObj = await tenantDb.role.findUnique({
    where: { id: input.roleId },
  });

  if (!roleObj) {
    throw new NotFoundError('Selected role does not exist');
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  const newUser = await tenantDb.user.create({
    data: {
      companyId,
      email: input.email.toLowerCase().trim(),
      name: input.name.trim(),
      passwordHash,
      roleId: roleObj.id,
      branchId: input.branchId || null,
      isActive: true,
    },
    include: {
      role: true,
      branch: true,
    },
  });

  return {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    roleName: newUser.role?.name || 'Custom Profile',
    roleId: newUser.roleId,
    branchName: newUser.branch?.name || 'All Branches (HQ / Global)',
    branchId: newUser.branchId,
    isActive: newUser.isActive,
  };
}

export async function updateTeamMember(
  companyId: string,
  userId: string,
  input: {
    name?: string;
    roleId?: string;
    branchId?: string | null;
    isActive?: boolean;
  }
) {
  const tenantDb = getTenantClient(companyId);

  const existing = await tenantDb.user.findFirst({
    where: { id: userId },
  });

  if (!existing) {
    throw new NotFoundError('Team member not found');
  }

  const updateData: {
    name?: string;
    roleId?: string;
    branchId?: string | null;
    isActive?: boolean;
  } = {};

  if (input.name) updateData.name = input.name.trim();
  if (input.isActive !== undefined) updateData.isActive = input.isActive;
  if (input.branchId !== undefined) updateData.branchId = input.branchId || null;

  if (input.roleId) {
    const roleObj = await tenantDb.role.findUnique({
      where: { id: input.roleId },
    });
    if (roleObj) {
      updateData.roleId = roleObj.id;
    }
  }

  const updated = await tenantDb.user.update({
    where: { id: userId },
    data: updateData,
    include: {
      role: true,
      branch: true,
    },
  });

  return {
    id: updated.id,
    name: updated.name,
    email: updated.email,
    roleName: updated.role?.name || 'Custom Profile',
    roleId: updated.roleId,
    branchName: updated.branch?.name || 'All Branches (HQ / Global)',
    branchId: updated.branchId,
    isActive: updated.isActive,
  };
}

export async function deleteTeamMember(companyId: string, userId: string) {
  const tenantDb = getTenantClient(companyId);

  const existing = await tenantDb.user.findFirst({
    where: { id: userId },
  });

  if (!existing) {
    throw new NotFoundError('Team member not found');
  }

  await tenantDb.user.delete({
    where: { id: userId },
  });

  return { success: true, message: 'Team member removed successfully' };
}
