import type { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { getTenantClient } from '../db/tenant-extension.js';
import { NotFoundError } from '../lib/errors.js';
import { writeAudit } from './audit.service.js';
import { getNextSequenceCode } from './numbering.service.js';
import type {
  CreateVendorInput,
  UpdateVendorInput,
  ListVendorQueryInput,
} from '../schemas/vendor.schema.js';

/**
 * buildVendorWhere
 * Pure helper function to construct the Prisma where clause for vendor listing.
 */
export function buildVendorWhere(
  companyId: string,
  query: ListVendorQueryInput
): Prisma.VendorWhereInput {
  const where: Prisma.VendorWhereInput = {
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

export async function listVendors(companyId: string, query: ListVendorQueryInput) {
  const where = buildVendorWhere(companyId, query);
  const page = query.page || 1;
  const pageSize = query.pageSize || 10;
  const skip = (page - 1) * pageSize;

  const [totalCount, vendors] = await Promise.all([
    prisma.vendor.count({ where }),
    prisma.vendor.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
      include: {
        currency: { select: { id: true, code: true, symbol: true } },
      },
    }),
  ]);

  return {
    data: vendors,
    meta: {
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

export async function getVendorById(companyId: string, id: string) {
  const tenantDb = getTenantClient(companyId);
  const vendor = await tenantDb.vendor.findFirst({
    where: { id, deletedAt: null },
    include: {
      currency: { select: { id: true, code: true, symbol: true } },
    },
  });

  if (!vendor) {
    throw new NotFoundError('Vendor not found');
  }

  return vendor;
}

export async function createVendor(
  companyId: string,
  userId: string | null,
  input: CreateVendorInput
) {
  return prisma.$transaction(async (tx) => {
    const code = await getNextSequenceCode(tx, companyId, 'vendor', 'VEND-');

    const created = await tx.vendor.create({
      data: {
        companyId,
        code,
        type: input.type,
        name: input.name.trim(),
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        taxId: input.taxId?.trim() || null,
        address: input.address?.trim() || null,
        city: input.city?.trim() || null,
        country: input.country || 'India',
        currencyId: input.currencyId || null,
        paymentTerms: input.paymentTerms?.trim() || null,
        notes: input.notes?.trim() || null,
        isActive: input.isActive ?? true,
      },
    });

    await writeAudit(tx, {
      companyId,
      userId,
      action: 'CREATE',
      entityType: 'VENDOR',
      entityId: created.id,
      after: created,
    });

    return created;
  });
}

export async function updateVendor(
  companyId: string,
  userId: string | null,
  id: string,
  input: UpdateVendorInput
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.vendor.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError('Vendor not found');
    }

    const updated = await tx.vendor.update({
      where: { id: existing.id },
      data: {
        ...(input.type !== undefined && { type: input.type }),
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.email !== undefined && { email: input.email ? input.email.trim() : null }),
        ...(input.phone !== undefined && { phone: input.phone ? input.phone.trim() : null }),
        ...(input.taxId !== undefined && { taxId: input.taxId ? input.taxId.trim() : null }),
        ...(input.address !== undefined && { address: input.address ? input.address.trim() : null }),
        ...(input.city !== undefined && { city: input.city ? input.city.trim() : null }),
        ...(input.country !== undefined && { country: input.country }),
        ...(input.currencyId !== undefined && { currencyId: input.currencyId || null }),
        ...(input.paymentTerms !== undefined && {
          paymentTerms: input.paymentTerms ? input.paymentTerms.trim() : null,
        }),
        ...(input.notes !== undefined && { notes: input.notes ? input.notes.trim() : null }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });

    await writeAudit(tx, {
      companyId,
      userId,
      action: 'UPDATE',
      entityType: 'VENDOR',
      entityId: updated.id,
      before: existing,
      after: updated,
    });

    return updated;
  });
}

export async function softDeleteVendor(
  companyId: string,
  userId: string | null,
  id: string
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.vendor.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError('Vendor not found');
    }

    const deleted = await tx.vendor.update({
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
      entityType: 'VENDOR',
      entityId: deleted.id,
      before: existing,
    });

    return { success: true, id: deleted.id };
  });
}
