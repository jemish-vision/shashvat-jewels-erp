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
    <div className="flex flex-col gap-5">

      {/* Back link */}
      <Link href="/companies" className="flex items-center gap-1.5 text-[12px] font-bold text-primary no-underline hover:underline">
        <MdChevronLeft size={16} />
        Back to Companies
      </Link>

      {/* Header card */}
      <div className="card-lg px-5 py-[18px]">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-[12px] bg-[rgba(111,211,196,0.14)] text-primary shadow-[0_6px_16px_-10px_rgba(63,163,147,0.4)]">
              {editing ? (
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-[120px] border-none bg-transparent text-center text-[18px] font-extrabold text-foreground outline-none"
                />
              ) : (
                <MdBusiness size={24} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                {editing ? (
                  <input
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="m-0 border-none bg-transparent p-0 text-[18px] font-extrabold tracking-tight text-foreground outline-none"
                    style={{ width: `${Math.max((form.name?.length || 0) * 11, 120)}px` }}
                  />
                ) : (
                  <h1 className="m-0 text-[18px] font-extrabold tracking-tight text-foreground">{company.name}</h1>
                )}
                <span className={`inline-flex items-center gap-1.5 rounded-[7px] px-[10px] py-[3px] text-[11px] font-bold ${sc.badge}`}>
                  <span className={`h-[5px] w-[5px] rounded-full ${sc.dot}`} />
                  {company.status}
                </span>
              </div>
              <p className="m-0 mt-[3px] flex items-center gap-1.5 text-[12px] font-medium text-text-secondary">
                <MdCalendarToday size={12} />
                Created {created} · {usersCount} users · {branchesCount} branches
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {editing ? (
              <>
                <button
                  onClick={() => { setEditing(false); setForm({ name: company.name, slug: company.slug, email: company.email || '', phone: company.phone || '', address: company.address || '', city: company.city || '', country: company.country, baseCurrency: company.baseCurrency, taxId: company.taxId || '', plan: company.plan || '' }); }}
                  className="inline-flex items-center gap-1.5 rounded-[9px] border border-input bg-card px-3.5 py-[7px] text-[12px] font-bold text-text-strong-2 transition-colors hover:bg-muted"
                >
                  <MdClose size={15} />
                  Cancel
                </button>
                <button
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-[9px] border-none bg-primary px-3.5 py-[7px] text-[12px] font-bold text-white shadow-[0_2px_8px_rgba(63,163,147,0.3)] transition-all hover:brightness-95 disabled:opacity-60"
                >
                  <MdSave size={15} />
                  {updateMutation.isPending ? 'Saving…' : 'Save'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1.5 rounded-[9px] border border-input bg-card px-3.5 py-[7px] text-[12px] font-bold text-text-strong-2 transition-colors hover:bg-muted"
                >
                  <MdEdit size={15} />
                  Edit
                </button>
                {!isDeleted && isSuspended ? (
                  <>
                    <button
                      onClick={() => reactivateMutation.mutate()}
                      disabled={reactivateMutation.isPending}
                      className="inline-flex items-center gap-1.5 rounded-[9px] border-none bg-success px-3.5 py-[7px] text-[12px] font-bold text-white shadow-[0_2px_8px_rgba(22,163,74,0.3)] transition-all hover:brightness-95 disabled:opacity-60"
                    >
                      <MdCheckCircle size={15} />
                      {reactivateMutation.isPending ? '…' : 'Reactivate'}
                    </button>
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
                        if (ok) deleteMutation.mutate();
                      }}
                      disabled={deleteMutation.isPending}
                      className="inline-flex items-center gap-1.5 rounded-[9px] border-none bg-danger px-3.5 py-[7px] text-[12px] font-bold text-white shadow-[0_2px_8px_rgba(220,38,38,0.3)] transition-all hover:brightness-95 disabled:opacity-60"
                    >
                      <MdDelete size={15} />
                      {deleteMutation.isPending ? '…' : 'Delete'}
                    </button>
                  </>
                ) : !isDeleted ? (
                  <>
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
                        if (ok) suspendMutation.mutate();
                      }}
                      disabled={suspendMutation.isPending}
                      className="inline-flex items-center gap-1.5 rounded-[9px] border-none bg-warning px-3.5 py-[7px] text-[12px] font-bold text-white shadow-[0_2px_8px_rgba(217,119,6,0.3)] transition-all hover:brightness-95 disabled:opacity-60"
                    >
                      <MdBlock size={15} />
                      {suspendMutation.isPending ? '…' : 'Suspend'}
                    </button>
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
                        if (ok) deleteMutation.mutate();
                      }}
                      disabled={deleteMutation.isPending}
                      className="inline-flex items-center gap-1.5 rounded-[9px] border-none bg-danger px-3.5 py-[7px] text-[12px] font-bold text-white shadow-[0_2px_8px_rgba(220,38,38,0.3)] transition-all hover:brightness-95 disabled:opacity-60"
                    >
                      <MdDelete size={15} />
                      {deleteMutation.isPending ? '…' : 'Delete'}
                    </button>
                  </>
                ) : null}
              </>
            )}
          </div>
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
