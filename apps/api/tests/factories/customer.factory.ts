import type { PrismaClient } from '@prisma/client';

export interface CreateCustomerOptions {
  companyId: string;
  code?: string;
  name?: string;
  type?: string;
  email?: string;
  phone?: string;
  creditLimit?: number;
  isActive?: boolean;
}

export async function createCustomer(prisma: PrismaClient, options: CreateCustomerOptions) {
  const code = options.code ?? `CUST-${Math.floor(1000 + Math.random() * 9000)}`;
  return prisma.customer.create({
    data: {
      companyId: options.companyId,
      code,
      name: options.name ?? 'Test Customer Ltd',
      type: options.type ?? 'RETAIL',
      email: options.email ?? `customer-${code.toLowerCase()}@example.com`,
      phone: options.phone ?? '+91 9876543210',
      creditLimit: options.creditLimit ?? 100000,
      isActive: options.isActive ?? true,
    },
  });
}
