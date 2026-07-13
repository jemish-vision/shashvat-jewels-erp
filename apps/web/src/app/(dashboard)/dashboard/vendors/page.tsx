'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  MdLocalShipping,
  MdAdd,
  MdSearch,
  MdClose,
  MdEdit,
  MdDelete,
  MdPhone,
  MdEmail,
  MdLocationOn,
  MdVisibility,
} from 'react-icons/md';
import { FilterCard } from '@/components/ui/filter-card';
import { CustomSelect } from '@/components/ui/custom-select';
import { TablePagination } from '@/components/ui/table-pagination';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm';
import { usePermissions } from '@/hooks/use-permissions';
import { apiFetch } from '@/lib/api-client';

interface VendorItem {
  id: string;
  code: string;
  type: 'LOCAL' | 'IMPORT' | 'CONTRACTOR';
  name: string;
  email: string | null;
  phone: string | null;
  taxId: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  paymentTerms: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function VendorsManagementPage() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { has } = usePermissions();

  const canCreate = has('vendor:create');
  const canUpdate = has('vendor:update');
  const canDelete = has('vendor:delete');

  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<VendorItem | null>(null);
  const [viewingVendor, setViewingVendor] = useState<VendorItem | null>(null);

  const fetchVendors = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('pageSize', String(pageSize));
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (typeFilter !== 'ALL') params.set('type', typeFilter);
      if (statusFilter === 'ACTIVE') params.set('isActive', 'true');
      if (statusFilter === 'INACTIVE') params.set('isActive', 'false');

      const res = await apiFetch<any>(`/api/tenant/vendors?${params.toString()}`);
      const items = Array.isArray(res) ? res : res?.data || [];
      const total =
        !Array.isArray(res) && res?.meta?.totalCount !== undefined
          ? res.meta.totalCount
          : items.length;

