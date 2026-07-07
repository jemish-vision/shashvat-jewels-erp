'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCompany, updateCompany, suspendCompany, reactivateCompany, deleteCompany } from '@/features/super-admin/queries';
import type { Company } from '@/features/super-admin/types';
import { useToast } from '@/components/ui/toast';

const statusColors: Record<string, string> = {
  TRIAL: 'var(--info)', ACTIVE: 'var(--success)', SUSPENDED: 'var(--warning)', CANCELLED: 'var(--neutral)',
};

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', city: '', plan: '' });

  const { data: company, isLoading, error } = useQuery({
    queryKey: ['super-admin', 'company', id],
    queryFn: () => getCompany(id).then((c) => { setForm({ name: c.name, email: c.email || '', phone: c.phone || '', address: c.address || '', city: c.city || '', plan: c.plan || '' }); return c; }),
  });

  const updateMutation = useMutation({
    mutationFn: () => updateCompany(id, form),
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

  if (isLoading) return <div style={{ color: 'var(--text-secondary)' }}>Loading…</div>;
  if (error || !company) return <div style={{ color: 'var(--danger)' }}>Company not found</div>;

  const isSuspended = company.status === 'SUSPENDED';
  const isDeleted = !!company.deletedAt;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--foreground)' }}>{company.name}</h1>
        <span style={{ padding: '4px 10px', borderRadius: 'var(--radius-btn)', fontSize: 13, fontWeight: 600, background: `${statusColors[company.status] || 'var(--neutral)'}20`, color: statusColors[company.status] || 'var(--neutral)' }}>{company.status}</span>
      </div>

      <div style={{ background: 'var(--card)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)', padding: 24 }}>
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Name"><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={inputStyle} /></Field>
              <Field label="Email"><input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} style={inputStyle} /></Field>
              <Field label="Phone"><input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} style={inputStyle} /></Field>
              <Field label="Plan"><input value={form.plan} onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))} style={inputStyle} /></Field>
              <Field label="City"><input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} style={inputStyle} /></Field>
            </div>
            <Field label="Address"><textarea value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} style={{ ...inputStyle, minHeight: 60 }} /></Field>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditing(false)} style={btnSecondary}>Cancel</button>
              <button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} style={{ ...btnPrimary, opacity: updateMutation.isPending ? 0.7 : 1 }}>
                {updateMutation.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Row label="Slug" value={company.slug} />
            <Row label="Email" value={company.email || '-'} />
            <Row label="Phone" value={company.phone || '-'} />
            <Row label="Address" value={company.address || '-'} />
            <Row label="City" value={company.city || '-'} />
            <Row label="Country" value={company.country} />
            <Row label="Base currency" value={company.baseCurrency} />
            <Row label="Tax ID" value={company.taxId || '-'} />
            <Row label="Plan" value={company.plan || '-'} />
            <Row label="Created" value={new Date(company.createdAt).toLocaleDateString('en-IN')} />
            <Row label="Users" value={String((company as any)._count?.users ?? '-')} />
            <Row label="Branches" value={String((company as any)._count?.branches ?? '-')} />
            <button onClick={() => setEditing(true)} style={{ ...btnPrimary, alignSelf: 'flex-start', marginTop: 8 }}>Edit</button>
          </div>
        )}
      </div>

      {!isDeleted && (
        <div style={{ background: 'var(--danger-bg)', borderRadius: 'var(--radius-card)', border: '1px solid var(--danger)', padding: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--danger)', marginBottom: 12 }}>Danger Zone</h2>
          <div style={{ display: 'flex', gap: 12 }}>
            {isSuspended ? (
              <button onClick={() => reactivateMutation.mutate()} disabled={reactivateMutation.isPending} style={{ ...btnPrimary, background: 'var(--success)' }}>
                {reactivateMutation.isPending ? '…' : 'Reactivate'}
              </button>
            ) : (
              <button onClick={() => suspendMutation.mutate()} disabled={suspendMutation.isPending} style={{ ...btnPrimary, background: 'var(--warning)', color: '#000' }}>
                {suspendMutation.isPending ? '…' : 'Suspend'}
              </button>
            )}
            {isSuspended && (
              <button onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} style={{ ...btnPrimary, background: 'var(--danger)' }}>
                {deleteMutation.isPending ? '…' : 'Delete'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (<div style={{ display: 'flex', fontSize: 14 }}><span style={{ width: 140, color: 'var(--text-secondary)', flexShrink: 0 }}>{label}</span><span style={{ color: 'var(--text-strong-2)' }}>{value}</span></div>);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div><label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: 'var(--text-strong-2)' }}>{label}</label>{children}</div>);
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', border: '1px solid var(--input)', borderRadius: 'var(--radius-input)', fontSize: 14, boxSizing: 'border-box' };
const btnPrimary: React.CSSProperties = { padding: '8px 16px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-btn)', fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const btnSecondary: React.CSSProperties = { padding: '8px 16px', background: 'transparent', border: '1px solid var(--input)', borderRadius: 'var(--radius-btn)', fontSize: 14, cursor: 'pointer' };
