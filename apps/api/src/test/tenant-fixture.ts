import { prisma } from '../db/prisma.js';
import { getTenantClient } from '../db/tenant-extension.js';
import { onboardCompanySeed } from '../services/company.service.js';
import bcrypt from 'bcryptjs';

export async function createTwoTenantFixture() {
  const passwordHash = await bcrypt.hash('TestPassword123!', 10);

  // Tenant A
  const companyA = await prisma.company.create({
    data: {
      slug: `tenant-a-${Date.now()}`,
      name: 'Tenant A Jewels',
      email: `adminA-${Date.now()}@tenanta.com`,
      baseCurrency: 'USD',
      status: 'ACTIVE',
    },
  });
  await onboardCompanySeed(prisma, companyA, {
    email: companyA.email!,
    passwordHash,
  });

  // Tenant B
  const companyB = await prisma.company.create({
    data: {
      slug: `tenant-b-${Date.now()}`,
      name: 'Tenant B Jewels',
      email: `adminB-${Date.now()}@tenantb.com`,
      baseCurrency: 'EUR',
      status: 'ACTIVE',
    },
  });
  await onboardCompanySeed(prisma, companyB, {
    email: companyB.email!,
    passwordHash,
  });

  return {
    tenantA: {
      company: companyA,
      db: getTenantClient(companyA.id),
    },
    tenantB: {
      company: companyB,
      db: getTenantClient(companyB.id),
    },
  };
}
