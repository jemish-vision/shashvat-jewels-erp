'use client';

import { useAuth } from '@/lib/auth-context';
import { MdLocationOn } from 'react-icons/md';

export function BranchSwitcher() {
  const { user } = useAuth();

  const branchName = user?.branchName || 'All Branches (HQ)';

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 shadow-sm">
      <MdLocationOn size={16} className="text-primary" />
      <span className="text-xs font-semibold text-foreground">{branchName}</span>
    </div>
  );
}
