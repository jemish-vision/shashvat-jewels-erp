'use client';

import { useState, type FormEvent, use, Suspense } from 'react';
import Link from 'next/link';
import { site } from '@/config/site';
import { apiFetch, ApiError } from '@/lib/api-client';

function ForgotPasswordForm({ prefilledEmail }: { prefilledEmail: string }) {
  const [email, setEmail] = useState(prefilledEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await apiFetch<{ message: string; resetUrl?: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      setSent(true);
      if (result.resetUrl) {
        setResetUrl(result.resetUrl);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-success-bg text-success">
          <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13" />
            <path d="M22 2L15 22l-4-9-9-4z" />
          </svg>
        </div>
        <h1 className="text-xl font-extrabold tracking-tight text-foreground">Check your email</h1>
        <p className="mt-2 text-sm text-text-secondary leading-relaxed">
          If an account exists for <strong className="text-foreground">{email}</strong>, we&apos;ve sent a password reset link.
        </p>

        {resetUrl && (
          <div className="mt-4 w-full rounded-lg border border-primary/20 bg-primary/5 p-3 text-left">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">Dev Mode — Reset Link</p>
            <a
              href={resetUrl}
              className="break-all text-xs text-primary underline transition-colors hover:text-primary-dark"
            >
              {resetUrl}
            </a>
          </div>
        )}

        <Link
          href="/login"
          className="mt-6 text-sm font-medium text-primary transition-colors hover:text-primary-dark hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-2 flex flex-col items-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-light to-primary text-xl font-bold text-white shadow-lg shadow-primary/25">
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>
        <h1 className="text-xl font-extrabold tracking-tight text-foreground">Forgot password?</h1>
        <p className="mt-1.5 text-center text-sm text-text-secondary leading-relaxed">
          No worries. Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-strong-2">
            Email address
          </label>
          <div className="relative">
            <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M22 4l-10 7L2 4" />
            </svg>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@company.com"
              className="w-full rounded-input border border-input bg-card py-2.5 pl-10 pr-3.5 text-sm text-foreground placeholder:text-text-muted transition-all duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-danger/20 bg-danger-bg px-4 py-2.5 text-sm text-danger">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-btn bg-gradient-to-r from-primary to-primary-dark px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Sending link&hellip;
            </span>
          ) : (
            'Send reset link'
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="text-sm font-medium text-primary transition-colors hover:text-primary-dark hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </>
  );
}

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const params = use(searchParams);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#f0fdfa] via-background to-[#f0f4ff]">
      <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary-light/10 blur-3xl" />

      <div className="w-full max-w-sm px-4">
        <Suspense fallback={
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
          </div>
        }>
          <div className="animate-[fadeUp_0.5s_ease-out]">
            <div className="rounded-card border border-border/60 bg-card/95 p-8 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_10px_24px_-14px_rgba(15,23,42,0.10),0_22px_48px_-30px_rgba(63,163,147,0.22)] backdrop-blur-sm transition-shadow duration-300 hover:shadow-[0_4px_10px_rgba(15,23,42,0.06),0_22px_42px_-16px_rgba(63,163,147,0.28)]">
              <ForgotPasswordForm prefilledEmail={params.email || ''} />
            </div>

            <p className="mt-8 text-center text-xs text-text-muted">
              &copy; {new Date().getFullYear()} {site.name}. All rights reserved.
            </p>
          </div>
        </Suspense>
      </div>
    </div>
  );
}
