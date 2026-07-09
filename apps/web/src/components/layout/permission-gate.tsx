'use client';

import type { ReactNode } from 'react';
import { usePermissions } from '@/hooks/use-permissions';

interface PermissionGateProps {
  permission?: string;
  anyOf?: string[];
  allOf?: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGate({
  permission,
  anyOf,
  allOf,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { has, hasAny, hasAll } = usePermissions();

  if (permission && !has(permission)) {
    return <>{fallback}</>;
  }

  if (anyOf && !hasAny(anyOf)) {
    return <>{fallback}</>;
  }

  if (allOf && !hasAll(allOf)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
