'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  MdSecurity,
  MdAdd,
  MdLock,
  MdDelete,
  MdSearch,
  MdClose,
  MdEdit,
  MdVisibility,
  MdPeople,
} from 'react-icons/md';
import { FilterCard } from '@/components/ui/filter-card';
import { CustomSelect } from '@/components/ui/custom-select';
import { TablePagination } from '@/components/ui/table-pagination';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm';
import { apiFetch } from '@/lib/api-client';
import { usePermissions } from '@/hooks/use-permissions';

interface RoleItem {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  userCount: number;
  permissions: string[];
}

export default function RolesManagementPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { has } = usePermissions();
  const canCreate = has('role:create');
  const canUpdate = has('role:update');
  const canDelete = has('role:delete');

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Edit role modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function loadRoles() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ roles: RoleItem[] }>('/api/tenant/roles');
      setRoles(res.roles || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRoles();
  }, []);

  const filteredRoles = useMemo(() => {
    return roles.filter((r) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [roles, searchQuery]);

  // Pagination calculations
  const totalCount = filteredRoles.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startRange = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endRange = Math.min(safePage * pageSize, totalCount);
  const paginatedRoles = filteredRoles.slice((safePage - 1) * pageSize, safePage * pageSize);

  function openEditModal(role: RoleItem) {
    if (role.isSystem) return;
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDesc(role.description || '');
    setIsEditModalOpen(true);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingRole || !roleName.trim()) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/tenant/roles/${editingRole.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: roleName.trim(),
          description: roleDesc.trim() || undefined,
          permissions: editingRole.permissions,
        }),
      });
      setIsEditModalOpen(false);
      toast('Role updated successfully!', 'success');
      await loadRoles();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to update role', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteRole(role: RoleItem) {
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
      await loadRoles();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to delete role', 'error');
    }
  }

  const hasActiveFilters = Boolean(searchQuery || statusFilter !== 'ALL');

  function resetFilters() {
    setSearchQuery('');
    setStatusFilter('ALL');
    setCurrentPage(1);
  }

  if (loading && roles.length === 0) {
    return (
      <div className="flex min-h-[440px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-xs font-bold text-text-secondary">Loading Roles List...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MdSecurity size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-foreground">
              Roles & Permissions Management
            </h1>
            <p className="text-xs font-medium text-text-secondary">
              Click on any role to open its full permission matrix or create custom security roles
            </p>
          </div>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={() => router.push('/dashboard/roles/create')}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:brightness-110"
          >
            <MdAdd size={16} />
            Create New Role
          </button>
        )}
      </div>

      {/* Common FilterCard Section with CustomSelect UI */}
      <FilterCard onReset={resetFilters} showReset={hasActiveFilters}>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-text-muted">Search Role</label>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5">
              <MdSearch size={16} className="text-text-muted" />
              <input
                placeholder="Search by name or description..."
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
              width="150px"
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'SUSPENDED', label: 'Suspended' },
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

      {/* Common Data Table listing Roles */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-[11px] font-extrabold uppercase tracking-wider text-text-secondary">
              <th className="p-4">Role Name & Description</th>
              <th className="p-4">Users Assigned</th>
              <th className="p-4">Permissions Count</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-xs">
            {paginatedRoles.length > 0 ? (
              paginatedRoles.map((role) => (
                <tr
                  key={role.id}
                  onClick={() => router.push(`/dashboard/roles/${role.id}`)}
                  className="group cursor-pointer transition-colors hover:bg-muted/40"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm ${
                          role.isSystem
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            : 'bg-primary/15 text-primary'
                        }`}
                      >
                        {role.isSystem ? <MdLock size={16} /> : <MdSecurity size={16} />}
                      </div>
                      <div>
                        <div className="font-extrabold text-foreground group-hover:text-primary transition-colors">
                          {role.name}
                        </div>
                        <div className="text-[11px] text-text-secondary line-clamp-1">
                          {role.description || 'Custom access profile'}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                      <MdPeople size={15} className="text-primary" />
                      {role.userCount} User(s)
                    </span>
                  </td>

                  <td className="p-4 font-mono font-bold text-text-secondary">
                    {role.permissions?.length || 0} active perms
                  </td>

                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Active
                    </span>
                  </td>

                  <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => router.push(`/dashboard/roles/${role.id}`)}
                        title="View & Configure Permission Matrix"
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-text-secondary transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
                      >
                        <MdVisibility size={14} />
                      </button>

                      {!role.isSystem && (
                        <>
                          {canUpdate && (
                            <button
                              type="button"
                              onClick={() => openEditModal(role)}
                              title="Edit Role Details"
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-text-secondary transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
                            >
                              <MdEdit size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteRole(role)}
                              title="Delete Role"
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-text-secondary transition-colors hover:border-danger hover:bg-danger/10 hover:text-danger"
                            >
                              <MdDelete size={14} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-12 text-center text-text-secondary">
                  No roles found matching your filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Data Table Pagination */}
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

      {/* Edit Role Modal */}
      {isEditModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-base font-extrabold text-foreground">Edit Role Name & Description</h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-lg p-1 text-text-secondary hover:bg-muted"
              >
                <MdClose size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Role Name *
                </label>
                <input
                  type="text"
                  required
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-semibold text-foreground outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={roleDesc}
                  onChange={(e) => setRoleDesc(e.target.value)}
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
                  disabled={submitting || !roleName.trim()}
                  className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white shadow-md hover:brightness-110"
                >
                  {submitting ? 'Saving...' : 'Update Role'}
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
