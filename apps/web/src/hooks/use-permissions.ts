'use client';

import { useAuth } from '@/lib/auth-context';

export function usePermissions() {
  const { user } = useAuth();

  function has(permission: string): boolean {
    return user?.permissions?.includes(permission) ?? false;
  }

  return { has, permissions: user?.permissions ?? [] };
}
