'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  MdSecurity,
  MdLock,
  MdCheckCircle,
  MdRadioButtonUnchecked,
  MdSave,
  MdArrowBack,
  MdEdit,
  MdDelete,
  MdClose,
  MdSearch,
} from 'react-icons/md';
import { apiFetch } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm';
import { usePermissions } from '@/hooks/use-permissions';

interface PermissionItem {
  resource: string;
  action: string;
}

interface RoleDetail {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  userCount: number;
  permissions: string[];
}

const RESOURCE_LABELS: Record<string, string> = {
  'certified-diamond': 'Certified Diamonds',
  'loose-diamond': 'Loose Diamonds',
  jewelry: 'Jewelry',
  purchase: 'Purchase',
  sale: 'Sales',
  memo: 'Memos',
  hold: 'Holds',
  transfer: 'Transfers',
  manufacturing: 'Manufacturing',
  customer: 'Customers',
  vendor: 'Vendors',
  accounting: 'Accounting',
  report: 'Reports',
  role: 'Roles & Permissions',
  branch: 'Branch Management',
  user: 'Sub Admins',
  notification: 'Notifications',
};

const SIDEBAR_MODULE_ORDER = [
  'certified-diamond',
  'loose-diamond',
  'jewelry',
  'purchase',
  'sale',
  'memo',
  'hold',
  'transfer',
  'manufacturing',
  'customer',
  'vendor',
  'accounting',
  'report',
  'role',
  'branch',
  'user',
  'notification',
];

