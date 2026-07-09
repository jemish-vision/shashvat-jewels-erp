import { prisma } from '../db/prisma.js';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import type { CompanyListQuery, CreateCompanyInput, UpdateCompanyInput } from '../schemas/company.schema.js';
import { DuplicateEntityError, NotFoundError, BusinessRuleError } from '../lib/errors.js';
import {
  syncPermissionCatalog,
  COMPANY_ADMIN_PERMISSIONS,
  BRANCH_ADMIN_PERMISSIONS,
} from '../lib/permissions.js';
import { seedDefaultCoA } from '../lib/default-coa.js';
import { clearCompanyStatusCache } from '../middleware/tenant-scope.js';

function getCurrencySymbol(code: string): string {
  switch (code.toUpperCase()) {
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'INR':
      return '₹';
    default:
      return code;
  }
}

export async function onboardCompanySeed(
  tx: Prisma.TransactionClient,
  company: { id: string; name: string; baseCurrency: string; email?: string | null },
  adminInput?: { email: string; passwordHash: string }
) {
  // 1. Sync global permission catalog
  const allPerms = await syncPermissionCatalog(tx);
  const permMap = new Map<string, string>();
  for (const p of allPerms) {
    permMap.set(`${p.resource}:${p.action}`, p.id);
  }

  // 2. Base currency
  await tx.currency.upsert({
    where: { companyId_code: { companyId: company.id, code: company.baseCurrency } },
    update: { isBase: true },
    create: {
      companyId: company.id,
      code: company.baseCurrency,
      name: company.baseCurrency,
      symbol: getCurrencySymbol(company.baseCurrency),
      isBase: true,
      isActive: true,
    },
  });

  // 3. HQ branch
  await tx.branch.upsert({
    where: { companyId_code: { companyId: company.id, code: 'HQ' } },
    update: {},
    create: {
      companyId: company.id,
      code: 'HQ',
      name: 'Headquarters',
      isActive: true,
    },
  });

  // 4. System Roles: Company Administrator & Branch Administrator
  const companyAdminRole = await tx.role.upsert({
    where: { companyId_name: { companyId: company.id, name: 'Company Administrator' } },
    update: {},
    create: {
      companyId: company.id,
      name: 'Company Administrator',
      description: 'Full administrative access for company',
      isSystem: true,
    },
  });

  const branchAdminRole = await tx.role.upsert({
    where: { companyId_name: { companyId: company.id, name: 'Branch Administrator' } },
    update: {},
    create: {
      companyId: company.id,
      name: 'Branch Administrator',
      description: 'Administrative access scoped to assigned branch',
      isSystem: true,
    },
  });

  // Attach permission matrix to Company Admin
  await tx.rolePermission.deleteMany({ where: { roleId: companyAdminRole.id } });
  for (const p of COMPANY_ADMIN_PERMISSIONS) {
    const permId = permMap.get(`${p.resource}:${p.action}`);
    if (permId) {
      await tx.rolePermission.create({
        data: { roleId: companyAdminRole.id, permissionId: permId },
      });
    }
  }

  // Attach permission matrix to Branch Admin
  await tx.rolePermission.deleteMany({ where: { roleId: branchAdminRole.id } });
  for (const p of BRANCH_ADMIN_PERMISSIONS) {
    const permId = permMap.get(`${p.resource}:${p.action}`);
    if (permId) {
      await tx.rolePermission.create({
        data: { roleId: branchAdminRole.id, permissionId: permId },
      });
    }
  }

  // 5. Default Chart of Accounts
  await seedDefaultCoA(tx, company.id);

  // 6. Seed admin User with branchId: null if credentials provided
  if (adminInput) {
    const existingUser = await tx.user.findFirst({
      where: { companyId: company.id, email: adminInput.email.toLowerCase() },
    });
    if (existingUser) {
      await tx.user.update({
        where: { id: existingUser.id },
        data: {
          passwordHash: adminInput.passwordHash,
          roleId: companyAdminRole.id,
          branchId: null,
          isActive: true,
        },
      });
    } else {
      const sa = await tx.superAdmin.findUnique({ where: { email: adminInput.email.toLowerCase() } });
      if (sa) {
        throw new DuplicateEntityError('This email is reserved for platform administration');
      }
      await tx.user.create({
        data: {
          companyId: company.id,
          email: adminInput.email.toLowerCase(),
          passwordHash: adminInput.passwordHash,
          name: `${company.name} Admin`,
          roleId: companyAdminRole.id,
          branchId: null,
          isActive: true,
        },
      });
    }
  }
}

export async function listCompanies(query: CompanyListQuery) {
  const limit = Math.min(query.limit, 100);
  const where: Prisma.CompanyWhereInput = {
    ...(query.search && {
      OR: [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ],
    }),
    ...(query.status && { status: query.status }),
    ...(!query.includeDeleted && { deletedAt: null }),
  };

  const [totalCount, rows] = await Promise.all([
    prisma.company.count({ where }),
    prisma.company.findMany({
      where,
      orderBy: [{ [query.sortBy]: query.sortDir }, { id: query.sortDir }],
      take: limit,
      skip: query.skip ?? 0,
    }),
  ]);

  return { data: rows, pageInfo: { totalCount, totalPages: Math.ceil(totalCount / limit) } };
}