      setVendors(items);
      setTotalCount(total);
    } catch (err: any) {
      setError(err.message || 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [currentPage, pageSize, typeFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchVendors();
  };

  const stats = useMemo(() => {
    const total = totalCount;
    const local = vendors.filter((v) => v.type === 'LOCAL').length;
    const imports = vendors.filter((v) => v.type === 'IMPORT').length;
    const contractors = vendors.filter((v) => v.type === 'CONTRACTOR').length;
    return { total, local, imports, contractors };
  }, [vendors, totalCount]);

  const handleToggleStatus = async (item: VendorItem) => {
    if (!canUpdate) return;
    try {
      await apiFetch(`/api/tenant/vendors/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      toast(`${item.name} status updated successfully`, 'success');
      setVendors((prev) =>
        prev.map((v) => (v.id === item.id ? { ...v, isActive: !v.isActive } : v))
      );
    } catch (err: any) {
      toast(err.message || 'Could not update status', 'error');
    }
  };

  const handleDelete = async (item: VendorItem) => {
    if (!canDelete) return;
    const confirmed = await confirm(
      `Are you sure you want to archive "${item.name}" (${item.code})? Historical purchase and job work records will remain preserved.`,
      {
        title: 'Archive Vendor Account',
        confirmText: 'Archive Vendor',
        variant: 'danger',
      }
    );
    if (!confirmed) return;

    try {
      await apiFetch(`/api/tenant/vendors/${item.id}`, { method: 'DELETE' });
      toast(`${item.name} has been archived successfully.`, 'success');
      fetchVendors();
    } catch (err: any) {
      toast(err.message || 'Could not delete vendor', 'error');
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startRange = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRange = Math.min(currentPage * pageSize, totalCount);

  const hasActiveFilters = Boolean(searchQuery || typeFilter !== 'ALL' || statusFilter !== 'ALL');

  function resetFilters() {
    setSearchQuery('');
    setTypeFilter('ALL');
    setStatusFilter('ALL');
    setCurrentPage(1);
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MdLocalShipping size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-foreground">
              Vendors & Suppliers Directory
            </h1>
            <p className="text-xs font-medium text-text-secondary">
              Manage bullion dealers, diamond importers, karigar workshops, and payment terms
            </p>
          </div>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={() => {
              setEditingVendor(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:brightness-110"
          >
            <MdAdd size={16} />
            New Vendor
          </button>
        )}
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Vendors
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MdLocalShipping size={18} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{stats.total}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Local Suppliers
            </span>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              LOCAL
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{stats.local}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Import Suppliers
            </span>
            <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400">
              IMPORT
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{stats.imports}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Contractors
            </span>
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
              JOB WORK
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{stats.contractors}</p>
        </div>
      </div>

      {/* Filter Card */}
      <FilterCard onReset={resetFilters} showReset={hasActiveFilters}>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-text-muted">Search Vendor</label>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5">
              <MdSearch size={16} className="text-text-muted" />
              <input
                placeholder="Search vendor name, code, email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-48 bg-transparent text-xs text-foreground outline-none placeholder:text-text-muted"
              />
              {searchQuery && (
                <button
                  type="button"
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
            <label className="text-[10px] font-bold uppercase text-text-muted">Vendor Type</label>
            <CustomSelect
              width="180px"
              options={[
                { value: 'ALL', label: 'All Vendor Types' },
                { value: 'LOCAL', label: 'Local Suppliers' },
                { value: 'IMPORT', label: 'Import Suppliers' },
                { value: 'CONTRACTOR', label: 'Contractors' },
              ]}
              value={typeFilter}
              onChange={(val) => {
                setTypeFilter(val);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-text-muted">Status</label>
            <CustomSelect
              width="150px"
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'ACTIVE', label: 'Active Only' },
                { value: 'INACTIVE', label: 'Inactive Only' },
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

      {/* Data Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-[11px] font-extrabold uppercase tracking-wider text-text-secondary">
                <th className="p-4">Vendor & Code</th>
                <th className="p-4">Vendor Type</th>
                <th className="p-4">Contact Details</th>
                <th className="p-4">Location</th>
                <th className="p-4">Payment Terms</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    Loading vendors directory...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <p className="text-sm font-bold text-destructive">
                        {error.includes('Unexpected token') || error.includes('<!DOCTYPE')
                          ? 'Unable to load vendors from API'
                          : error}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Please verify your connection or try resetting active filters.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : vendors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <MdLocalShipping className="h-10 w-10 text-muted-foreground/50" />
                      <p className="text-sm font-bold text-foreground">No vendors found</p>
                      <p className="text-xs text-muted-foreground">
                        {hasActiveFilters
                          ? 'No vendor records match your active search or filters. Try resetting above.'
                          : 'No vendors added yet. Click "New Vendor" to create your first supplier account.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                vendors.map((v) => (
                  <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-extrabold text-primary">
                          {v.code}
                        </span>
                        <span className="font-extrabold text-foreground">{v.name}</span>
                      </div>
                    </td>

                    <td className="p-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                          v.type === 'IMPORT'
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                            : v.type === 'CONTRACTOR'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {v.type}
                      </span>
                    </td>

                    <td className="p-4 text-text-secondary">
                      <div className="space-y-1 text-xs">
                        {v.phone && (
                          <div className="flex items-center gap-1.5 font-mono">
                            <MdPhone size={13} className="text-text-muted flex-none" />
                            <span>{v.phone}</span>
                          </div>
                        )}
                        {v.email && (
                          <div className="flex items-center gap-1.5">
                            <MdEmail size={14} className="text-text-muted flex-none" />
                            <span>{v.email}</span>
                          </div>
                        )}
                        {!v.phone && !v.email && (
                          <span className="text-text-muted">—</span>
                        )}
                      </div>
                    </td>

                    <td className="p-4 text-text-secondary">
                      <div className="flex items-center gap-1.5">
                        <MdLocationOn size={14} className="text-text-muted flex-none" />
                        <span>{[v.city, v.country || 'India'].filter(Boolean).join(', ')}</span>
                      </div>
                    </td>

                    <td className="p-4 font-mono text-xs font-semibold text-foreground">
                      {v.paymentTerms || 'Net 30'}
                    </td>

                    <td className="p-4">
                      <button
                        type="button"
                        disabled={!canUpdate}
                        onClick={() => handleToggleStatus(v)}
                        className="group inline-flex items-center rounded-full focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        title={
                          canUpdate
                            ? `Status: ${v.isActive ? 'Active' : 'Suspended'} — Click to toggle`
                            : 'No permission to update status'
                        }
                      >
                        <span
                          className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
                            v.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
                              v.isActive ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </span>
                      </button>
                    </td>

                    <td className="p-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setViewingVendor(v)}
                          title="View Vendor Details"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-text-secondary transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
                        >
                          <MdVisibility size={14} />
                        </button>
                        {canUpdate && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingVendor(v);
                              setModalOpen(true);
                            }}
                            title="Edit Vendor"
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-text-secondary transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
                          >
                            <MdEdit size={14} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(v)}
                            title="Delete Vendor"
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-text-secondary transition-colors hover:border-danger hover:bg-danger/10 hover:text-danger"
                          >
                            <MdDelete size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          startRange={startRange}
          endRange={endRange}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </div>

      {modalOpen && (
        <VendorModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          vendor={editingVendor}
          onSaved={() => {
            setModalOpen(false);
            fetchVendors();
          }}
        />
      )}

      {viewingVendor && (
        <VendorViewModal
          vendor={viewingVendor}
          onClose={() => setViewingVendor(null)}
          onEdit={() => {
            const v = viewingVendor;
            setViewingVendor(null);
            setEditingVendor(v);
            setModalOpen(true);
          }}
          canUpdate={canUpdate}
        />
      )}
    </div>
  );
}

function VendorModal({
  isOpen,
  onClose,
  vendor,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  vendor: VendorItem | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    type: vendor?.type || 'LOCAL',
    name: vendor?.name || '',
    email: vendor?.email || '',
    phone: vendor?.phone || '',
    taxId: vendor?.taxId || '',
    paymentTerms: vendor?.paymentTerms || 'Net 30',
    city: vendor?.city || '',
    country: vendor?.country || 'India',
    address: vendor?.address || '',
    notes: vendor?.notes || '',
    isActive: vendor?.isActive ?? true,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast('Vendor name is required', 'error');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        type: form.type,
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        taxId: form.taxId.trim() || undefined,
        paymentTerms: form.paymentTerms.trim() || undefined,
        city: form.city.trim() || undefined,
        country: form.country,
        address: form.address.trim() || undefined,
        notes: form.notes.trim() || undefined,
        isActive: form.isActive,
      };

      if (vendor) {
        await apiFetch(`/api/tenant/vendors/${vendor.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast(`${form.name} updated successfully.`, 'success');
      } else {
        await apiFetch('/api/tenant/vendors', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast(`${form.name} added successfully.`, 'success');
      }

      onSaved();
    } catch (err: any) {
      toast(err.message || 'Could not save vendor', 'error');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold text-foreground">
            {vendor ? `Edit Vendor — ${vendor.code}` : 'New Vendor Account'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <MdClose size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Vendor Type
              </label>
              <div className="mt-1">
                <CustomSelect
                  size="md"
                  width="100%"
                  options={[
                    { value: 'LOCAL', label: 'Local Supplier' },
                    { value: 'IMPORT', label: 'Import Supplier' },
                    { value: 'CONTRACTOR', label: 'Contractor' },
                  ]}
                  value={form.type}
                  onChange={(val) => setForm({ ...form, type: val as any })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Vendor Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Antwerp Gems N.V. or Shreeji Bullion"
                className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Phone Number
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="supplier@example.com"
                className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                GSTIN / Tax ID
              </label>
              <input
                type="text"
                value={form.taxId}
                onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                placeholder="24AABCU9603R1ZM"
                className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Payment Terms
              </label>
              <input
                type="text"
                value={form.paymentTerms}
                onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                placeholder="Net 30 / Advance / COD"
                className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                City
              </label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Surat / Mumbai / Antwerp"
                className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Country
              </label>
              <input
                type="text"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Full Address
              </label>
              <textarea
                rows={2}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Notes / Agreement Details
              </label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Gold assay terms, diamond certification supplier notes, etc."
                className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-primary px-5 py-2 text-sm font-bold text-white shadow-md transition-all hover:brightness-110 disabled:opacity-50"
            >
              {loading ? 'Saving...' : vendor ? 'Save Changes' : 'Create Vendor'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function VendorViewModal({
  vendor,
  onClose,
  onEdit,
  canUpdate,
}: {
  vendor: VendorItem;
  onClose: () => void;
  onEdit: () => void;
  canUpdate: boolean;
}) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in-0">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
        {/* Header Banner */}
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-primary/10 px-2.5 py-1 font-mono text-xs font-extrabold text-primary">
              {vendor.code}
            </span>
            <div>
              <h3 className="text-lg font-extrabold text-foreground">{vendor.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-text-secondary font-medium">
                  Vendor Type: <strong className="text-foreground">{vendor.type}</strong>
                </span>
                <span className="text-text-muted">•</span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    vendor.isActive
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-destructive/15 text-destructive'
                  }`}
                >
                  {vendor.isActive ? 'Active Supplier' : 'Suspended'}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-text-secondary transition-colors hover:bg-muted hover:text-foreground"
          >
            <MdClose size={20} />
          </button>
        </div>

        {/* Body Content */}
        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Contact Details Card */}
            <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-secondary">
                Contact Information
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <MdPhone size={15} className="text-primary flex-none" />
                  <span className="font-mono text-foreground font-semibold">
                    {vendor.phone || 'No phone recorded'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MdEmail size={15} className="text-primary flex-none" />
                  <span className="text-foreground font-medium">
                    {vendor.email || 'No email recorded'}
                  </span>
                </div>
              </div>
            </div>

            {/* Commercial Terms Card */}
            <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-secondary">
                Commercial Details
              </h4>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-text-secondary">Payment Terms: </span>
                  <span className="font-mono font-extrabold text-foreground">
                    {vendor.paymentTerms || 'Net 30'}
                  </span>
                </div>
                <div>
                  <span className="text-text-secondary">Tax ID / PAN / GSTIN: </span>
                  <span className="font-mono font-bold text-foreground">
                    {vendor.taxId || 'Not provided'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Location & Address */}
          <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-secondary">
              Address & Location
            </h4>
            <div className="text-xs">
              <span className="block font-semibold text-text-secondary">Full Address</span>
              <p className="mt-1 text-foreground">
                {vendor.address || 'No street address provided'}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text-secondary border-t border-border/60 pt-2.5">
              <MdLocationOn size={15} className="text-text-muted flex-none" />
              <span>
                Region: <strong className="text-foreground">{[vendor.city, vendor.country || 'India'].filter(Boolean).join(', ')}</strong>
              </span>
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-2xl border border-border bg-muted/20 p-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-secondary mb-1.5">
              Vendor Notes / Remarks
            </h4>
            <p className="text-xs text-foreground whitespace-pre-wrap">
              {vendor.notes || 'No special remarks or notes recorded for this vendor.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border bg-muted/30 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-foreground transition-colors hover:bg-muted"
          >
            Close
          </button>
          {canUpdate && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-md transition-all hover:brightness-110"
            >
              <MdEdit size={14} />
              Edit Vendor
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
