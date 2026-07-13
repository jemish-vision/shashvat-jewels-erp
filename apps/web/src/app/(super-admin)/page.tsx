'use client';

import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '@/features/super-admin/queries';
import Link from 'next/link';
import {
  MdBusiness,
  MdCheckCircle,
  MdHourglassEmpty,
  MdBlock,
  MdCancel,
  MdArrowForward,
  MdHistory,
  MdPerson,
  MdSecurity,
} from 'react-icons/md';

const statusMeta: Record<
  string,
  { label: string; icon: React.ReactNode; badgeClass: string; dotClass: string; barColor: string }
> = {
  ACTIVE: {
    label: 'Active',
    icon: <MdCheckCircle className="h-4 w-4" />,
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
    dotClass: 'bg-emerald-500',
    barColor: 'bg-emerald-500',
  },
  TRIAL: {
    label: 'Trial',
    icon: <MdHourglassEmpty className="h-4 w-4" />,
    badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20',
    dotClass: 'bg-blue-500',
    barColor: 'bg-blue-500',
  },
  SUSPENDED: {
    label: 'Suspended',
    icon: <MdBlock className="h-4 w-4" />,
    badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20',
    dotClass: 'bg-amber-500',
    barColor: 'bg-amber-500',
  },
  CANCELLED: {
    label: 'Cancelled',
    icon: <MdCancel className="h-4 w-4" />,
    badgeClass: 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border border-neutral-500/20',
    dotClass: 'bg-neutral-400',
    barColor: 'bg-neutral-400',
  },
};

