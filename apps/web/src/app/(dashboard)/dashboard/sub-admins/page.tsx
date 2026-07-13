'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import {
  MdPeople,
  MdAdd,
  MdSecurity,
  MdStore,
  MdSearch,
  MdClose,
  MdEdit,
  MdDelete,
  MdAdminPanelSettings,
} from 'react-icons/md';
import { FilterCard } from '@/components/ui/filter-card';
import { CustomSelect } from '@/components/ui/custom-select';
import { TablePagination } from '@/components/ui/table-pagination';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm';
import { apiFetch } from '@/lib/api-client';
import { usePermissions } from '@/hooks/use-permissions';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  roleName: string;
  roleId: string;
  branchName: string;
  branchId: string | null;
  isActive: boolean;
  adminType: 'BRANCH_ADMIN' | 'SUB_ADMIN';
  createdAt: string;
}

interface RoleItem {
  id: string;
  name: string;
  isSystem: boolean;
  description: string | null;
}

interface BranchItem {
  id: string;
  name: string;
  code: string;
}

export default function SubAdminsManagementPage() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { has } = usePermissions();
  const canCreate = has('user:create');
  const canUpdate = has('user:update');
  const canDelete = has('user:delete');

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // FilterCard states
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<string>('ALL');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [adminType, setAdminType] = useState<'SUB_ADMIN' | 'BRANCH_ADMIN'>('SUB_ADMIN');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{
        members: TeamMember[];
        roles: RoleItem[];
        branches: BranchItem[];
      }>('/api/tenant/sub-admins');

      setMembers(res.members || []);
      setRoles(res.roles || []);
      setBranches(res.branches || []);

      if (res.roles?.length > 0 && !selectedRoleId) {
        setSelectedRoleId(res.roles[0].id);
      }
      if (res.branches?.length > 0 && !selectedBranchId) {
        setSelectedBranchId(res.branches[0].id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load company users directory');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (scopeFilter !== 'ALL' && m.adminType !== scopeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.roleName.toLowerCase().includes(q) ||
          m.branchName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [members, scopeFilter, searchQuery]);

  // Pagination calculations
  const totalCount = filteredMembers.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startRange = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endRange = Math.min(safePage * pageSize, totalCount);
  const paginatedMembers = filteredMembers.slice((safePage - 1) * pageSize, safePage * pageSize);

  function openCreateModal() {
    setEditingMember(null);
    setName('');
    setEmail('');
    setPassword('');
    setAdminType('SUB_ADMIN');
    if (roles.length > 0) setSelectedRoleId(roles[0].id);
    if (branches.length > 0) setSelectedBranchId(branches[0].id);
    setIsModalOpen(true);
  }

  function openEditModal(member: TeamMember) {
    setEditingMember(member);
    setName(member.name);
    setEmail(member.email);
    setPassword('');
    setAdminType(member.adminType);
    setSelectedRoleId(member.roleId);
    setSelectedBranchId(member.branchId || (branches[0]?.id || ''));
    setIsModalOpen(true);
  }

  async function handleSaveMember(e: React.FormEvent) {
    e.preventDefault();
    const branchAdminRole = roles.find(
      (r) => r.name === 'Branch Administrator' || r.name.toLowerCase().includes('branch')
    );
    const effectiveRoleId =
      adminType === 'BRANCH_ADMIN' && branchAdminRole ? branchAdminRole.id : selectedRoleId;

    if (!name.trim() || !effectiveRoleId) return;
    setSubmitting(true);
    try {
      if (editingMember) {
        await apiFetch(`/api/tenant/sub-admins/${editingMember.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: name.trim(),
            roleId: effectiveRoleId,
            branchId: adminType === 'BRANCH_ADMIN' ? selectedBranchId || null : null,
          }),
        });
      } else {
        if (!email.trim() || !password) {
          toast('Email and password are required when creating an account', 'error');
          return;
        }
        await apiFetch('/api/tenant/sub-admins', {
          method: 'POST',
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password,
            roleId: effectiveRoleId,
            branchId: adminType === 'BRANCH_ADMIN' ? selectedBranchId || null : null,
          }),
        });
      }
      setIsModalOpen(false);
      toast(editingMember ? 'Company user updated successfully!' : 'Company user created successfully!', 'success');
      await loadData();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to save account', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(member: TeamMember) {
    try {
      await apiFetch(`/api/tenant/sub-admins/${member.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !member.isActive }),
      });
      toast(`Account status set to ${!member.isActive ? 'Active' : 'Suspended'}`, 'success');
      await loadData();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to update account status', 'error');
    }
  }

  async function handleDelete(member: TeamMember) {
    const ok = await confirm(`Are you sure you want to remove company user "${member.name} (${member.email})"?`, {
      title: 'Remove Company User Account',
      variant: 'danger',
      confirmText: 'Remove Company User',
      cancelText: 'Cancel',
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/tenant/sub-admins/${member.id}`, { method: 'DELETE' });
      toast('Company user removed successfully!', 'success');
      await loadData();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to remove company user', 'error');
    }
  }

  const hasActiveFilters = Boolean(searchQuery || scopeFilter !== 'ALL');

  function resetFilters() {
    setSearchQuery('');
    setScopeFilter('ALL');
    setCurrentPage(1);
  }

  if (loading && members.length === 0) {
    return (
      <div className="flex min-h-[440px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-xs font-bold text-text-secondary">Loading User Management Directory...</span>
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
            <MdAdminPanelSettings size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-foreground">
              User Management
            </h1>
            <p className="text-xs font-medium text-text-secondary">
              Provision company users, assign role profiles, and scope access to HQ or specific showrooms
            </p>
          </div>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:brightness-110"
          >
            <MdAdd size={16} />
            Add Company User
          </button>
        )}
      </div>

      {/* Common Filter Section with CustomSelect UI */}
      <FilterCard onReset={resetFilters} showReset={hasActiveFilters}>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-text-muted">Search Member</label>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5">
              <MdSearch size={16} className="text-text-muted" />
              <input
                placeholder="Search name, email, role..."
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
            <label className="text-[10px] font-bold uppercase text-text-muted">Admin Scope</label>
            <CustomSelect
              width="210px"
              options={[
                { value: 'ALL', label: 'All Company Users' },
                { value: 'SUB_ADMIN', label: 'Company HQ Users Only' },
                { value: 'BRANCH_ADMIN', label: 'Branch Administrators Only' },
              ]}
              value={scopeFilter}
              onChange={(val) => {
                setScopeFilter(val);
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
              <th className="p-4">Company User / Email</th>
              <th className="p-4">Security Role Profile</th>
              <th className="p-4">Access Scope & Branch</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-xs">
            {paginatedMembers.length > 0 ? (
              paginatedMembers.map((m) => (
                <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4">
                    <div className="font-extrabold text-foreground">{m.name}</div>
                    <div className="font-mono text-text-secondary">{m.email}</div>
                  </td>

                  <td className="p-4">
                    {m.adminType === 'BRANCH_ADMIN' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-info/30 bg-info-bg px-3 py-1 text-xs font-bold text-info">
                        <MdStore size={14} className="flex-none" />
                        <span>All Branch Permissions</span>
                      </span>
                    ) : m.roleId ? (
                      <Link
                        href={`/dashboard/roles/${m.roleId}`}
                        title="View Role Permissions & Profile"
                        className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-bold text-primary transition-all hover:bg-primary/20 hover:shadow-2xs"
                      >
                        <MdSecurity size={14} className="text-primary flex-none" />
                        <span>{m.roleName}</span>
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-foreground">
                        <MdSecurity size={13} className="text-primary" />
                        {m.roleName || 'No Custom Role'}
                      </span>
                    )}
                  </td>

                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          m.adminType === 'BRANCH_ADMIN'
                            ? 'bg-info-bg text-info'
                            : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {m.adminType === 'BRANCH_ADMIN' ? (
                          <>
                            <MdStore size={12} /> Branch Admin
                          </>
                        ) : (
                          <>
                            <MdSecurity size={12} /> Company User
                          </>
                        )}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] font-medium text-text-secondary">
                      {m.branchName}
                    </div>
                  </td>

                  <td className="p-4">
                    <button
                      type="button"
                      disabled={!canUpdate}
                      onClick={() => handleToggleStatus(m)}
                      className="group inline-flex items-center rounded-full focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      title={
                        canUpdate
                          ? `Status: ${m.isActive ? 'Active' : 'Suspended'} — Click to toggle`
                          : 'No permission to update status'
                      }
                      aria-label={m.isActive ? 'Active status toggle' : 'Suspended status toggle'}
                    >
                      <span
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
                          m.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
                            m.isActive ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </span>
                    </button>
                  </td>

                  <td className="p-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      {canUpdate && (
                        <button
                          type="button"
                          onClick={() => openEditModal(m)}
                          title="Edit Company User"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-text-secondary transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
                        >
                          <MdEdit size={14} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDelete(m)}
                          title="Remove Company User"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-text-secondary transition-colors hover:border-danger hover:bg-danger/10 hover:text-danger"
                        >
                          <MdDelete size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-12 text-center text-text-secondary">
                  No company users found matching your criteria.
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

      {/* Create / Edit Modal */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-base font-extrabold text-foreground">
                {editingMember ? 'Edit Company User Account' : 'Provision New Company User'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-text-secondary hover:bg-muted"
              >
                <MdClose size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Administrator Scope *
                </label>
                <div className="mt-1.5 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAdminType('SUB_ADMIN')}
                    className={`flex flex-col items-center rounded-xl border p-3 text-center transition-all ${
                      adminType === 'SUB_ADMIN'
                        ? 'border-primary bg-primary/10 text-foreground font-bold'
                        : 'border-border/80 bg-background text-text-secondary'
                    }`}
                  >
                    <MdSecurity size={20} className="text-primary" />
                    <span className="mt-1 text-xs">Company User</span>
                    <span className="text-[10px] text-text-muted">HQ & Entire Workspace</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdminType('BRANCH_ADMIN')}
                    className={`flex flex-col items-center rounded-xl border p-3 text-center transition-all ${
                      adminType === 'BRANCH_ADMIN'
                        ? 'border-primary bg-primary/10 text-foreground font-bold'
                        : 'border-border/80 bg-background text-text-secondary'
                    }`}
                  >
                    <MdStore size={20} className="text-primary" />
                    <span className="mt-1 text-xs">Branch Administrator</span>
                    <span className="text-[10px] text-text-muted">Scoped to showroom location</span>
                  </button>
                </div>
              </div>

              {adminType === 'BRANCH_ADMIN' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                    Showroom Location *
                  </label>
                  <div className="mt-1.5">
                    <CustomSelect
                      value={selectedBranchId}
                      onChange={(val) => setSelectedBranchId(val)}
                      options={branches.map((b) => ({
                        value: b.id,
                        label: `${b.name} (${b.code})`,
                      }))}
                      width="100%"
                    />
                  </div>
                </div>
              )}

              {adminType === 'BRANCH_ADMIN' ? (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5">
                  <div className="flex items-center gap-2">
                    <MdSecurity size={18} className="text-primary flex-none" />
                    <span className="text-xs font-bold text-foreground">
                      Full Branch Operational Access
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">
                    Branch Administrators automatically receive complete operational permissions scoped to their assigned showroom location. No custom role required.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                    Assigned Security Role *
                  </label>
                  <div className="mt-1.5">
                    <CustomSelect
                      value={selectedRoleId}
                      onChange={(val) => setSelectedRoleId(val)}
                      options={roles.map((r) => ({
                        value: r.id,
                        label: `${r.name} ${r.isSystem ? '(System Baseline)' : '(Custom Role Profile)'}`,
                      }))}
                      width="100%"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikram Singhania"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-semibold text-foreground outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    disabled={Boolean(editingMember)}
                    placeholder="vikram@sashvatjewels.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-semibold text-foreground outline-none focus:border-primary disabled:opacity-60"
                  />
                </div>
              </div>

              {!editingMember && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                    Initial Login Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Set secure account password..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-semibold text-foreground outline-none focus:border-primary"
                  />
                </div>
              )}

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
                  disabled={submitting || !name.trim()}
                  className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white shadow-md hover:brightness-110"
                >
                  {submitting ? 'Saving...' : editingMember ? 'Update Company User' : 'Create Company User'}
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
