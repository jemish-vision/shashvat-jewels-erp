'use client';

import { useState, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { site } from '@/config/site';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api-client';
import { MdOutlineDiamond, MdSecurity, MdEmail, MdLock, MdVisibility, MdVisibilityOff, MdArrowForward } from 'react-icons/md';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suspendedBanner, setSuspendedBanner] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('error') === 'COMPANY_SUSPENDED') {
        setSuspendedBanner(true);
      }
    }
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await login(email, password);
      toast('Signed in successfully', 'success');
      const targetRoute = user.role === 'SUPER_ADMIN' ? '/' : '/dashboard';
      router.push(targetRoute);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'COMPANY_SUSPENDED') {
          toast('Your company account has been suspended. Please contact platform support.', 'error');
        } else if (err.code === 'ACCOUNT_DISABLED') {
          toast('Your user account has been disabled. Please contact your company administrator.', 'error');
        } else {
          toast(err.message || 'Invalid email or password', 'error');
        }
      } else {
        toast('An unexpected error occurred', 'error');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-br from-background via-card/40 to-background p-4">
      {/* Decorative ambient glows */}
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-teal-500/10 blur-[100px]" />

      <div className="relative z-10 w-full max-w-md animate-[fadeUp_0.4s_ease-out]">
        {suspendedBanner && (
          <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 p-3.5 text-xs font-semibold text-danger shadow-sm">
            Your account workspace is currently unavailable. Please contact support.
          </div>
        )}

        <div className="rounded-2xl border border-border/70 bg-card/95 p-8 shadow-[0_4px_20px_rgba(0,0,0,0.06),0_12px_48px_-12px_rgba(13,148,136,0.18)] backdrop-blur-md sm:p-10">
          {/* Brand Header */}
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-light to-primary text-white shadow-lg shadow-primary/25">
              <MdOutlineDiamond className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              {site.name}
            </h1>
            <p className="mt-1.5 text-xs font-medium text-text-secondary sm:text-sm">
              Sign in to your enterprise ERP workspace
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {/* Email field */}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-text-strong-2">
                Email
              </label>
              <div className="relative">
                <MdEmail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="w-full rounded-xl border border-input bg-background py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-text-muted shadow-sm transition-all duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-text-strong-2">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-primary transition-colors hover:text-primary-dark hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <MdLock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-input bg-background py-3 pl-11 pr-11 text-sm text-foreground placeholder:text-text-muted shadow-sm transition-all duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-foreground focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <MdVisibilityOff className="h-5 w-5" /> : <MdVisibility className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-teal-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all duration-200 hover:brightness-110 hover:shadow-xl hover:shadow-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Authenticating&hellip;
                </span>
              ) : (
                <>
                  Sign In
                  <MdArrowForward className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Security assurance badge */}
          <div className="mt-8 flex items-center justify-center gap-2 border-t border-border/60 pt-6 text-center text-xs font-medium text-text-secondary">
            <MdSecurity className="h-4 w-4 text-primary" />
            <span>Protected by Enterprise Auditing & TLS Encryption</span>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-text-muted">
          &copy; {new Date().getFullYear()} {site.name}. All rights reserved.
        </p>
      </div>
    </div>
  );
}
