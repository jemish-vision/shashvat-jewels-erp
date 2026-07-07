'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { site } from '@/config/site';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api-client';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast('Signed in successfully', 'success');
      router.push('/');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        toast(err.message || 'Invalid email or password', 'error');
      } else {
        toast('An unexpected error occurred', 'error');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm px-4">
        <div className="rounded-card border border-border bg-card p-8 shadow-sm">
          <div className="mb-2 flex flex-col items-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-lg font-bold text-white shadow-sm">
              SJ
            </div>
            <h1 className="text-xl font-bold text-foreground">{site.name}</h1>
            <p className="mt-1 text-sm text-text-secondary">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text-strong-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="admin@shashvat.com"
                className="w-full rounded-input border border-input bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-light"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text-strong-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-input border border-input bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-light"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-btn bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Signing in&hellip;
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-text-muted">
          &copy; {new Date().getFullYear()} {site.name}. All rights reserved.
        </p>
      </div>
    </div>
  );
}
