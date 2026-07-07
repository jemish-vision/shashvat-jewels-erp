import { PrismaClient } from '@prisma/client';

export function createTenantExtension(companyId: string) {
  return new PrismaClient().$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const skipModels = ['SuperAdmin', 'Company', 'PlatformAuditLog'];
          if (skipModels.includes(model)) {
            return query(args);
          }
          if (operation === 'create' || operation === 'createMany') {
            return query(args);
          }
          if (operation === 'findUnique' || operation === 'findFirst' || operation === 'findMany') {
            const where = (args as any).where ?? {};
            where.companyId = companyId;
            args.where = where;
          }
          return query(args);
        },
      },
    },
  });
}
