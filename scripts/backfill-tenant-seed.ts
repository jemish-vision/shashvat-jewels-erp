import { PrismaClient } from '@prisma/client';
import { syncPermissionCatalog, COMPANY_ADMIN_PERMISSIONS, BRANCH_ADMIN_PERMISSIONS } from '../apps/api/src/lib/permissions.js';
import { seedDefaultCoA } from '../apps/api/src/lib/default-coa.js';

const prisma = new PrismaClient();

function getCurrencySymbol(code: string): string {
  switch (code.toUpperCase()) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'INR': return '₹';
    default: return code;
  }
}

async function main() {
  console.log('Starting backfill for existing companies...');

  // 1. Sync global permission catalog
  const allPerms = await syncPermissionCatalog(prisma);
  const permMap = new Map<string, string>();
  for (const p of allPerms) {
    permMap.set(`${p.resource}:${p.action}`, p.id);
  }
  console.log(`Synced ${allPerms.length} global permissions.`);

  const companies = await prisma.company.findMany();
  console.log(`Found ${companies.length} companies to inspect/backfill.`);

  for (const company of companies) {
    console.log(`Backfilling company: ${company.name} (${company.id})`);

    await prisma.$transaction(async (tx) => {
      // 2. Ensure base currency exists
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

      // 3. Ensure HQ branch exists
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

      // 4. Ensure Company Admin & Branch Admin roles exist and attach permission matrix
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

      // 6. Ensure existing users with Company Administrator role have branchId: null
      await tx.user.updateMany({
        where: {
          companyId: company.id,
          roleId: companyAdminRole.id,
        },
        data: {
          branchId: null,
        },
      });
    });
  }

  console.log('Backfill completed successfully.');
}

main()
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
