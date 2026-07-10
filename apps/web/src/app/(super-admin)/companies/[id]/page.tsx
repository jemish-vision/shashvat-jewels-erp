'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCompany, updateCompany, suspendCompany, reactivateCompany, deleteCompany } from '@/features/super-admin/queries';
import type { Company } from '@/features/super-admin/types';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm';
import {
  MdBusiness,
  MdChevronLeft,
  MdEdit,
  MdBlock,
  MdCheckCircle,
  MdDelete,
  MdSave,
  MdClose,
  MdEmail,
  MdPhone,
  MdLocationOn,
  MdPublic,
  MdAttachMoney,
  MdBadge,
  MdPeople,
  MdAccountTree,
  MdCalendarToday,
  MdVisibility,
  MdVisibilityOff,
} from 'react-icons/md';

const statusConfig: Record<string, { label: string; badge: string; dot: string }> = {
  TRIAL: { label: 'Trial', badge: 'bg-info-bg text-info', dot: 'bg-info' },
  ACTIVE: { label: 'Active', badge: 'bg-success-bg text-success', dot: 'bg-success' },
  SUSPENDED: { label: 'Suspended', badge: 'bg-warning-bg text-warning', dot: 'bg-warning' },
  CANCELLED: { label: 'Cancelled', badge: 'bg-neutral-bg text-neutral', dot: 'bg-neutral' },
};

interface FieldDef {
  key: string;
  label: string;
  icon?: React.ReactNode;
  render?: (v: string) => string;
}