export default function RolePermissionMatrixPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { has } = usePermissions();
  const canUpdate = has('role:update');
  const canDelete = has('role:delete');

  const params = useParams();
  const roleId = params?.id as string;

  const [role, setRole] = useState<RoleDetail | null>(null);
  const [catalog, setCatalog] = useState<PermissionItem[]>([]);
  const [draftPermissions, setDraftPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [moduleFilter, setModuleFilter] = useState('');

  // Edit role details modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  async function loadRoleDetail() {
    if (!roleId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{
        role: RoleDetail;
        catalog: PermissionItem[];
      }>(`/api/tenant/roles/${roleId}`);
      setRole(res.role);
      setCatalog(res.catalog || []);
      const existingPerms = res.role?.permissions || [];
      const normalizedSet = new Set<string>(existingPerms);
      for (const p of existingPerms) {
        const [resKey] = p.split(':');
        if (resKey) {
          normalizedSet.add(`${resKey}:list`);
        }
      }
      setDraftPermissions(Array.from(normalizedSet));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load role permissions');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRoleDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleId]);

  const groupedCatalog = useMemo(() => {
    const ACTION_ORDER = ['list', 'view', 'create', 'update', 'delete'];
    const map: Record<string, PermissionItem[]> = {};
    for (const item of catalog) {
      if (!map[item.resource]) map[item.resource] = [];
      map[item.resource].push(item);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => {
        const iA = ACTION_ORDER.indexOf(a.action);
        const iB = ACTION_ORDER.indexOf(b.action);
        const posA = iA === -1 ? 99 : iA;
        const posB = iB === -1 ? 99 : iB;
        return posA - posB;
      });
    }
    return map;
  }, [catalog]);

  // Toggle permission with auto-grant list & auto-revoke dependent actions
  function handleTogglePermission(key: string) {
    if (!role || role.isSystem) return;
    const [resource, action] = key.split(':');
    const isCurrentlySelected = draftPermissions.includes(key);

    if (isCurrentlySelected) {
      if (action === 'list') {
        // Revoking 'list' automatically removes ALL permissions for this resource
        setDraftPermissions(draftPermissions.filter((p) => !p.startsWith(`${resource}:`)));
      } else {
        setDraftPermissions(draftPermissions.filter((p) => p !== key));
      }
    } else {
      const nextSet = new Set(draftPermissions);
      nextSet.add(key);
      // Granting any action automatically grants 'list' permission
      if (action !== 'list') {
        nextSet.add(`${resource}:list`);
      }
      setDraftPermissions(Array.from(nextSet));
    }
  }

  function handleToggleCategory(resource: string) {
    if (!role || role.isSystem) return;
    const items = groupedCatalog[resource] || [];
    const keys = items.map((i) => `${i.resource}:${i.action}`);
    const allSelected = keys.every((k) => draftPermissions.includes(k));

    if (allSelected) {
      setDraftPermissions(draftPermissions.filter((p) => !keys.includes(p)));
    } else {
      const set = new Set([...draftPermissions, ...keys]);
      setDraftPermissions(Array.from(set));
    }
  }

  async function handleSavePermissions() {
    if (!role || role.isSystem) return;
    setSaving(true);
    try {
      await apiFetch(`/api/tenant/roles/${role.id}`, {
        method: 'PUT',
        body: JSON.stringify({ permissions: draftPermissions }),
      });
      await loadRoleDetail();
      toast('Role permissions updated successfully!', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to update role permissions', 'error');
    } finally {
      setSaving(false);
    }
  }

  function openEditModal() {
    if (!role || role.isSystem) return;
    setEditName(role.name);
    setEditDesc(role.description || '');
    setIsEditModalOpen(true);
  }

  async function handleSaveRoleDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!role || !editName.trim()) return;
    setSubmittingEdit(true);
    try {
      await apiFetch(`/api/tenant/roles/${role.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editName.trim(),
          description: editDesc.trim() || undefined,
          permissions: draftPermissions,
        }),
      });
      setIsEditModalOpen(false);
      toast('Role updated successfully!', 'success');
      await loadRoleDetail();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to update role details', 'error');
    } finally {
      setSubmittingEdit(false);
    }
  }

  async function handleDeleteRole() {
    if (!role) return;
    if (role.isSystem) {
      toast('System baseline roles cannot be deleted.', 'error');
      return;
    }
    if (role.userCount > 0) {
      toast(`Cannot delete role assigned to ${role.userCount} user(s). Reassign them first.`, 'error');
      return;
    }
    const ok = await confirm(`Are you sure you want to delete the role "${role.name}"?`, {
      title: 'Delete Security Role',
      variant: 'danger',
      confirmText: 'Delete Role',
      cancelText: 'Cancel',
    });
    if (!ok) return;

    try {
      await apiFetch(`/api/tenant/roles/${role.id}`, { method: 'DELETE' });
      toast('Role deleted successfully!', 'success');
      router.push('/dashboard/roles');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to delete role', 'error');
    }
  }

  const hasUnsavedChanges = useMemo(() => {
    if (!role) return false;
    if (role.permissions.length !== draftPermissions.length) return true;
    const origSet = new Set(role.permissions);
    return draftPermissions.some((p) => !origSet.has(p));
  }, [role, draftPermissions]);

  if (loading) {
    return (
      <div className="flex min-h-[440px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-xs font-bold text-text-secondary">Loading Permission Matrix...</span>
        </div>
      </div>
    );
  }

  if (error || !role) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/roles"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
        >
          <MdArrowBack size={16} /> Back to Roles List
        </Link>
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-xs font-semibold text-danger">
          {error || 'Role not found'}
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
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${
                role.isSystem ? 'bg-amber-500/15 text-amber-600' : 'bg-primary/15 text-primary'
              }`}
            >
              {role.isSystem ? <MdLock size={26} /> : <MdSecurity size={26} />}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-black text-foreground">{role.name}</h1>
                {role.isSystem ? (
                  <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                    System Baseline (Protected)
                  </span>
                ) : (
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    Custom Role Profile
                  </span>
                )}
                {!canUpdate && (
                  <span className="rounded bg-gray-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Read-Only
                  </span>
                )}
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                {role.description || 'Configurable access profile'} • Assigned to {role.userCount} user(s)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {!role.isSystem && canUpdate && (
              <button
                type="button"
                onClick={openEditModal}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:bg-muted"
              >
                <MdEdit size={16} />
                Edit Role
              </button>
            )}
            {!role.isSystem && canDelete && (
              <button
                type="button"
                onClick={handleDeleteRole}
                className="inline-flex items-center gap-1.5 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2 text-xs font-bold text-danger hover:bg-danger/20"
              >
                <MdDelete size={16} />
                Delete Role
              </button>
            )}

            {!role.isSystem && canUpdate && (
              <button
                type="button"
                disabled={!hasUnsavedChanges || saving}
                onClick={handleSavePermissions}
                className={`inline-flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-bold shadow-md transition-all ${
                  hasUnsavedChanges
                    ? 'bg-primary text-white hover:brightness-110'
                    : 'bg-muted text-text-muted cursor-not-allowed'
                }`}
              >
                <MdSave size={16} />
                {saving ? 'Saving...' : 'Save Permissions'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Permission Matrix Table Card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* Table Toolbar */}
        <div className="flex flex-col gap-3 border-b border-border bg-muted/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-72">
            <MdSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Filter module name..."
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-text-muted outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-4">
            {!role.isSystem && canUpdate && (
              <button
                type="button"
                onClick={() => {
                  const filteredEntries = Object.entries(groupedCatalog)
                    .filter(([resource]) => Boolean(RESOURCE_LABELS[resource]))
                    .filter(([resource]) =>
                      moduleFilter
                        ? resource.toLowerCase().includes(moduleFilter.toLowerCase()) ||
                          (RESOURCE_LABELS[resource] || '').toLowerCase().includes(moduleFilter.toLowerCase())
                        : true
                    );
                  const allFilteredKeys = filteredEntries.flatMap(([, perms]) =>
                    perms.map((p) => `${p.resource}:${p.action}`)
                  );
                  const isAllSelected = allFilteredKeys.every((k) => draftPermissions.includes(k));
                  if (isAllSelected) {
                    setDraftPermissions(draftPermissions.filter((k) => !allFilteredKeys.includes(k)));
                  } else {
                    const set = new Set([...draftPermissions, ...allFilteredKeys]);
                    setDraftPermissions(Array.from(set));
                  }
                }}
                className="rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-primary shadow-xs transition-all hover:bg-muted"
              >
                Toggle All Filtered
              </button>
            )}
            <div className="text-xs font-semibold text-text-secondary">
              Selected: <span className="font-mono font-bold text-foreground">{draftPermissions.length}</span>
            </div>
          </div>
        </div>

        {/* Structured Table Layout */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-[11px] font-extrabold uppercase tracking-wider text-text-secondary">
                <th className="w-[220px] px-5 py-3">Module Name</th>
                <th className="w-[130px] px-4 py-3 text-center">Quick Select</th>
                <th className="px-5 py-3">Available Permissions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Object.entries(groupedCatalog)
                .filter(([resource]) => Boolean(RESOURCE_LABELS[resource]))
                .filter(([resource]) =>
                  moduleFilter
                    ? resource.toLowerCase().includes(moduleFilter.toLowerCase()) ||
                      (RESOURCE_LABELS[resource] || '').toLowerCase().includes(moduleFilter.toLowerCase())
                    : true
                )
                .sort(([resA], [resB]) => {
                  const indexA = SIDEBAR_MODULE_ORDER.indexOf(resA);
                  const indexB = SIDEBAR_MODULE_ORDER.indexOf(resB);
                  const aPos = indexA === -1 ? 999 : indexA;
                  const bPos = indexB === -1 ? 999 : indexB;
                  return aPos - bPos;
                })
                .map(([resource, perms]) => {
                  const keys = perms.map((p) => `${p.resource}:${p.action}`);
                  const allSelected = keys.every((k) => draftPermissions.includes(k));

                  return (
                    <tr key={resource} className="transition-colors hover:bg-muted/30">
                      <td className="align-middle px-5 py-3.5">
                        <div className="text-xs font-extrabold text-foreground">
                          {RESOURCE_LABELS[resource] || resource}
                        </div>
                        <div className="mt-0.5 text-[10px] font-semibold text-text-muted">
                          {perms.length} actions available
                        </div>
                      </td>
                      <td className="align-middle px-4 py-3.5 text-center">
                        {!role.isSystem && canUpdate && (
                          <button
                            type="button"
                            onClick={() => handleToggleCategory(resource)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                              allSelected
                                ? 'bg-primary/15 text-primary'
                                : 'border border-border bg-background text-text-secondary hover:bg-muted hover:text-foreground'
                            }`}
                          >
                            {allSelected ? 'All Selected' : 'Select All'}
                          </button>
                        )}
                      </td>
                      <td className="align-middle px-5 py-3.5">
                        <div className="flex flex-wrap items-center gap-2">
                          {perms.map((perm) => {
                            const key = `${perm.resource}:${perm.action}`;
                            const isChecked = draftPermissions.includes(key);

                            return (
                              <button
                                key={key}
                                type="button"
                                disabled={role.isSystem || !canUpdate}
                                onClick={() => handleTogglePermission(key)}
                                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                                  isChecked
                                    ? 'border-primary/40 bg-primary/10 text-primary shadow-2xs dark:bg-primary/15'
                                    : 'border-border bg-background text-text-secondary hover:border-text-muted hover:text-foreground'
                                } ${role.isSystem || !canUpdate ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
                              >
                                {isChecked ? (
                                  <MdCheckCircle size={15} className="flex-none text-primary" />
                                ) : (
                                  <MdRadioButtonUnchecked size={15} className="flex-none text-text-muted" />
                                )}
                                <span className="capitalize">{perm.action.replace('-', ' ')}</span>
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Role Modal rendered via portal to cover entire screen including topbar */}
      {isEditModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.15s_ease-out]">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h3 className="text-base font-extrabold text-foreground">Edit Role Details</h3>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-lg p-1 text-text-secondary hover:bg-muted"
                >
                  <MdClose size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveRoleDetails} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                    Role Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-semibold text-foreground outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-primary"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="rounded-xl px-4 py-2 text-xs font-bold text-text-secondary hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingEdit || !editName.trim()}
                    className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white shadow-md hover:brightness-110"
                  >
                    {submittingEdit ? 'Saving...' : 'Save Details'}
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
