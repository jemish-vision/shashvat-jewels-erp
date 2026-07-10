'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuditLog } from '@/features/super-admin/queries';
import Link from 'next/link';
import { FilterCard } from '@/components/ui/filter-card';
import { CustomSelect } from '@/components/ui/custom-select';
import { TablePagination } from '@/components/ui/table-pagination';
import { usePaginatedQuery } from '@/hooks/use-paginated-query';
import type { AuditEntry } from '@/features/super-admin/types';
import {
  MdHistory,
  MdSecurity,
  MdSearch,
  MdClose,
  MdAdminPanelSettings,
  MdOpenInNew,
} from 'react-icons/md';

const TARGET_TYPES = [
  { value: '', label: 'All Targets' },
  { value: 'company', label: 'Company' },
  { value: 'user', label: 'User' },
  { value: 'audit', label: 'Audit' },
  { value: 'settings', label: 'Settings' },
];

export default function AuditLogPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [targetType, setTargetType] = useState('');

  const { items, isLoading, error, resetPage, paginationProps } = usePaginatedQuery<AuditEntry>({
    queryKey: ['super-admin', 'audit-log', targetType, search],
    queryFn: ({ limit, skip }) => getAuditLog({
      limit,
      skip,
      action: search || undefined,
      adminSearch: search || undefined,
      targetType: targetType || undefined,
    }),
    defaultPageSize: 10,
  });

  const hasActiveFilters = search || targetType;

  function resetFilters() {
    setSearch('');
    setTargetType('');
    resetPage();
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Page Header */}
      <div>
        <h1 className="m-0 text-[22px] font-extrabold tracking-tight text-foreground">Audit Log</h1>
        <p className="m-0 mt-[5px] text-[13px] font-medium text-text-secondary">
          Track all administrative actions and platform changes.
        </p>
      </div>

      {/* Filters */}
      <FilterCard onReset={resetFilters} showReset={!!hasActiveFilters}>
        <div className="flex items-end gap-[10px]">
          <div className="flex flex-col gap-[3px]">
            <label className="text-[9.5px] font-bold uppercase text-text-muted">Search</label>
            <div className="field-compact flex items-center gap-[6px]">
              <MdSearch size={14} className="text-text-muted flex-none" />
              <input
                placeholder="Search by action or admin…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); resetPage(); }}
                className="w-full min-w-[200px] max-w-[280px] border-none bg-transparent py-0 text-[11.5px] text-foreground outline-none placeholder:text-text-muted"
              />
              {search && (
                <button onClick={() => { setSearch(''); resetPage(); }} className="flex-none border-none bg-none p-0 text-text-muted hover:text-text-strong-2">
                  <MdClose size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-[3px]">
            <label className="text-[9.5px] font-bold uppercase text-text-muted">Target</label>
            <CustomSelect
              options={TARGET_TYPES}
              value={targetType}
              onChange={(v) => { setTargetType(v); resetPage(); }}
              placeholder="All Targets"
              width="140px"
            />
          </div>
        </div>
      </FilterCard>

      {/* Error state */}
      {error && (
        <div className="rounded-[14px] border border-border bg-danger-bg p-4 text-[13px] font-medium text-danger">
          Failed to load audit log. Please try again.
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-[13px] font-medium text-text-secondary">Loading audit log&hellip;</div>
        </div>
      ) : items.length === 0 ? (
        <div className="card-lg flex flex-col items-center justify-center py-16">
          <div className="empty-icon mb-[14px] bg-muted text-text-muted">
            <MdSecurity size={26} />
          </div>
          <p className="m-0 mb-[4px] text-[14px] font-bold text-foreground">No audit entries yet</p>
          <p className="m-0 mb-[18px] text-[12px] text-text-muted">
            {hasActiveFilters ? 'Try adjusting your filters.' : 'Actions will appear here as admins use the platform.'}
          </p>
          {hasActiveFilters && (
            <button onClick={resetFilters} className="rounded-[8px] border border-input bg-card px-[16px] py-[8px] text-[12px] font-bold text-text-strong-2 transition-colors hover:bg-muted">
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-[11px] font-extrabold uppercase tracking-wider text-text-secondary">
                    <th className="p-4">Action</th>
                    <th className="p-4">Target</th>
                    <th className="p-4">Admin</th>
                    <th className="p-4">IP Address</th>
                    <th className="p-4">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {items.map((a) => (
                    <tr
                      key={a.id}
                      onClick={() => router.push(`/audit-log/${a.id}`)}
                      className="group cursor-pointer transition-colors hover:bg-muted/40"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-primary/15 text-primary">
                            <MdHistory size={16} />
                          </div>
                          <span className="font-extrabold text-foreground group-hover:text-primary transition-colors">
                            {a.action}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 font-medium text-text-muted">
                        {a.targetType}#{a.targetId?.slice(0, 8) || '—'}
                      </td>
                      <td className="p-4">
                        <Link
                          href={`/audit-log/${a.id}`}
                          className="flex items-center gap-2 no-underline group/link"
                        >
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1.5 font-bold text-foreground leading-tight group-hover/link:text-primary transition-colors">
                              {a.superAdmin?.name || 'System'}
                              <MdOpenInNew size={12} className="text-text-muted opacity-0 group-hover/link:opacity-100 transition-opacity" />
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-text-muted leading-tight">
                              <MdAdminPanelSettings size={11} />
                              {a.superAdmin ? 'Admin' : 'Automated'}
                            </span>
                          </div>
                        </Link>
                      </td>
                      <td className="p-4 font-mono text-text-secondary">
                        {a.ipAddress || '—'}
                      </td>
                      <td className="p-4 text-text-secondary">
                        {new Date(a.createdAt).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <TablePagination {...paginationProps} pageSizeOptions={[10, 25, 50]} />
          </div>
        </>
      )}
    </div>
  );
}
