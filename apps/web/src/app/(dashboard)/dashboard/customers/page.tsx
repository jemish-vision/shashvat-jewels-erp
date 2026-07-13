'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  MdGroup,
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

interface CustomerItem {
  id: string;
  code: string;
  type: 'RETAIL' | 'WHOLESALE' | 'CORPORATE';
  name: string;
  email: string | null;
  phone: string | null;
  taxId: string | null;
  billingAddress: string | null;
  shippingAddress: string | null;
  city: string | null;
  country: string | null;
  creditLimit: number | string;
  outstandingBalance?: number;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function CustomersManagementPage() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { has } = usePermissions();

  const canCreate = has('customer:create');
  const canUpdate = has('customer:update');
  const canDelete = has('customer:delete');

  const [customers, setCustomers] = useState<CustomerItem[]>([]);
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
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<CustomerItem | null>(null);

  const fetchCustomers = async () => {
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

      const res = await apiFetch<any>(`/api/tenant/customers?${params.toString()}`);
      const items = Array.isArray(res) ? res : res?.data || [];
      const total =
        !Array.isArray(res) && res?.meta?.totalCount !== undefined
          ? res.meta.totalCount
          : items.length;

      setCustomers(items);
      setTotalCount(total);
    } catch (err: any) {
      setError(err.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [currentPage, pageSize, typeFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchCustomers();
  };

  const stats = useMemo(() => {
    const total = totalCount;
    const retail = customers.filter((c) => c.type === 'RETAIL').length;
    const wholesale = customers.filter((c) => c.type === 'WHOLESALE').length;
    const corporate = customers.filter((c) => c.type === 'CORPORATE').length;
    return { total, retail, wholesale, corporate };
  }, [customers, totalCount]);

  const handleToggleStatus = async (item: CustomerItem) => {
    if (!canUpdate) return;
    try {
      await apiFetch(`/api/tenant/customers/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      toast(`${item.name} status updated successfully`, 'success');
      setCustomers((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, isActive: !c.isActive } : c))
      );
    } catch (err: any) {
      toast(err.message || 'Could not update status', 'error');
    }
  };

  const handleDelete = async (item: CustomerItem) => {
    if (!canDelete) return;
    const confirmed = await confirm(
      `Are you sure you want to archive "${item.name}" (${item.code})? Historical memos and sales records will remain preserved.`,
      {
        title: 'Archive Customer Account',
        confirmText: 'Archive Customer',
        variant: 'danger',
      }
    );
    if (!confirmed) return;

    try {
      await apiFetch(`/api/tenant/customers/${item.id}`, { method: 'DELETE' });
      toast(`${item.name} has been archived successfully.`, 'success');
      fetchCustomers();
    } catch (err: any) {
      toast(err.message || 'Could not delete customer', 'error');
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
            <MdGroup size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-foreground">
              Customers Directory
            </h1>
            <p className="text-xs font-medium text-text-secondary">
              Manage retail clients, wholesale partners, corporate buyers, and credit terms
            </p>
          </div>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={() => {
              setEditingCustomer(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:brightness-110"
          >
            <MdAdd size={16} />
            New Customer
          </button>
        )}
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Customers
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MdGroup size={18} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{stats.total}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Retail Clients
            </span>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              B2C
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{stats.retail}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Wholesale Accounts
            </span>
            <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400">
              B2B
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{stats.wholesale}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Corporate Accounts
            </span>
            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
              CORP
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{stats.corporate}</p>
        </div>
      </div>

      {/* Filter Card */}
      <FilterCard onReset={resetFilters} showReset={hasActiveFilters}>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-text-muted">Search Customer</label>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5">
              <MdSearch size={16} className="text-text-muted" />
              <input
                placeholder="Search name, code, email..."
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
            <label className="text-[10px] font-bold uppercase text-text-muted">Customer Type</label>
            <CustomSelect
              width="180px"
              options={[
                { value: 'ALL', label: 'All Customer Types' },
                { value: 'RETAIL', label: 'Retail (B2C)' },
                { value: 'WHOLESALE', label: 'Wholesale (B2B)' },
                { value: 'CORPORATE', label: 'Corporate Accounts' },
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
                <th className="p-4">Customer & Code</th>
                <th className="p-4">Client Type</th>
                <th className="p-4">Contact Details</th>
                <th className="p-4">Location</th>
                <th className="p-4 text-right">Outstanding / Limit</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    Loading customers directory...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <p className="text-sm font-bold text-destructive">
                        {error.includes('Unexpected token') || error.includes('<!DOCTYPE')
                          ? 'Unable to load customers from API'
                          : error}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Please verify your connection or try resetting active filters.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <MdGroup className="h-10 w-10 text-muted-foreground/50" />
                      <p className="text-sm font-bold text-foreground">No customers found</p>
                      <p className="text-xs text-muted-foreground">
                        {hasActiveFilters
                          ? 'No customer records match your active search or filters. Try resetting above.'
                          : 'No customers added yet. Click "New Customer" to create your first account.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-extrabold text-primary">
                          {c.code}
                        </span>
                        <span className="font-extrabold text-foreground">{c.name}</span>
                      </div>
                    </td>

                    <td className="p-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                          c.type === 'WHOLESALE'
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                            : c.type === 'CORPORATE'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {c.type}
                      </span>
                    </td>

                    <td className="p-4 text-text-secondary">
                      <div className="space-y-0.5">
                        {c.phone && <div className="font-mono">{c.phone}</div>}
                        {c.email && <div className="text-text-muted">{c.email}</div>}
                        {!c.phone && !c.email && <span className="text-text-muted">No contact info</span>}
                      </div>
                    </td>

                    <td className="p-4 text-text-secondary">
                      <div className="flex items-center gap-1.5">
                        <MdLocationOn size={14} className="text-text-muted flex-none" />
                        <span>{[c.city, c.country || 'India'].filter(Boolean).join(', ')}</span>
                      </div>
                    </td>

                    <td className="p-4 text-right font-mono">
                      <div className="font-bold text-foreground">
                        ₹{Number(c.outstandingBalance || 0).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-text-muted">
                        Limit: ₹{Number(c.creditLimit || 0).toLocaleString('en-IN')}
                      </div>
                    </td>

                    <td className="p-4">
                      <button
                        type="button"
                        disabled={!canUpdate}
                        onClick={() => handleToggleStatus(c)}
                        className="group inline-flex items-center rounded-full focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        title={
                          canUpdate
                            ? `Status: ${c.isActive ? 'Active' : 'Suspended'} — Click to toggle`
                            : 'No permission to update status'
                        }
                      >
                        <span
                          className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
                            c.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
                              c.isActive ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </span>
                      </button>
                    </td>

                    <td className="p-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setViewingCustomer(c)}
                          title="View Customer Details"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-text-secondary transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
                        >
                          <MdVisibility size={14} />
                        </button>
                        {canUpdate && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCustomer(c);
                              setModalOpen(true);
                            }}
                            title="Edit Customer"
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-text-secondary transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
                          >
                            <MdEdit size={14} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(c)}
                            title="Delete Customer"
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
        <CustomerModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          customer={editingCustomer}
          onSaved={() => {
            setModalOpen(false);
            fetchCustomers();
          }}
        />
      )}

      {viewingCustomer && (
        <CustomerViewModal
          customer={viewingCustomer}
          onClose={() => setViewingCustomer(null)}
          onEdit={() => {
            const c = viewingCustomer;
            setViewingCustomer(null);
            setEditingCustomer(c);
            setModalOpen(true);
          }}
          canUpdate={canUpdate}
        />
      )}
    </div>
  );
}

function CustomerModal({
  isOpen,
  onClose,
  customer,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerItem | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    type: customer?.type || 'RETAIL',
    name: customer?.name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    taxId: customer?.taxId || '',
    creditLimit: customer?.creditLimit ? String(customer.creditLimit) : '0',
    city: customer?.city || '',
    country: customer?.country || 'India',
    billingAddress: customer?.billingAddress || '',
    shippingAddress: customer?.shippingAddress || '',
    notes: customer?.notes || '',
    isActive: customer?.isActive ?? true,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast('Customer name is required', 'error');
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
        creditLimit: Number(form.creditLimit || 0),
        city: form.city.trim() || undefined,
        country: form.country,
        billingAddress: form.billingAddress.trim() || undefined,
        shippingAddress: form.shippingAddress.trim() || undefined,
        notes: form.notes.trim() || undefined,
        isActive: form.isActive,
      };

      if (customer) {
        await apiFetch(`/api/tenant/customers/${customer.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast(`${form.name} updated successfully.`, 'success');
      } else {
        await apiFetch('/api/tenant/customers', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast(`${form.name} added successfully.`, 'success');
      }

      onSaved();
    } catch (err: any) {
      toast(err.message || 'Could not save customer', 'error');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold text-foreground">
            {customer ? `Edit Customer — ${customer.code}` : 'New Customer Account'}
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
                Client Type
              </label>
              <div className="mt-1">
                <CustomSelect
                  size="md"
                  width="100%"
                  options={[
                    { value: 'RETAIL', label: 'Retail (B2C)' },
                    { value: 'WHOLESALE', label: 'Wholesale (B2B)' },
                    { value: 'CORPORATE', label: 'Corporate Account' },
                  ]}
                  value={form.type}
                  onChange={(val) => setForm({ ...form, type: val as any })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Customer Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Rajesh Kumar or Zaveri & Sons"
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
                placeholder="client@example.com"
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
                placeholder="27AABCU9603R1ZM"
                className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Credit Limit (₹)
              </label>
              <input
                type="number"
                min="0"
                value={form.creditLimit}
                onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
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
                placeholder="Surat / Mumbai"
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
                Billing Address
              </label>
              <textarea
                rows={2}
                value={form.billingAddress}
                onChange={(e) => setForm({ ...form, billingAddress: e.target.value })}
                className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Notes / Special Preferences
              </label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Preferred gold purity, trusted referral, etc."
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
              {loading ? 'Saving...' : customer ? 'Save Changes' : 'Create Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function CustomerViewModal({
  customer,
  onClose,
  onEdit,
  canUpdate,
}: {
  customer: CustomerItem;
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
              {customer.code}
            </span>
            <div>
              <h3 className="text-lg font-extrabold text-foreground">{customer.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-text-secondary font-medium">
                  Client Type: <strong className="text-foreground">{customer.type}</strong>
                </span>
                <span className="text-text-muted">•</span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    customer.isActive
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-destructive/15 text-destructive'
                  }`}
                >
                  {customer.isActive ? 'Active Account' : 'Suspended'}
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
                    {customer.phone || 'No phone recorded'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MdEmail size={15} className="text-primary flex-none" />
                  <span className="text-foreground font-medium">
                    {customer.email || 'No email recorded'}
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Profile Card */}
            <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-secondary">
                Financial Details
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Outstanding Owed:</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                    ₹{Number(customer.outstandingBalance || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Credit Limit:</span>
                  <span className="font-mono font-extrabold text-foreground">
                    ₹{Number(customer.creditLimit || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-border/60 pt-1.5">
                  <span className="text-text-secondary">Available Credit:</span>
                  <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                    ₹{Math.max(0, Number(customer.creditLimit || 0) - Number(customer.outstandingBalance || 0)).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="pt-1">
                  <span className="text-text-secondary">Tax ID / PAN / GSTIN: </span>
                  <span className="font-mono font-bold text-foreground">
                    {customer.taxId || 'Not provided'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Location & Addresses */}
          <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-secondary">
              Address & Location
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="block font-semibold text-text-secondary">Billing Address</span>
                <p className="mt-1 text-foreground">
                  {customer.billingAddress || 'No billing address provided'}
                </p>
              </div>
              <div>
                <span className="block font-semibold text-text-secondary">Shipping Address</span>
                <p className="mt-1 text-foreground">
                  {customer.shippingAddress || 'No shipping address provided'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text-secondary border-t border-border/60 pt-2.5">
              <MdLocationOn size={15} className="text-text-muted flex-none" />
              <span>
                Region: <strong className="text-foreground">{[customer.city, customer.country || 'India'].filter(Boolean).join(', ')}</strong>
              </span>
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-2xl border border-border bg-muted/20 p-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-secondary mb-1.5">
              Account Notes / Remarks
            </h4>
            <p className="text-xs text-foreground whitespace-pre-wrap">
              {customer.notes || 'No special preferences or notes recorded for this customer.'}
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
              Edit Customer
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