const generalFields: FieldDef[] = [
  { key: 'slug', label: 'Slug', icon: <MdBadge size={12} /> },
  { key: 'phone', label: 'Phone', icon: <MdPhone size={12} />, render: (v) => v || '—' },
  { key: 'address', label: 'Address', icon: <MdLocationOn size={12} />, render: (v) => v || '—' },
  { key: 'city', label: 'City', icon: <MdLocationOn size={12} />, render: (v) => v || '—' },
  { key: 'country', label: 'Country', icon: <MdPublic size={12} /> },
];

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);


  const { data: company, isLoading, error } = useQuery({
    queryKey: ['super-admin', 'company', id],
    queryFn: () => getCompany(id).then((c) => {
      setForm({
        name: c.name, slug: c.slug, email: c.email || '',
        phone: c.phone || '', address: c.address || '',
        city: c.city || '', country: c.country,
        baseCurrency: c.baseCurrency, taxId: c.taxId || '',
        plan: c.plan || '',
      });
      return c;
    }),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      const { slug, email, ...updatePayload } = form;
      return updateCompany(id, updatePayload);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['super-admin', 'company', id], updated);
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'companies'] });
      setEditing(false);
      toast('Company updated', 'success');
    },
    onError: (err: Error) => toast(err.message, 'error'),
  });

  const suspendMutation = useMutation({
    mutationFn: () => suspendCompany(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(['super-admin', 'company', id], updated);
      toast('Company suspended', 'info');
    },
    onError: (err: Error) => toast(err.message, 'error'),
  });

  const reactivateMutation = useMutation({
    mutationFn: () => reactivateCompany(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(['super-admin', 'company', id], updated);
      toast('Company reactivated', 'success');
    },
    onError: (err: Error) => toast(err.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCompany(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'companies'] });
      toast('Company deleted', 'info');
      router.push('/companies');
    },
    onError: (err: Error) => toast(err.message, 'error'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-[13px] font-medium text-text-secondary">Loading company&hellip;</div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="flex flex-col gap-5">
        <Link href="/companies" className="flex items-center gap-1.5 text-[12px] font-bold text-primary no-underline hover:underline">
          <MdChevronLeft size={16} />
          Back to Companies
        </Link>
        <div className="rounded-[14px] border border-border bg-danger-bg p-4 text-[13px] font-medium text-danger">
          Company not found.
        </div>
      </div>
    );
  }

  const isSuspended = company.status === 'SUSPENDED';
  const isDeleted = !!company.deletedAt;
  const sc = statusConfig[company.status] || statusConfig.CANCELLED;
  const created = new Date(company.createdAt).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
  const usersCount = (company as any)._count?.users ?? '—';
  const branchesCount = (company as any)._count?.branches ?? '—';

  function getValue(key: string): string {
    const c = company as any;
    return c[key] !== null && c[key] !== undefined ? String(c[key]) : '';
  }

  function renderFields(fields: FieldDef[], cols: number) {
    return (
      <div className={`grid grid-cols-${cols} gap-x-6 gap-y-3.5`}>
        {fields.map((f) => (
          <div key={f.key}>
            <p className="m-0 mb-[2px] flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.06em] text-text-muted">
              {f.icon}
              {f.label}
            </p>
            {editing ? (
              <input
                value={form[f.key] || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                className="field-compact w-full text-[12.5px]"
              />
            ) : (
              <p className="m-0 text-[12.5px] font-semibold text-foreground">
                {f.render ? f.render(getValue(f.key)) : getValue(f.key)}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <div>
        <Link
          href="/companies"
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-primary transition-opacity hover:opacity-80"
        >
          <MdChevronLeft size={16} />
          Back to Companies
        </Link>
      </div>

      {/* Header section matching Company Admin Roles exactly */}
      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-primary/15 text-xl text-primary">
            <MdBusiness size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              {editing ? (
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="m-0 border-b border-primary bg-transparent p-0 text-xl font-black tracking-tight text-foreground outline-none"
                  style={{ width: `${Math.max((form.name?.length || 0) * 11, 140)}px` }}
                />
              ) : (
                <h1 className="text-xl font-black text-foreground">{company.name}</h1>
              )}
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${sc.badge}`}>
                {company.status}
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Created {created} • {usersCount} users • {branchesCount} branches
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {editing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setForm({
                    name: company.name,
                    slug: company.slug,
                    email: company.email || '',
                    phone: company.phone || '',
                    address: company.address || '',
                    city: company.city || '',
                    country: company.country,
                    baseCurrency: company.baseCurrency,
                    taxId: company.taxId || '',
                    plan: company.plan || '',
                  });
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:bg-muted"
              >
                <MdClose size={16} />
                Cancel
              </button>
              <button
                type="button"
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:brightness-95 disabled:opacity-50"
              >
                <MdSave size={16} />
                {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:bg-muted"
              >
                <MdEdit size={16} />
                Edit Company
              </button>
              {!isDeleted && isSuspended ? (
                <>
                  <button
                    type="button"
                    onClick={() => reactivateMutation.mutate()}
                    disabled={reactivateMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-card px-3.5 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-500/10 disabled:opacity-50 dark:text-emerald-400"
                  >
                    <MdCheckCircle size={16} />
                    {reactivateMutation.isPending ? 'Reactivating…' : 'Reactivate'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await confirm(
                        'Permanently delete this company? All associated data will be marked as deleted.',
                        {
                          title: 'Delete Company',
                          variant: 'danger',
                          confirmText: 'Delete Company',
                        }
                      );
                      if (ok) deleteMutation.mutate();
                    }}
                    disabled={deleteMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2 text-xs font-bold text-danger hover:bg-danger/20 disabled:opacity-50"
                  >
                    <MdDelete size={16} />
                    {deleteMutation.isPending ? 'Deleting…' : 'Delete Company'}
                  </button>
                </>
              ) : !isDeleted ? (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await confirm(
                        'Suspend this company? Users belonging to this organization will lose access immediately.',
                        {
                          title: 'Suspend Company',
                          variant: 'warning',
                          confirmText: 'Suspend Company',
                        }
                      );
                      if (ok) suspendMutation.mutate();
                    }}
                    disabled={suspendMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-card px-3.5 py-2 text-xs font-bold text-amber-600 hover:bg-amber-500/10 disabled:opacity-50 dark:text-amber-400"
                  >
                    <MdBlock size={16} />
                    {suspendMutation.isPending ? 'Suspending…' : 'Suspend'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await confirm(
                        'Permanently delete this company? All associated data will be marked as deleted.',
                        {
                          title: 'Delete Company',
                          variant: 'danger',
                          confirmText: 'Delete Company',
                        }
                      );
                      if (ok) deleteMutation.mutate();
                    }}
                    disabled={deleteMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2 text-xs font-bold text-danger hover:bg-danger/20 disabled:opacity-50"
                  >
                    <MdDelete size={16} />
                    {deleteMutation.isPending ? 'Deleting…' : 'Delete Company'}
                  </button>
                </>
              ) : null}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5">

        {/* General Information */}
        <div className="card-lg px-5 py-[18px]">
          <h2 className="m-0 mb-4 text-[14px] font-bold text-foreground flex items-center gap-2">
            <MdBusiness size={16} className="text-primary" />
            General Information
          </h2>
          {renderFields(generalFields, 2)}
        </div>

        {/* Administrator Access & Overview */}
        <div className="card-lg px-5 py-[18px]">
          <h2 className="m-0 mb-4 text-[14px] font-bold text-foreground flex items-center gap-2">
            <MdPeople size={16} className="text-primary" />
            Administrator Access
          </h2>
          <div className="flex flex-col gap-3.5">
            <div>
              <p className="m-0 mb-[2px] flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.06em] text-text-muted">
                <MdEmail size={12} />
                Admin Email
              </p>
              <p className="m-0 text-[12.5px] font-semibold text-foreground">{company.email || '—'}</p>
            </div>
            {editing && (
              <div>
                <p className="m-0 mb-[2px] flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.06em] text-text-muted">
                  Update Admin Password
                </p>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.adminPassword || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, adminPassword: e.target.value }))}
                    className="field-compact w-full pr-9 text-[12.5px]"
                    placeholder="Enter new password to update or reset"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center border-none bg-transparent p-1 text-text-muted transition-colors hover:text-foreground"
                  >
                    {showPassword ? <MdVisibilityOff size={16} /> : <MdVisibility size={16} />}
                  </button>
                </div>
              </div>
            )}
            <div>
              <p className="m-0 mb-[2px] flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.06em] text-text-muted">
                <MdPeople size={12} />
                Users
              </p>
              <p className="m-0 text-[12.5px] font-semibold text-foreground">{usersCount}</p>
            </div>
            <div>
              <p className="m-0 mb-[2px] flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.06em] text-text-muted">
                <MdAccountTree size={12} />
                Branches
              </p>
              <p className="m-0 text-[12.5px] font-semibold text-foreground">{branchesCount}</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
