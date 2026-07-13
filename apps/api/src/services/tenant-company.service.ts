import { prisma } from '../db/prisma.js';
import { getTenantClient } from '../db/tenant-extension.js';
import { NotFoundError } from '../lib/errors.js';
import { writeAudit } from './audit.service.js';

export async function getTenantCompanyProfile(companyId: string) {
  const tenantDb = getTenantClient(companyId);
  const company = await tenantDb.company.findFirst();
  if (!company) {
    throw new NotFoundError('Company not found');
  }
  return company;
}

export interface UpdateCompanyProfileInput {
  name?: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  taxId?: string | null;
  logoUrl?: string | null;
}

export async function updateTenantCompanyProfile(
  companyId: string,
  userId: string | null,
  input: UpdateCompanyProfileInput
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.company.findUnique({
      where: { id: companyId },
    });

    if (!existing) {
      throw new NotFoundError('Company not found');
    }

    const updated = await tx.company.update({
      where: { id: companyId },
      data: {
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.phone !== undefined && { phone: input.phone ? input.phone.trim() : null }),
        ...(input.address !== undefined && {
          address: input.address ? input.address.trim() : null,
        }),
        ...(input.city !== undefined && { city: input.city ? input.city.trim() : null }),
        ...(input.taxId !== undefined && { taxId: input.taxId ? input.taxId.trim() : null }),
        ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
      },
    });

    await writeAudit(tx, {
      companyId,
      userId,
      action: 'UPDATE',
      entityType: 'COMPANY',
      entityId: companyId,
      before: existing,
      after: updated,
    });

    return updated;
  });
}