export async function getCompany(id: string) {
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) throw new NotFoundError('Company not found');
  const [usersCount, branchesCount] = await Promise.all([
    prisma.user.count({ where: { companyId: id } }),
    prisma.branch.count({ where: { companyId: id } }),
  ]);
  return { ...company, _count: { users: usersCount, branches: branchesCount } };
}

export async function createCompany(input: CreateCompanyInput) {
  const existing = await prisma.company.findUnique({ where: { slug: input.slug } });
  if (existing) throw new DuplicateEntityError('A company with this slug already exists');

  const { adminPassword, ...companyData } = input;
  const passwordHash = adminPassword ? await bcrypt.hash(adminPassword, 10) : undefined;

  return prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        ...companyData,
        trialEndsAt: companyData.status === 'TRIAL' ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null,
      },
    });

    await onboardCompanySeed(
      tx,
      company,
      companyData.email && passwordHash
        ? { email: companyData.email, passwordHash }
        : undefined
    );

    return company;
  });
}

export async function updateCompany(id: string, input: UpdateCompanyInput) {
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) throw new NotFoundError('Company not found');

  const { adminPassword, ...updateData } = input;
  const passwordHash = adminPassword ? await bcrypt.hash(adminPassword, 10) : undefined;

  return prisma.$transaction(async (tx) => {
    const updatedCompany = await tx.company.update({ where: { id }, data: updateData });

    await onboardCompanySeed(
      tx,
      updatedCompany,
      updatedCompany.email && passwordHash
        ? { email: updatedCompany.email, passwordHash }
        : undefined
    );

    return updatedCompany;
  });
}

export async function suspendCompany(id: string) {
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) throw new NotFoundError('Company not found');
  if (company.deletedAt) throw new BusinessRuleError('Cannot suspend a deleted company');

  const validTransitions: Record<string, string[]> = { TRIAL: ['SUSPENDED'], ACTIVE: ['SUSPENDED'] };
  if (!validTransitions[company.status]?.includes('SUSPENDED')) {
    throw new BusinessRuleError(`Cannot transition from ${company.status} to SUSPENDED`);
  }

  const updated = await prisma.company.update({ where: { id }, data: { status: 'SUSPENDED' } });
  clearCompanyStatusCache(id);
  return updated;
}

export async function reactivateCompany(id: string) {
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) throw new NotFoundError('Company not found');
  if (company.deletedAt) throw new BusinessRuleError('Cannot reactivate a deleted company');

  if (company.status !== 'SUSPENDED') {
    throw new BusinessRuleError(`Cannot transition from ${company.status} to ACTIVE`);
  }

  const updated = await prisma.company.update({ where: { id }, data: { status: 'ACTIVE' } });
  clearCompanyStatusCache(id);
  return updated;
}

export async function deleteCompany(id: string) {
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) throw new NotFoundError('Company not found');
  if (company.status !== 'SUSPENDED') {
    throw new BusinessRuleError('Only suspended companies can be deleted');
  }

  const updated = await prisma.company.update({ where: { id }, data: { deletedAt: new Date(), status: 'CANCELLED' } });
  clearCompanyStatusCache(id);
  return updated;
}

export async function getDashboardStats() {
  const [total, byStatus, recentCompanies, recentAudit] = await Promise.all([
    prisma.company.count({ where: { deletedAt: null } }),
    prisma.company.groupBy({ by: ['status'], _count: true, where: { deletedAt: null } }),
    prisma.company.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.platformAuditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { superAdmin: { select: { name: true } } } }),
  ]);

  return { total, byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])), recentCompanies, recentAudit };
}

export async function getAuditLog(params: { limit?: number; cursor?: string; skip?: number; targetType?: string; action?: string; adminSearch?: string }) {
  const limit = Math.min(params.limit ?? 25, 100);
  const where: Prisma.PlatformAuditLogWhereInput = {
    ...(params.targetType && { targetType: params.targetType }),
    ...(params.action && { action: { contains: params.action, mode: 'insensitive' } }),
    ...(params.adminSearch && {
      superAdmin: {
        OR: [
          { name: { contains: params.adminSearch, mode: 'insensitive' } },
          { email: { contains: params.adminSearch, mode: 'insensitive' } },
        ],
      },
    }),
  };

  const [rows, totalCount] = await Promise.all([
    prisma.platformAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: params.skip ?? 0,
      include: { superAdmin: { select: { name: true } } },
    }),
    prisma.platformAuditLog.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return { data: rows, pageInfo: { totalCount, totalPages } };
}

export async function getAuditEntry(id: string) {
  const entry = await prisma.platformAuditLog.findUnique({
    where: { id },
    include: { superAdmin: { select: { name: true } } },
  });
  if (!entry) throw new NotFoundError('Audit entry not found');
  return entry;
}
