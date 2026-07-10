import { prisma } from './prisma.js';

const SKIP_MODELS = ['SuperAdmin', 'Company', 'PlatformAuditLog', 'PasswordResetToken', 'Permission', 'RolePermission'];

export function createTenantExtension(companyId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || SKIP_MODELS.includes(model)) {
            return query(args);
          }

          const typedArgs = (args || {}) as any;

          if (operation === 'create') {
            typedArgs.data = {
              ...typedArgs.data,
              companyId: typedArgs.data?.companyId ?? companyId,
            };
          } else if (operation === 'createMany') {
            if (Array.isArray(typedArgs.data)) {
              typedArgs.data = typedArgs.data.map((item: any) => ({
                ...item,
                companyId: item.companyId ?? companyId,
              }));
            } else if (typedArgs.data) {
              typedArgs.data = {
                ...typedArgs.data,
                companyId: typedArgs.data.companyId ?? companyId,
              };
            }
          } else if (operation === 'upsert') {
            typedArgs.where = { ...typedArgs.where, companyId };
            typedArgs.create = { ...typedArgs.create, companyId: typedArgs.create?.companyId ?? companyId };
          } else if (
            [
              'findUnique',
              'findFirst',
              'findMany',
              'update',
              'updateMany',
              'delete',
              'deleteMany',
              'count',
              'aggregate',
              'groupBy',
            ].includes(operation)
          ) {
            typedArgs.where = {
              ...(typedArgs.where || {}),
              companyId,
            };
          }

          return query(typedArgs);
        },
      },
    },
  });
}

const tenantClientCache = new Map<string, ReturnType<typeof createTenantExtension>>();

export function getTenantClient(companyId: string) {
  let client = tenantClientCache.get(companyId);
  if (!client) {
    client = createTenantExtension(companyId);
    tenantClientCache.set(companyId, client);
  }
  return client;
}
