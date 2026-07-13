import type { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { getTenantClient } from '../db/tenant-extension.js';
import { BusinessRuleError, NotFoundError } from '../lib/errors.js';
import { writeAudit } from './audit.service.js';
import { getNextSequenceCode } from './numbering.service.js';
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  ListCustomerQueryInput,
} from '../schemas/customer.schema.js';

/**
 * buildCustomerWhere
 * Pure helper function to construct the Prisma where clause for customer listing.
 */
export function buildCustomerWhere(
  companyId: string,
  query: ListCustomerQueryInput
): Prisma.CustomerWhereInput {
  const where: Prisma.CustomerWhereInput = {
    companyId,
    deletedAt: null,
  };

  if (query.search) {
    const s = query.search.trim();
    where.OR = [
      { name: { contains: s, mode: 'insensitive' } },
      { code: { contains: s, mode: 'insensitive' } },
      { email: { contains: s, mode: 'insensitive' } },
      { phone: { contains: s, mode: 'insensitive' } },
    ];
  }

  if (query.type) {
    const types = query.type
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (types.length > 0) {
      where.type = { in: types };
    }
  }

  if (query.isActive === 'true') {
    where.isActive = true;
  } else if (query.isActive === 'false') {
    where.isActive = false;
  }

  return where;
}

export async function listCustomers(companyId: string, query: ListCustomerQueryInput) {
  const where = buildCustomerWhere(companyId, query);
  const page = query.page || 1;
  const pageSize = query.pageSize || 10;
  const skip = (page - 1) * pageSize;

  const [totalCount, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
    }),
  ]);

  const customerIds = customers.map((c) => c.id);
  const unpaidSales = customerIds.length > 0
    ? await prisma.sale.groupBy({
        by: ['customerId'],
        where: {
          companyId,
          customerId: { in: customerIds },
          deletedAt: null,
          paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
        },
        _sum: {
          grandTotal: true,
          paidAmount: true,
        },
      })
    : [];

  const outstandingMap = new Map<string, number>();
  for (const row of unpaidSales) {
    const total = Number(row._sum.grandTotal || 0);
    const paid = Number(row._sum.paidAmount || 0);
    outstandingMap.set(row.customerId, Math.max(0, total - paid));
  }

  const enrichedCustomers = customers.map((c) => ({
    ...c,
    outstandingBalance: outstandingMap.get(c.id) ?? 0,
  }));

  return {
    data: enrichedCustomers,
    meta: {
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

export async function getCustomerById(companyId: string, id: string) {
  const tenantDb = getTenantClient(companyId);
  const customer = await tenantDb.customer.findFirst({
    where: { id, deletedAt: null },
  });

  if (!customer) {
    throw new NotFoundError('Customer not found');
  }

  const salesAgg = await tenantDb.sale.aggregate({
    where: {
      customerId: id,
      deletedAt: null,
      paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
    },
    _sum: {
      grandTotal: true,
      paidAmount: true,
    },
  });

  const grandTotalSum = Number(salesAgg._sum.grandTotal || 0);
  const paidAmountSum = Number(salesAgg._sum.paidAmount || 0);
  const outstandingBalance = Math.max(0, grandTotalSum - paidAmountSum);

  return {
    ...customer,
    outstandingBalance,
  };
}

export async function createCustomer(
  companyId: string,
  userId: string | null,
  input: CreateCustomerInput
) {
  return prisma.$transaction(async (tx) => {
    const code = await getNextSequenceCode(tx, companyId, 'customer', 'CUST-');

    const created = await tx.customer.create({
      data: {
        companyId,
        code,
        type: input.type,
        name: input.name.trim(),
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        taxId: input.taxId?.trim() || null,
        billingAddress: input.billingAddress?.trim() || null,
        shippingAddress: input.shippingAddress?.trim() || null,
        city: input.city?.trim() || null,
        country: input.country || 'India',
        creditLimit: Number(input.creditLimit || 0),
        notes: input.notes?.trim() || null,
        isActive: input.isActive ?? true,
      },
    });

    await writeAudit(tx, {
      companyId,
      userId,
      action: 'CREATE',
      entityType: 'CUSTOMER',
      entityId: created.id,
      after: created,
    });

    return created;
  });
}

export async function updateCustomer(
  companyId: string,
  userId: string | null,
  id: string,
  input: UpdateCustomerInput
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.customer.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError('Customer not found');
    }

    const updated = await tx.customer.update({
      where: { id: existing.id },
      data: {
        ...(input.type !== undefined && { type: input.type }),
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.email !== undefined && { email: input.email ? input.email.trim() : null }),
        ...(input.phone !== undefined && { phone: input.phone ? input.phone.trim() : null }),
        ...(input.taxId !== undefined && { taxId: input.taxId ? input.taxId.trim() : null }),
        ...(input.billingAddress !== undefined && {
          billingAddress: input.billingAddress ? input.billingAddress.trim() : null,
        }),
        ...(input.shippingAddress !== undefined && {
          shippingAddress: input.shippingAddress ? input.shippingAddress.trim() : null,
        }),
        ...(input.city !== undefined && { city: input.city ? input.city.trim() : null }),
        ...(input.country !== undefined && { country: input.country }),
        ...(input.creditLimit !== undefined && { creditLimit: Number(input.creditLimit) }),
        ...(input.notes !== undefined && { notes: input.notes ? input.notes.trim() : null }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });

    await writeAudit(tx, {
      companyId,
      userId,
      action: 'UPDATE',
      entityType: 'CUSTOMER',
      entityId: updated.id,
      before: existing,
      after: updated,
    });

    return updated;
  });
}

export async function softDeleteCustomer(
  companyId: string,
  userId: string | null,
  id: string
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.customer.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError('Customer not found');
    }

    const deleted = await tx.customer.update({
      where: { id: existing.id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    await writeAudit(tx, {
      companyId,
      userId,
      action: 'DELETE',
      entityType: 'CUSTOMER',
      entityId: deleted.id,
      before: existing,
    });

    return { success: true, id: deleted.id };
  });
}
