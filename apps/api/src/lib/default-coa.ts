import { PrismaClient, Prisma } from '@prisma/client';

export interface CoAItem {
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  parentCode?: string;
  isSystem?: boolean;
}

export const DEFAULT_COA_TEMPLATE: CoAItem[] = [
  // Assets
  { code: '1000', name: 'Assets', type: 'ASSET', isSystem: true },
  { code: '1100', name: 'Cash & Bank', type: 'ASSET', parentCode: '1000', isSystem: true },
  { code: '1200', name: 'Accounts Receivable', type: 'ASSET', parentCode: '1000', isSystem: true },
  { code: '1300', name: 'Diamond & Jewelry Inventory', type: 'ASSET', parentCode: '1000', isSystem: true },

  // Liabilities
  { code: '2000', name: 'Liabilities', type: 'LIABILITY', isSystem: true },
  { code: '2100', name: 'Accounts Payable', type: 'LIABILITY', parentCode: '2000', isSystem: true },
  { code: '2200', name: 'Tax Payable', type: 'LIABILITY', parentCode: '2000', isSystem: true },

  // Equity
  { code: '3000', name: 'Equity', type: 'EQUITY', isSystem: true },
  { code: '3100', name: "Owner's Capital", type: 'EQUITY', parentCode: '3000', isSystem: true },
  { code: '3200', name: 'Retained Earnings', type: 'EQUITY', parentCode: '3000', isSystem: true },

  // Income
  { code: '4000', name: 'Income', type: 'INCOME', isSystem: true },
  { code: '4100', name: 'Sales Revenue', type: 'INCOME', parentCode: '4000', isSystem: true },
  { code: '4200', name: 'Other Income', type: 'INCOME', parentCode: '4000', isSystem: true },

  // Expense
  { code: '5000', name: 'Expenses', type: 'EXPENSE', isSystem: true },
  { code: '5100', name: 'Cost of Goods Sold', type: 'EXPENSE', parentCode: '5000', isSystem: true },
  { code: '5200', name: 'Operating Expenses', type: 'EXPENSE', parentCode: '5000', isSystem: true },
  { code: '5300', name: 'Manufacturing Wastage', type: 'EXPENSE', parentCode: '5000', isSystem: true },
];

export async function seedDefaultCoA(
  tx: Prisma.TransactionClient | PrismaClient,
  companyId: string
) {
  const accountIdByCode = new Map<string, string>();

  // First pass: parent accounts (no parentCode)
  for (const item of DEFAULT_COA_TEMPLATE.filter((i) => !i.parentCode)) {
    const acc = await tx.account.upsert({
      where: {
        companyId_code: {
          companyId,
          code: item.code,
        },
      },
      update: {},
      create: {
        companyId,
        code: item.code,
        name: item.name,
        type: item.type,
        isSystem: item.isSystem ?? false,
      },
    });
    accountIdByCode.set(item.code, acc.id);
  }

  // Second pass: child accounts
  for (const item of DEFAULT_COA_TEMPLATE.filter((i) => i.parentCode)) {
    const parentId = item.parentCode ? accountIdByCode.get(item.parentCode) : undefined;
    const acc = await tx.account.upsert({
      where: {
        companyId_code: {
          companyId,
          code: item.code,
        },
      },
      update: {
        parentId,
      },
      create: {
        companyId,
        code: item.code,
        name: item.name,
        type: item.type,
        parentId,
        isSystem: item.isSystem ?? false,
      },
    });
    accountIdByCode.set(item.code, acc.id);
  }

  return tx.account.findMany({ where: { companyId } });
}
