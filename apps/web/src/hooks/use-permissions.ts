'use client';

import { useAuth } from '@/lib/auth-context';

export function usePermissions() {
  const { user } = useAuth();
  const permissions = user?.permissions ?? [];
  const isCompanyAdmin =
    user?.role === 'Company Administrator' ||
    user?.role === 'SUPER_ADMIN' ||
    permissions.includes('*');

  function has(permission: string): boolean {
    if (isCompanyAdmin) return true;
    return permissions.includes(permission);
  }

  function hasAny(requiredPermissions: string[]): boolean {
    if (isCompanyAdmin) return true;
    return requiredPermissions.some((p) => permissions.includes(p));
  }

  function hasAll(requiredPermissions: string[]): boolean {
    if (isCompanyAdmin) return true;
    return requiredPermissions.every((p) => permissions.includes(p));
  }

  return { has, hasAny, hasAll, permissions, isCompanyAdmin };
}
