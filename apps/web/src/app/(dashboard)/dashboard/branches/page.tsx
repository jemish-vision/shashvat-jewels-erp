'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  MdStore,
  MdAdd,
  MdSearch,
  MdClose,
  MdEdit,
  MdDelete,
  MdLocationOn,
  MdPhone,
  MdPeople,
  MdInventory,
} from 'react-icons/md';
import { FilterCard } from '@/components/ui/filter-card';
import { CustomSelect } from '@/components/ui/custom-select';
import { TablePagination } from '@/components/ui/table-pagination';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm';
import { usePermissions } from '@/hooks/use-permissions';
import { apiFetch } from '@/lib/api-client';

interface BranchItem {
  id: string;
  code: string;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  isActive: boolean;
  userCount: number;
  stockCount: number;
  createdAt: string;
}

export default function BranchesManagementPage() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { has } = usePermissions();
  const canUpdate = has('branch:update');
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Common Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchItem | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function loadBranches() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<BranchItem[]>('/api/tenant/branches');
      setBranches(res || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load branches');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBranches();
  }, []);

  const filteredBranches = useMemo(() => {
    return branches.filter((b) => {
      if (statusFilter === 'ACTIVE' && !b.isActive) return false;
      if (statusFilter === 'INACTIVE' && b.isActive) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          b.name.toLowerCase().includes(q) ||
          b.code.toLowerCase().includes(q) ||
          (b.city && b.city.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [branches, statusFilter, searchQuery]);

  // Pagination calculations
  const totalCount = filteredBranches.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startRange = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endRange = Math.min(safePage * pageSize, totalCount);
  const paginatedBranches = filteredBranches.slice((safePage - 1) * pageSize, safePage * pageSize);

  function openCreateModal() {
    setEditingBranch(null);
    setCode('');
    setName('');
    setAddress('');
    setCity('');
    setPhone('');
    setIsActive(true);
    setIsModalOpen(true);
  }

  function openEditModal(branch: BranchItem) {
    setEditingBranch(branch);
    setCode(branch.code);
    setName(branch.name);
    setAddress(branch.address || '');
    setCity(branch.city || '');
    setPhone(branch.phone || '');
    setIsActive(branch.isActive);
    setIsModalOpen(true);
  }

  async function handleSaveBranch(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    setSubmitting(true);
    try {
      if (editingBranch) {
        await apiFetch(`/api/tenant/branches/${editingBranch.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            code: code.trim(),
            name: name.trim(),
            address: address.trim() || undefined,
            city: city.trim() || undefined,
            phone: phone.trim() || undefined,
            isActive,
          }),
        });
      } else {
        await apiFetch('/api/tenant/branches', {
          method: 'POST',
          body: JSON.stringify({
            code: code.trim(),
            name: name.trim(),
            address: address.trim() || undefined,
            city: city.trim() || undefined,
            phone: phone.trim() || undefined,
            isActive,
          }),
        });
      }
      setIsModalOpen(false);
      toast(editingBranch ? 'Branch updated successfully!' : 'Branch created successfully!', 'success');
      await loadBranches();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to save branch', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(branch: BranchItem) {
    try {
      await apiFetch(`/api/tenant/branches/${branch.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !branch.isActive }),
      });
      toast(`Branch status set to ${!branch.isActive ? 'Active' : 'Suspended'}`, 'success');
      await loadBranches();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to update branch status', 'error');
    }
  }

  async function handleDelete(branch: BranchItem) {
    const ok = await confirm(`Are you sure you want to delete showroom branch "${branch.name} (${branch.code})"?`, {
      title: 'Delete Showroom Branch',
      variant: 'danger',
      confirmText: 'Delete Branch',
      cancelText: 'Cancel',
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/tenant/branches/${branch.id}`, { method: 'DELETE' });
      toast('Branch deleted successfully!', 'success');
      await loadBranches();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to delete branch', 'error');
    }
  }

  const hasActiveFilters = Boolean(searchQuery || statusFilter !== 'ALL');

  function resetFilters() {
    setSearchQuery('');
    setStatusFilter('ALL');
    setCurrentPage(1);
  }

  if (loading && branches.length === 0) {
    return (
      <div className="flex min-h-[440px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-xs font-bold text-text-secondary">Loading Showroom Branches...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MdStore size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-foreground">
              Branch Management
            </h1>
            <p className="text-xs font-medium text-text-secondary">
              Manage showroom locations, branch codes, contact details, and operational status
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:brightness-110"
        >
          <MdAdd size={16} />
          New Branch
        </button>
      </div>

      {/* Common Filter Section with CustomSelect UI */}
      <FilterCard onReset={resetFilters} showReset={hasActiveFilters}>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-text-muted">Search Branch</label>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5">
              <MdSearch size={16} className="text-text-muted" />
              <input
                placeholder="Search code, name, city..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-48 bg-transparent text-xs text-foreground outline-none placeholder:text-text-muted"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="text-text-muted hover:text-foreground"
                >
                  <MdClose size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-text-muted">Status</label>
            <CustomSelect
              width="160px"
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'ACTIVE', label: 'Active Showrooms' },
                { value: 'INACTIVE', label: 'Suspended' },
              ]}
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      </FilterCard>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-xs font-semibold text-danger">
          {error}
        </div>
      )}

      {/* Common Data Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-[11px] font-extrabold uppercase tracking-wider text-text-secondary">
              <th className="p-4">Branch Code & Name</th>
              <th className="p-4">Location & Contact</th>
              <th className="p-4">Staff Assigned</th>
              <th className="p-4">Stock Items</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-xs">
            {paginatedBranches.length > 0 ? (
              paginatedBranches.map((b) => (
                <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-extrabold text-primary">
                        {b.code}
                      </span>
                      <span className="font-extrabold text-foreground">{b.name}</span>
                    </div>
                  </td>

                  <td className="p-4 text-text-secondary">
                    <div className="flex items-center gap-1.5">
                      <MdLocationOn size={14} className="text-text-muted" />
                      <span>{[b.city, b.address].filter(Boolean).join(', ') || 'Showroom Location'}</span>
                    </div>
                    {b.phone && (
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono">
                        <MdPhone size={13} className="text-text-muted" />
                        <span>{b.phone}</span>
                      </div>
                    )}
                  </td>

                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                      <MdPeople size={15} className="text-primary" />
                      {b.userCount} member(s)
                    </span>
                  </td>

                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                      <MdInventory size={15} className="text-emerald-500" />
                      {b.stockCount} packet(s)
                    </span>
                  </td>

                  <td className="p-4">
                    <button
                      type="button"
                      disabled={!canUpdate}
                      onClick={() => handleToggleStatus(b)}
                      className="group inline-flex items-center rounded-full focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      title={
                        canUpdate
                          ? `Status: ${b.isActive ? 'Active' : 'Suspended'} — Click to toggle`
                          : 'No permission to update status'
                      }
                      aria-label={b.isActive ? 'Active status toggle' : 'Suspended status toggle'}
                    >
                      <span
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
                          b.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
                            b.isActive ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </span>
                    </button>
                  </td>

                  <td className="p-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(b)}
                        title="Edit Branch"
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-text-secondary transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
                      >
                        <MdEdit size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(b)}
                        title="Delete Branch"
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-text-secondary transition-colors hover:border-danger hover:bg-danger/10 hover:text-danger"
                      >
                        <MdDelete size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-12 text-center text-text-secondary">
                  No showroom branches found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Table Pagination */}
        <TablePagination
          page={safePage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          startRange={startRange}
          endRange={endRange}
          onPageChange={setCurrentPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Create / Edit Branch Modal */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-base font-extrabold text-foreground">
                {editingBranch ? 'Edit Showroom Branch' : 'Provision New Showroom Branch'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-text-secondary hover:bg-muted"
              >
                <MdClose size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveBranch} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                    Branch Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MUM01, SURAT02"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 font-mono text-xs font-bold text-foreground outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                    Showroom Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Opera House Showroom"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-semibold text-foreground outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai, Surat"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +91 22 2367 0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Street Address
                </label>
                <input
                  type="text"
                  placeholder="Showroom address..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Showroom Status
                </label>
                <div className="mt-1.5 flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isActive}
                    onClick={() => setIsActive(!isActive)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isActive ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        isActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className={`text-xs font-bold ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-danger'}`}>
                    {isActive ? 'Active' : 'Suspended'}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-text-secondary hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !code.trim() || !name.trim()}
                  className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white shadow-md hover:brightness-110"
                >
                  {submitting ? 'Saving...' : editingBranch ? 'Update Branch' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
