'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCompany } from '@/features/super-admin/queries';
import { useToast } from '@/components/ui/toast';
import { MdChevronLeft, MdSave, MdClose, MdBusiness, MdVisibility, MdVisibilityOff } from 'react-icons/md';

interface FieldConfig {
  key: string;
  label: string;
  required?: boolean;
  type?: string;
  pattern?: string;
  placeholder?: string;
}

const fields: FieldConfig[] = [
  { key: 'name', label: 'Company Name', required: true, placeholder: 'Acme Corp' },
  { key: 'slug', label: 'Slug', required: true, pattern: '^[a-z0-9-]+$', placeholder: 'acme-corp' },
  { key: 'email', label: 'Admin Email', type: 'email', placeholder: 'admin@acme.com' },
  { key: 'adminPassword', label: 'Admin Password', type: 'password', placeholder: 'Set initial login password' },
  { key: 'phone', label: 'Phone', placeholder: '+91 98765 43210' },
  { key: 'country', label: 'Country', placeholder: 'India' },
];

export default function NewCompanyPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<Record<string, string>>({ name: '', slug: '', email: '', adminPassword: '', phone: '', address: '', city: '', country: 'India' });
  const [showPassword, setShowPassword] = useState(false);

  function autoSlug(name: string) {
    setForm((f) => ({ ...f, name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }));
  }

  const mutation = useMutation({
    mutationFn: () => createCompany(form as any),
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
    <div className="flex flex-col gap-5" style={{ maxWidth: 720 }}>

      <Link href="/companies" className="flex items-center gap-1.5 text-[12px] font-bold text-primary no-underline hover:underline">
        <MdChevronLeft size={16} />
        Back to Companies
      </Link>

      <div className="card-lg px-5 py-[18px]">
        <div className="flex items-center gap-4 mb-5">
          <div className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-[12px] bg-[rgba(111,211,196,0.14)] text-primary shadow-[0_6px_16px_-10px_rgba(63,163,147,0.4)]">
            <MdBusiness size={24} />
          </div>
          <div>
            <h1 className="m-0 text-[18px] font-extrabold tracking-tight text-foreground">New Company</h1>
            <p className="m-0 mt-[3px] text-[12px] font-medium text-text-secondary">Set up a new organization in the system</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-x-5 gap-y-4">
            {fields.map((f) => {
              const isPassword = f.key === 'adminPassword';
              return (
                <div key={f.key}>
                  <label className="m-0 mb-[5px] block text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted">
                    {f.label}
                    {f.required && <span className="ml-1 text-danger">*</span>}
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={isPassword ? (showPassword ? 'text' : 'password') : (f.type || 'text')}
                      value={form[f.key] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (f.key === 'name') { autoSlug(val); } else { setForm((prev) => ({ ...prev, [f.key]: val })); }
                      }}
                      placeholder={f.placeholder}
                      required={f.required}
                      pattern={f.pattern}
                      className={`field-compact w-full ${isPassword ? 'pr-9' : ''}`}
                    />
                    {isPassword && (
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center border-none bg-transparent p-1 text-text-muted transition-colors hover:text-foreground"
                      >
                        {showPassword ? <MdVisibilityOff size={16} /> : <MdVisibility size={16} />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-1.5 rounded-[9px] border border-input bg-card px-4 py-[8px] text-[12px] font-bold text-text-strong-2 transition-colors hover:bg-muted"
            >
              <MdClose size={15} />
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-[9px] border-none bg-primary px-4 py-[8px] text-[12px] font-bold text-white shadow-[0_2px_8px_rgba(63,163,147,0.3)] transition-all hover:brightness-95 disabled:opacity-60"
            >
              <MdSave size={15} />
              {mutation.isPending ? 'Creating…' : 'Create Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
