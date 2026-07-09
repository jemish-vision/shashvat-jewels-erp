'use client';

import { useAuth } from '@/lib/auth-context';
import { MdLocationOn, MdLock } from 'react-icons/md';

export function BranchSwitcher() {
  const { user } = useAuth();

  const branchName = user?.branchName || 'All Branches (HQ)';
  const isBranchScoped = Boolean(user?.branchId);

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 shadow-sm">
      <MdLocationOn size={16} className="text-primary" />
      <span className="text-xs font-semibold text-foreground">{branchName}</span>
      {isBranchScoped ? (
        <span
          title="Your access is scoped to this branch"
          className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400"
        >
          <MdLock size={12} />
          Branch Scoped
        </span>
      ) : (
        <span
          title="Company-wide view"
          className="inline-flex items-center rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400"
        >
          Company Wide
        </span>
      )}
    </div>
  );
}
