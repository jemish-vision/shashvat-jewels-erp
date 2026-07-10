'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { listCompanies, suspendCompany, reactivateCompany, deleteCompany } from '@/features/super-admin/queries';
import Link from 'next/link';
import { FilterCard } from '@/components/ui/filter-card';
import { CustomSelect } from '@/components/ui/custom-select';
import { TablePagination } from '@/components/ui/table-pagination';
import { usePaginatedQuery } from '@/hooks/use-paginated-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm';
import type { Company } from '@/features/super-admin/types';
import {
  MdAdd,
  MdSearch,
  MdBusiness,
  MdClose,
  MdMoreVert,
  MdVisibility,
  MdBlock,
  MdDelete,
  MdCheckCircle,
} from 'react-icons/md';

const statusMeta: Record<string, { label: string; badge: string }> = {
  TRIAL: { label: 'Trial', badge: 'bg-info-bg text-info' },
  ACTIVE: { label: 'Active', badge: 'bg-success-bg text-success' },
  SUSPENDED: { label: 'Suspended', badge: 'bg-warning-bg text-warning' },
  CANCELLED: { label: 'Cancelled', badge: 'bg-neutral-bg text-neutral' },
};

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'TRIAL', label: 'Trial' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function CompaniesPage() {
  const router = useRouter();
  const { confirm } = useConfirm();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { items, isLoading, error, resetPage, paginationProps } = usePaginatedQuery<Company>({
    queryKey: ['super-admin', 'companies', search, statusFilter],
    queryFn: ({ limit, skip }) => listCompanies({
      limit,
      skip,
      search: search || undefined,
      status: statusFilter || undefined,
    }),
    defaultPageSize: 25,
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const suspendMutation = useMutation({
    mutationFn: (id: string) => suspendCompany(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'companies'] });
      toast('Company suspended', 'info');
    },
    onError: (err: Error) => toast(err.message, 'error'),
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => reactivateCompany(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'companies'] });
      toast('Company reactivated', 'success');
    },
    onError: (err: Error) => toast(err.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCompany(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'companies'] });
      toast('Company deleted', 'info');
    },
    onError: (err: Error) => toast(err.message, 'error'),
  });

  const hasActiveFilters = search || statusFilter;

  function resetFilters() {
    setSearch('');
    setStatusFilter('');
    resetPage();
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="m-0 text-[22px] font-extrabold tracking-tight text-foreground">Companies</h1>
          <p className="m-0 mt-[5px] text-[13px] font-medium text-text-secondary">
            Manage all registered companies on the platform.
          </p>
        </div>
        <Link href="/companies/new" className="btn-primary">
          <MdAdd size={16} />
          New Company
        </Link>
      </div>

      {/* Filters Panel */}
      <FilterCard onReset={resetFilters} showReset={!!hasActiveFilters}>
        <div className="flex items-end gap-[10px]">
          {/* Search */}
          <div className="flex flex-col gap-[3px]">
            <label className="text-[9.5px] font-bold uppercase text-text-muted">Search</label>
            <div className="field-compact flex items-center gap-[6px]">
              <MdSearch size={14} className="text-text-muted flex-none" />
              <input
                placeholder="Name, slug, email…"
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

          {/* Status dropdown */}
          <div className="flex flex-col gap-[3px]">
            <label className="text-[9.5px] font-bold uppercase text-text-muted">Status</label>
            <CustomSelect
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v); resetPage(); }}
              placeholder="All Statuses"
              width="160px"
            />
          </div>
        </div>
      </FilterCard>

      {/* Error state */}
      {error && (
        <div className="rounded-[14px] border border-border bg-danger-bg p-4 text-[13px] font-medium text-danger">
          Failed to load companies. Please try again.
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-[13px] font-medium text-text-secondary">Loading companies&hellip;</div>
        </div>
      ) : items.length === 0 ? (
        <div className="card-lg flex flex-col items-center justify-center py-16">
          <div className="empty-icon mb-[14px] bg-muted text-text-muted">
            <MdBusiness size={26} />
          </div>
          <p className="m-0 mb-[4px] text-[14px] font-bold text-foreground">No companies found</p>
          <p className="m-0 mb-[18px] text-[12px] text-text-muted">
            {hasActiveFilters ? 'Try adjusting your filters or search terms.' : 'Create your first company to get started.'}
          </p>
          <div className="flex gap-[10px]">
            {hasActiveFilters && (
              <button onClick={resetFilters} className="rounded-[8px] border border-input bg-card px-[16px] py-[8px] text-[12px] font-bold text-text-strong-2 transition-colors hover:bg-muted">
                Reset Filters
              </button>
            )}
            {!hasActiveFilters && (
              <Link href="/companies/new" className="inline-flex items-center gap-[6px] rounded-[8px] border-none bg-primary px-[16px] py-[8px] text-[12px] font-bold text-white no-underline shadow-[0_2px_8px_rgba(63,163,147,0.3)] transition-all hover:brightness-95">
                <MdAdd size={15} />
                New Company
              </Link>
            )}
          </div>
        </div>
      ) : (
        // Table
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-[11px] font-extrabold uppercase tracking-wider text-text-secondary">
                  <th className="p-4">Company & Slug</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Admin Email</th>
                  <th className="p-4">Created Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {items.map((c) => {
                  return (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/companies/${c.id}`)}
                      className="group cursor-pointer transition-colors hover:bg-muted/40"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary text-sm">
                            <MdBusiness size={16} />
                          </div>
                          <div>
                            <div className="font-extrabold text-foreground group-hover:text-primary transition-colors">
                              {c.name}
                            </div>
                            <div className="text-[11px] text-text-secondary line-clamp-1">
                              {c.slug}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            c.status === 'ACTIVE'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : c.status === 'SUSPENDED'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              : 'bg-primary/15 text-primary'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>

                      <td className="p-4 font-semibold text-foreground">
                        {c.email || '—'}
                      </td>

                      <td className="p-4 text-text-secondary">
                        {new Date(c.createdAt).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>

                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => router.push(`/companies/${c.id}`)}
                            title="View Company"
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-text-secondary transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
                          >
                            <MdVisibility size={14} />
                          </button>
                          {c.status !== 'CANCELLED' && (
                            <>
                              {c.status === 'SUSPENDED' ? (
                                <button
                                  onClick={() => reactivateMutation.mutate(c.id)}
                                  disabled={reactivateMutation.isPending}
                                  title="Reactivate Company"
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-text-secondary transition-colors hover:border-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600"
                                >
                                  <MdCheckCircle size={14} />
                                </button>
                              ) : (
                                <button
                                  onClick={async () => {
                                    const ok = await confirm(
                                      'Suspend this company? Users belonging to this organization will lose access immediately.',
                                      {
                                        title: 'Suspend Company',
                                        variant: 'warning',
                                        confirmText: 'Suspend Company',
                                      }
                                    );
                                    if (ok) suspendMutation.mutate(c.id);
                                  }}
                                  disabled={suspendMutation.isPending}
                                  title="Suspend Company"
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-text-secondary transition-colors hover:border-amber-500 hover:bg-amber-500/10 hover:text-amber-600"
                                >
                                  <MdBlock size={14} />
                                </button>
                              )}
                              <button
                                onClick={async () => {
                                  const ok = await confirm(
                                    'Permanently delete this company? All associated data will be marked as deleted.',
                                    {
                                      title: 'Delete Company',
                                      variant: 'danger',
                                      confirmText: 'Delete Company',
                                    }
                                  );
                                  if (ok) deleteMutation.mutate(c.id);
                                }}
                                disabled={deleteMutation.isPending}
                                title="Delete Company"
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-text-secondary transition-colors hover:border-danger hover:bg-danger/10 hover:text-danger"
                              >
                                <MdDelete size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <TablePagination {...paginationProps} pageSizeOptions={[10, 25, 50]} />
        </div>
      )}
    </div>
  );
}
