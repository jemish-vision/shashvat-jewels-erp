'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/hooks/use-permissions';
import { tenantNav } from '@/config/navigation';
import { MdArrowBack, MdVerifiedUser, MdConstruction } from 'react-icons/md';

export default function TenantModulePage() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { has, isCompanyAdmin } = usePermissions();

  // Find matching item from tenantNav
  const allItems = tenantNav.flatMap((group) => group.items);
  const navItem = allItems.find((item) => item.href === pathname);

  const moduleName =
    navItem?.label ||
    pathname
      .split('/')
      .pop()
      ?.split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ') ||
    'Module';

  const requiredPermission = navItem?.permission;
  const hasAccess = isCompanyAdmin || !requiredPermission || has(requiredPermission);

  if (!hasAccess) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-danger/10 text-danger">
          <MdVerifiedUser size={32} />
        </div>
        <h1 className="mt-4 text-xl font-bold text-foreground">Access Restricted</h1>
        <p className="mt-2 max-w-md text-sm text-text-secondary">
          You do not have the required permission ({requiredPermission}) to view the {moduleName}{' '}
          module.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-ink shadow-sm hover:bg-primary-hover"
        >
          <MdArrowBack size={16} />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-[fadeUp_0.3s_ease-out]">
      <div>
        <h1 className="m-0 text-[22px] font-extrabold tracking-tight text-foreground">
          {moduleName}
        </h1>
        <p className="m-0 mt-[5px] text-[13px] font-medium text-text-secondary">
          Manage your {moduleName.toLowerCase()} workflows, records, and settings.
        </p>
      </div>

      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MdConstruction size={32} />
        </div>
        <h2 className="mt-4 text-lg font-bold text-foreground">{moduleName} Workspace</h2>
        <p className="mt-2 max-w-md text-xs text-text-secondary">
          Full functionality for {moduleName} will be deployed in the upcoming ERP master release. Your
          session scope and permissions are verified and ready.
        </p>
      </div>
    </div>
  );
}
