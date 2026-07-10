'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MdSecurity,
  MdCheckCircle,
  MdRadioButtonUnchecked,
  MdArrowBack,
  MdSave,
  MdSearch,
} from 'react-icons/md';
import { apiFetch } from '@/lib/api-client';
import { usePermissions } from '@/hooks/use-permissions';

interface PermissionItem {
  resource: string;
  action: string;
}

const RESOURCE_LABELS: Record<string, string> = {
  branch: 'Branches & Showrooms',
  user: 'Sub Admins & Staff Directory',
  role: 'Security Roles & RBAC',
  currency: 'Multi-Currency & Forex',
  sequence: 'Numbering Sequences',
  customer: 'Customer Directory',
  vendor: 'Vendors & Suppliers',
  inventory: 'Stock & Inventory',
  'certified-diamond': 'Certified Diamonds',
  'loose-diamond': 'Loose Diamond Packets',
  jewelry: 'Finished Jewelry',
  purchase: 'Purchase Orders',
  sale: 'Sales Invoices & POS',
  memo: 'Consignment Memos',
  hold: 'Diamond Reservations',
  transfer: 'Branch Transfers',
  manufacturing: 'Manufacturing Jobs',
  accounting: 'Accounting Ledger',
  report: 'Analytics & BI Reports',
  audit: 'Security Audit Trails',
  notification: 'System Notifications',
};

export default function CreateRolePage() {
  const router = useRouter();
  const { has } = usePermissions();
  const canCreate = has('role:create');

  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [catalog, setCatalog] = useState<PermissionItem[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [moduleFilter, setModuleFilter] = useState('');

  useEffect(() => {
    async function loadCatalog() {
      setLoading(true);
      try {
        const res = await apiFetch<{ catalog?: PermissionItem[] }>('/api/tenant/roles');
        if (res.catalog) setCatalog(res.catalog);
      } catch {
        // Fallback or empty
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, []);

  const groupedCatalog = useMemo(() => {
    const map: Record<string, PermissionItem[]> = {};
    for (const item of catalog) {
      if (!map[item.resource]) map[item.resource] = [];
      map[item.resource].push(item);
    }
    return map;
  }, [catalog]);

  // Manual permission toggle without automated dependency overrides
  function handleTogglePermission(key: string) {
    if (selectedPermissions.includes(key)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== key));
    } else {
      setSelectedPermissions([...selectedPermissions, key]);
    }
  }

  function handleToggleCategory(resource: string) {
    const items = groupedCatalog[resource] || [];
    const keys = items.map((i) => `${i.resource}:${i.action}`);
    const allSelected = keys.every((k) => selectedPermissions.includes(k));

    if (allSelected) {
      setSelectedPermissions(selectedPermissions.filter((p) => !keys.includes(p)));
    } else {
      const set = new Set([...selectedPermissions, ...keys]);
      setSelectedPermissions(Array.from(set));
    }
  }

  async function handleCreateRole(e: React.FormEvent) {
    e.preventDefault();
    if (!roleName.trim()) {
      alert('Please enter a role name');
      return;
    }

    setSubmitting(true);
    try {
      const created = await apiFetch<{ id: string }>('/api/tenant/roles', {
        method: 'POST',
        body: JSON.stringify({
          name: roleName.trim(),
          description: roleDesc.trim() || undefined,
          permissions: selectedPermissions,
        }),
      });

      if (created?.id) {
        router.push(`/dashboard/roles/${created.id}`);
      } else {
        router.push('/dashboard/roles');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create role');
    } finally {
      setSubmitting(false);
    }
  }

  if (!canCreate) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/roles"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
        >
          <MdArrowBack size={16} /> Back to Roles List
        </Link>
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-6 text-center">
          <h2 className="text-sm font-bold text-danger">Access Denied</h2>
          <p className="mt-1 text-xs text-text-secondary">
            You do not have permission to create custom security roles.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Back Link & Header */}
      <div>
        <Link
          href="/dashboard/roles"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline mb-3"
        >
          <MdArrowBack size={16} /> Back to Roles List
        </Link>

        <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary text-xl">
              <MdSecurity size={26} />
            </div>
            <div>
              <h1 className="text-xl font-black text-foreground">Create New Custom Role</h1>
              <p className="text-xs text-text-secondary mt-0.5">
                Configure role name, description, and select custom granular permissions manually
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={submitting || !roleName.trim()}
            onClick={handleCreateRole}
            className={`inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all ${
              !roleName.trim()
                ? 'bg-muted text-text-muted cursor-not-allowed'
                : 'bg-primary hover:brightness-110'
            }`}
          >
            <MdSave size={16} />
            {submitting ? 'Creating Role...' : 'Create Role & Save Permissions'}
          </button>
        </div>
      </div>

      {/* Role Details Form Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-extrabold text-foreground mb-4">Role Profile Details</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
              Role Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Senior Sales Executive, Floor Supervisor"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-semibold text-foreground outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
              Description
            </label>
            <input
              type="text"
              placeholder="Describe responsibilities and access scope..."
              value={roleDesc}
              onChange={(e) => setRoleDesc(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Search Modules Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-xs">
          <MdSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Filter module name..."
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-text-muted outline-none focus:border-primary"
          />
        </div>

        <div className="text-xs font-semibold text-text-secondary">
          Selected Permissions: <span className="font-mono font-bold text-foreground">{selectedPermissions.length}</span>
        </div>
      </div>

      {/* Manual Permission Matrix Grid */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <span className="text-xs font-bold text-text-secondary">Loading Permissions Catalog...</span>
          </div>
        ) : (
          Object.entries(groupedCatalog)
            .filter(([resource]) =>
              moduleFilter
                ? resource.toLowerCase().includes(moduleFilter.toLowerCase()) ||
                  (RESOURCE_LABELS[resource] || '').toLowerCase().includes(moduleFilter.toLowerCase())
                : true
            )
            .map(([resource, perms]) => {
              const keys = perms.map((p) => `${p.resource}:${p.action}`);
              const allSelected = keys.every((k) => selectedPermissions.includes(k));

              return (
                <div
                  key={resource}
                  className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors"
                >
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-foreground">
                        {RESOURCE_LABELS[resource] || resource}
                      </span>
                      <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] text-text-secondary">
                        {perms.length} actions
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleCategory(resource)}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      {allSelected ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {perms.map((perm) => {
                      const key = `${perm.resource}:${perm.action}`;
                      const isChecked = selectedPermissions.includes(key);

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleTogglePermission(key)}
                          className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all ${
                            isChecked
                              ? 'border-primary/40 bg-primary/10 text-foreground font-semibold shadow-sm'
                              : 'border-border/70 bg-background text-text-secondary hover:border-border'
                          }`}
                        >
                          {isChecked ? (
                            <MdCheckCircle size={18} className="text-primary flex-none" />
                          ) : (
                            <MdRadioButtonUnchecked size={18} className="text-text-muted flex-none" />
                          )}
                          <span className="text-xs capitalize">
                            {perm.action.replace('-', ' ')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}
