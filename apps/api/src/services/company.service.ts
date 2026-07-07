import { prisma } from '../db/prisma.js';
import { Prisma } from '@prisma/client';
import type { CompanyListQuery, CreateCompanyInput, UpdateCompanyInput } from '../schemas/company.schema.js';
import { DuplicateEntityError, NotFoundError, BusinessRuleError } from '../lib/errors.js';

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
      take: limit + 1,
      ...(query.cursor && { cursor: { id: query.cursor }, skip: 1 }),
    }),
  ]);

  const hasNextPage = rows.length > limit;
  const data = hasNextPage ? rows.slice(0, limit) : rows;
  const nextCursor = hasNextPage ? data[data.length - 1]!.id : null;

  return { data, pageInfo: { nextCursor, hasNextPage, totalCount } };
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

  const company = await prisma.company.create({
    data: {
      ...input,
      trialEndsAt: input.status === 'TRIAL' ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null,
    },
  });

  return company;
}

export async function updateCompany(id: string, input: UpdateCompanyInput) {
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) throw new NotFoundError('Company not found');

  return prisma.company.update({ where: { id }, data: input });
}

export async function suspendCompany(id: string) {
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) throw new NotFoundError('Company not found');
  if (company.deletedAt) throw new BusinessRuleError('Cannot suspend a deleted company');

  const validTransitions: Record<string, string[]> = { TRIAL: ['SUSPENDED'], ACTIVE: ['SUSPENDED'] };
  if (!validTransitions[company.status]?.includes('SUSPENDED')) {
    throw new BusinessRuleError(`Cannot transition from ${company.status} to SUSPENDED`);
  }

  return prisma.company.update({ where: { id }, data: { status: 'SUSPENDED' } });
}

export async function reactivateCompany(id: string) {
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) throw new NotFoundError('Company not found');
  if (company.deletedAt) throw new BusinessRuleError('Cannot reactivate a deleted company');

  if (company.status !== 'SUSPENDED') {
    throw new BusinessRuleError(`Cannot transition from ${company.status} to ACTIVE`);
  }

  return prisma.company.update({ where: { id }, data: { status: 'ACTIVE' } });
}

export async function deleteCompany(id: string) {
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) throw new NotFoundError('Company not found');
  if (company.status !== 'SUSPENDED') {
    throw new BusinessRuleError('Only suspended companies can be deleted');
  }

  return prisma.company.update({ where: { id }, data: { deletedAt: new Date(), status: 'CANCELLED' } });
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

export async function getAuditLog(params: { limit?: number; cursor?: string; targetType?: string; action?: string }) {
  const limit = Math.min(params.limit ?? 25, 100);
  const where: Prisma.PlatformAuditLogWhereInput = {
    ...(params.targetType && { targetType: params.targetType }),
    ...(params.action && { action: params.action }),
  };

  const [rows, totalCount] = await Promise.all([
    prisma.platformAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(params.cursor && { cursor: { id: params.cursor }, skip: 1 }),
      include: { superAdmin: { select: { name: true } } },
    }),
    prisma.platformAuditLog.count({ where }),
  ]);

  const hasNextPage = rows.length > limit;
  const data = hasNextPage ? rows.slice(0, limit) : rows;
  const nextCursor = hasNextPage ? data[data.length - 1]!.id : null;

  return { data, pageInfo: { nextCursor, hasNextPage, totalCount } };
}
