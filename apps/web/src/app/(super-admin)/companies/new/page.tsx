'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCompany } from '@/features/super-admin/queries';
import { useToast } from '@/components/ui/toast';

export default function NewCompanyPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', slug: '', email: '', phone: '', address: '', city: '', country: 'India', baseCurrency: 'INR', taxId: '', plan: '' });

  function autoSlug(name: string) {
    setForm((f) => ({ ...f, name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }));
  }

  const mutation = useMutation({
    mutationFn: () => createCompany(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'companies'] });
      toast('Company created successfully', 'success');
      router.push('/companies');
    },
    onError: (err: Error) => toast(err.message, 'error'),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--foreground)' }}>New Company</h1>

      <form onSubmit={handleSubmit} style={{ background: 'var(--card)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Company name" required>
            <input value={form.name} onChange={(e) => autoSlug(e.target.value)} style={inputStyle} required />
          </Field>
          <Field label="Slug" required>
            <input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} style={inputStyle} required pattern="^[a-z0-9-]+$" />
          </Field>
          <Field label="Email"><input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} style={inputStyle} /></Field>
          <Field label="Phone"><input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} style={inputStyle} /></Field>
          <Field label="Country"><input value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} style={inputStyle} /></Field>
          <Field label="Base currency"><input value={form.baseCurrency} onChange={(e) => setForm((f) => ({ ...f, baseCurrency: e.target.value }))} style={inputStyle} /></Field>
          <Field label="Tax ID"><input value={form.taxId} onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))} style={inputStyle} /></Field>
          <Field label="Plan"><input value={form.plan} onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))} style={inputStyle} /></Field>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" onClick={() => router.back()} style={btnSecondaryStyle}>Cancel</button>
          <button type="submit" disabled={mutation.isPending} style={{ ...btnPrimaryStyle, opacity: mutation.isPending ? 0.7 : 1 }}>
            {mutation.isPending ? 'Creating…' : 'Create company'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: 'var(--text-strong-2)' }}>{label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', border: '1px solid var(--input)', borderRadius: 'var(--radius-input)', fontSize: 14, boxSizing: 'border-box' };
const btnPrimaryStyle: React.CSSProperties = { padding: '8px 16px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-btn)', fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const btnSecondaryStyle: React.CSSProperties = { padding: '8px 16px', background: 'transparent', border: '1px solid var(--input)', borderRadius: 'var(--radius-btn)', fontSize: 14, cursor: 'pointer' };
