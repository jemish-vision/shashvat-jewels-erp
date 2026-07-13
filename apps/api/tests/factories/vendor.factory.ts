import type { PrismaClient } from '@prisma/client';

export interface CreateVendorOptions {
  companyId: string;
  code?: string;
  name?: string;
  type?: string;
  email?: string;
  phone?: string;
  paymentTerms?: string;
  isActive?: boolean;
}

export async function createVendor(prisma: PrismaClient, options: CreateVendorOptions) {
  const code = options.code ?? `VEND-${Math.floor(1000 + Math.random() * 9000)}`;
  return prisma.vendor.create({
    data: {
      companyId: options.companyId,
      code,
      name: options.name ?? 'Test Bullion & Diamonds Supplier',
      type: options.type ?? 'LOCAL',
      email: options.email ?? `vendor-${code.toLowerCase()}@example.com`,
      phone: options.phone ?? '+91 9123456789',
      paymentTerms: options.paymentTerms ?? 'NET30',
      isActive: options.isActive ?? true,
    },
  });
}