export default function SuperAdminDashboard() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['super-admin', 'dashboard'],
    queryFn: getDashboardStats,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        <div className="text-sm font-semibold text-text-secondary">Loading Platform Intelligence&hellip;</div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex min-h-[420px] items-center justify-center p-6">
        <div className="flex max-w-md flex-col items-center rounded-2xl border border-danger/20 bg-card p-8 text-center shadow-lg">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-danger/10 text-danger">
            <MdCancel className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-extrabold text-foreground">Failed to Load Dashboard Data</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
            Could not retrieve administration metrics from the server. Please verify your connection or try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:brightness-110"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const activeCount = (stats.byStatus.ACTIVE as number) || 0;
  const trialCount = (stats.byStatus.TRIAL as number) || 0;
  const suspendedCount = (stats.byStatus.SUSPENDED as number) || 0;
  const cancelledCount = (stats.byStatus.CANCELLED as number) || 0;
  const totalCompanies = stats.total || 1;

  const activePct = Math.round((activeCount / totalCompanies) * 100);

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Key Metrics Showcase Grid */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-text-muted">
            Global Ecosystem Metrics
          </h2>
          <span className="text-[11px] font-semibold text-text-secondary">Live Telemetry Sync</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Total Tenants */}
          <div className="group rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-md hover:shadow-primary/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Total Companies
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-110">
                <MdBusiness className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight text-foreground">{stats.total}</span>
              <span className="text-xs font-bold text-primary">
                {trialCount > 0 ? `${trialCount} in trial` : 'Registered tenants'}
              </span>
            </div>
          </div>

          {/* Active Companies */}
          <div className="group rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500 hover:shadow-md hover:shadow-emerald-500/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Active Companies
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 transition-transform duration-200 group-hover:scale-110 dark:text-emerald-400">
                <MdCheckCircle className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight text-foreground">{activeCount}</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {activePct}% operational
              </span>
            </div>
          </div>

          {/* Suspended / Inactive Tenants */}
          <div className="group rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500 hover:shadow-md hover:shadow-amber-500/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Restricted / Hold
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 transition-transform duration-200 group-hover:scale-110 dark:text-amber-400">
                <MdBlock className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight text-foreground">{suspendedCount + cancelledCount}</span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                {suspendedCount} suspended, {cancelledCount} cancelled
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Split Directory & Audit Logs */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Recent Companies Directory (7 cols) */}
        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-6 shadow-sm lg:col-span-7">
          <div>
            <div className="mb-5 flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-extrabold text-foreground">Recent Enterprise Tenants</h3>
                <p className="text-xs font-medium text-text-secondary">
                  Latest {stats.recentCompanies.length} companies registered on the platform
                </p>
              </div>
              <Link
                href="/companies"
                className="inline-flex items-center gap-1 text-xs font-bold text-primary transition-colors hover:text-primary-dark"
              >
                Directory
                <MdArrowForward className="h-4 w-4" />
              </Link>
            </div>

            {stats.recentCompanies.length === 0 ? (
              <div className="py-12 text-center">
                <MdBusiness className="mx-auto h-10 w-10 text-text-muted opacity-40" />
                <p className="mt-2 text-xs font-bold text-foreground">No Companies Registered Yet</p>
                <p className="text-[11px] text-text-secondary">Click Provision Tenant Company above to get started</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {stats.recentCompanies.map(
                  (c: {
                    id: string;
                    name: string;
                    status: string;
                    slug?: string | null;
                    city?: string | null;
                    country?: string | null;
                    baseCurrency?: string | null;
                    createdAt?: string | Date | null;
                    _count?: { users: number; branches: number };
                  }) => {
                    const meta = statusMeta[c.status] || {
                      label: c.status,
                      badgeClass: 'bg-muted text-text-secondary',
                    };
                    return (
                      <Link
                        key={c.id}
                        href={`/companies/${c.id}`}
                        className="group flex flex-col justify-between gap-3 py-3.5 transition-colors hover:bg-background/80 sm:flex-row sm:items-center"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-primary-light/20 to-primary/10 text-sm font-black text-primary">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-bold text-foreground group-hover:text-primary">{c.name}</p>
                              {c.slug && (
                                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
                                  @{c.slug}
                                </span>
                              )}
                              {c.baseCurrency && (
                                <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-bold uppercase text-text-muted">
                                  {c.baseCurrency}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2.5 text-[11px] text-text-secondary">
                              <span>
                                {c.city ? `${c.city}, ${c.country || 'India'}` : c.country || 'India'}
                              </span>
                              <span>•</span>
                              <span className="font-semibold text-foreground">
                                {c._count?.branches ?? 1} Branches
                              </span>
                              <span>•</span>
                              <span className="font-semibold text-foreground">
                                {c._count?.users ?? 1} Users
                              </span>
                              {c.createdAt && (
                                <>
                                  <span>•</span>
                                  <span className="text-text-muted">
                                    Joined {new Date(c.createdAt).toLocaleDateString()}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${meta.badgeClass}`}>
                            {meta.label || c.status}
                          </span>
                          <MdArrowForward className="h-4 w-4 text-text-muted transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                        </div>
                      </Link>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Audit Logs (5 cols) */}
        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-6 shadow-sm lg:col-span-5">
          <div>
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3.5">
              <div>
                <h3 className="text-base font-extrabold text-foreground">Audit Logs</h3>
                <p className="text-xs font-medium text-text-secondary">
                  Recent platform administration activities
                </p>
              </div>
              <Link
                href="/audit-log"
                className="inline-flex items-center gap-1 text-xs font-bold text-primary transition-colors hover:text-primary-dark"
              >
                All Logs
                <MdArrowForward className="h-4 w-4" />
              </Link>
            </div>

            {stats.recentAudit.length === 0 ? (
              <div className="py-12 text-center">
                <MdHistory className="mx-auto h-10 w-10 text-text-muted opacity-40" />
                <p className="mt-2 text-xs font-bold text-foreground">No Audit Events Yet</p>
                <p className="text-[11px] text-text-secondary">Audit log events will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {stats.recentAudit.map(
                  (a: {
                    id: string;
                    action: string;
                    targetType?: string | null;
                    createdAt?: string | Date;
                    superAdmin?: { name: string; email?: string } | null;
                  }) => {
                    const adminDisplayName = a.superAdmin?.name || a.superAdmin?.email?.split('@')[0] || 'System Admin';

                    return (
                      <Link
                        key={a.id}
                        href={`/audit-log/${a.id}`}
                        className="group flex items-center justify-between gap-2 py-2.5 transition-colors hover:bg-background/80"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="flex h-6 w-6 flex-none items-center justify-center rounded-md bg-primary/10 text-primary transition-transform group-hover:scale-110">
                            <MdHistory className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-xs font-bold text-foreground group-hover:text-primary">
                                {a.action}
                              </span>
                              {a.targetType && (
                                <span className="flex-none rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-text-secondary">
                                  {a.targetType}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-none items-center gap-2.5 text-right text-[10.5px]">
                          <span className="inline-flex items-center gap-1 font-semibold text-text-secondary group-hover:text-foreground">
                            <MdPerson className="h-3.5 w-3.5 text-primary" />
                            {adminDisplayName}
                          </span>
                          {a.createdAt && (
                            <span className="text-text-muted">
                              {new Date(a.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                          <MdArrowForward className="h-3.5 w-3.5 text-text-muted opacity-60 transition-all group-hover:translate-x-0.5 group-hover:text-primary group-hover:opacity-100" />
                        </div>
                      </Link>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
