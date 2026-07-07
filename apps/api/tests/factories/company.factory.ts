import { PrismaClient } from '@prisma/client';

export async function createCompany(prisma: PrismaClient, overrides: Partial<{ name: string; slug: string }> = {}) {
  return prisma.company.create({
    data: {
      name: overrides.name ?? 'Test Company',
      slug: overrides.slug ?? `test-${Date.now()}`,
      baseCurrency: 'INR',
      status: 'ACTIVE',
    },
  });
}
