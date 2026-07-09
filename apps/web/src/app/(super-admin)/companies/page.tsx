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
  const [openActionId, setOpenActionId] = useState<string | null>(null);

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

  // Row action menu — close on any click outside toggle/dropdown
  useEffect(() => {
    if (!openActionId) return;
    function handleClick(e: MouseEvent) {
      const el = e.target as HTMLElement;
      if (el.closest('[data-action-toggle]') || el.closest('[data-action-dropdown]')) return;
      setOpenActionId(null);
    }
    setTimeout(() => document.addEventListener('click', handleClick), 0);
    return () => document.removeEventListener('click', handleClick);
  }, [openActionId]);

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
        <div className="card-lg">
          <div className="overflow-visible">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-muted">
                  <th className="px-[14px] py-[9px] text-[9.5px] font-bold uppercase tracking-[0.06em] text-text-secondary">Name</th>
                  <th className="px-[14px] py-[9px] text-[9.5px] font-bold uppercase tracking-[0.06em] text-text-secondary">Slug</th>
                  <th className="px-[14px] py-[9px] text-[9.5px] font-bold uppercase tracking-[0.06em] text-text-secondary">Status</th>
                  <th className="px-[14px] py-[9px] text-[9.5px] font-bold uppercase tracking-[0.06em] text-text-secondary">Admin Email</th>
                  <th className="px-[14px] py-[9px] text-[9.5px] font-bold uppercase tracking-[0.06em] text-text-secondary">Created</th>
                  <th className="px-[14px] py-[9px] text-[9.5px] font-bold uppercase tracking-[0.06em] text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => {
                  const meta = statusMeta[c.status] || { badge: 'bg-neutral-bg text-neutral' };
                  const actionOpen = openActionId === c.id;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/companies/${c.id}`)}
                      className="cursor-pointer border-t border-border transition-colors hover:bg-primary/5"
                    >
                      <td className="px-[14px] py-[10px] text-[12.5px] font-bold text-foreground">{c.name}</td>
                      <td className="px-[14px] py-[10px] text-[11.5px] font-medium text-text-muted">{c.slug}</td>
                      <td className="px-[14px] py-[10px]">
                        <span className={`inline-flex items-center rounded-[6px] px-[9px] py-[3px] text-[10px] font-bold uppercase leading-none ${meta.badge}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-[14px] py-[10px] text-[11.5px] font-medium text-text-strong-2">{c.email || '—'}</td>
                      <td className="px-[14px] py-[10px] text-[11.5px] font-medium text-text-secondary">
                        {new Date(c.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-[14px] py-[10px]" onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-flex">
                          <button
                            data-action-toggle
                            onClick={() => setOpenActionId(actionOpen ? null : c.id)}
                            className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] border-none bg-none text-text-muted transition-colors hover:bg-muted hover:text-text-strong-2"
                          >
                            <MdMoreVert size={16} />
                          </button>
                          {actionOpen && (
                            <div data-action-dropdown className="absolute left-full top-0 z-[9999] ml-1.5 w-[160px] animate-[fadeUp_0.15s_ease-out] overflow-hidden rounded-xl border border-border bg-card shadow-[0_8px_24px_rgba(15,23,42,0.10),0_2px_6px_rgba(15,23,42,0.04)]">
                              <Link
                                href={`/companies/${c.id}`}
                                onClick={() => setOpenActionId(null)}
                                className="flex items-center gap-2.5 px-3.5 py-[9px] text-[12px] font-medium text-text-strong-2 no-underline transition-colors hover:bg-background"
                              >
                                <MdVisibility size={15} className="text-text-muted" />
                                View
                              </Link>
                              {c.status !== 'CANCELLED' && (
                                <>
                                  <div className="mx-3.5 border-t border-border" />
                                  {c.status === 'SUSPENDED' ? (
                                    <button
                                      onClick={() => { setOpenActionId(null); reactivateMutation.mutate(c.id); }}
                                      disabled={reactivateMutation.isPending}
                                      className="flex w-full items-center gap-2.5 px-3.5 py-[9px] text-[12px] font-medium text-success transition-colors hover:bg-background"
                                    >
                                      <MdCheckCircle size={15} />
                                      {reactivateMutation.isPending ? '…' : 'Reactivate'}
                                    </button>
                                  ) : (
                                    <button
                                      onClick={async () => {
                                        setOpenActionId(null);
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
                                      className="flex w-full items-center gap-2.5 px-3.5 py-[9px] text-[12px] font-medium text-warning transition-colors hover:bg-background"
                                    >
                                      <MdBlock size={15} />
                                      {suspendMutation.isPending ? '…' : 'Suspend'}
                                    </button>
                                  )}
                                  <button
                                    onClick={async () => {
                                      setOpenActionId(null);
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
                                    className="flex w-full items-center gap-2.5 px-3.5 py-[9px] text-[12px] font-medium text-danger transition-colors hover:bg-background"
                                  >
                                    <MdDelete size={15} />
                                    {deleteMutation.isPending ? '…' : 'Delete'}
                                  </button>
                                </>
                              )}
                            </div>
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
