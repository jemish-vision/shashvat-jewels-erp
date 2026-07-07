'use client';

import type { ReactNode } from 'react';
import { usePermissions } from '@/hooks/use-permissions';

interface PermissionGateProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const { has } = usePermissions();

  if (!has(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
