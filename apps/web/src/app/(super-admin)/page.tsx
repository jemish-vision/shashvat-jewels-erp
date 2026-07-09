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
  MdMoreHoriz,
} from 'react-icons/md';

const statusMeta: Record<string, { label: string; icon: React.ReactNode; bg: string; color: string; badgeBg: string; badgeColor: string }> = {
  ACTIVE: {
    label: 'Active',
    icon: <MdCheckCircle size={17} />,
    bg: 'bg-success-bg',
    color: 'text-success',
    badgeBg: 'bg-success-bg',
    badgeColor: 'text-success',
  },
  TRIAL: {
    label: 'Trial',
    icon: <MdHourglassEmpty size={17} />,
    bg: 'bg-info-bg',
    color: 'text-info',
    badgeBg: 'bg-info-bg',
    badgeColor: 'text-info',
  },
  SUSPENDED: {
    label: 'Suspended',
    icon: <MdBlock size={17} />,
    bg: 'bg-warning-bg',
    color: 'text-warning',
    badgeBg: 'bg-warning-bg',
    badgeColor: 'text-warning',
  },
  CANCELLED: {
    label: 'Cancelled',
    icon: <MdCancel size={17} />,
    bg: 'bg-neutral-bg',
    color: 'text-neutral',
    badgeBg: 'bg-neutral-bg',
    badgeColor: 'text-neutral',
  },
};

export default function SuperAdminDashboard() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['super-admin', 'dashboard'],
    queryFn: getDashboardStats,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-[13px] font-medium text-text-secondary">Loading dashboard&hellip;</div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="card p-6 text-center">
          <div className="mb-2 text-[14px] font-semibold text-danger">Failed to load dashboard</div>
          <div className="text-[12px] text-text-muted">Please try refreshing the page.</div>
        </div>
      </div>
    );
  }

  const statusEntries = Object.entries(stats.byStatus);
  const primaryStat = { label: 'Total Companies', value: stats.total, icon: <MdBusiness size={17} />, bg: 'bg-[rgba(111,211,196,0.14)]', color: 'text-primary' };

  return (
    <div className="flex flex-col gap-6">

      {/* Page Header */}
      <div>
        <h1 className="m-0 text-[22px] font-extrabold tracking-tight text-foreground">Platform Dashboard</h1>
        <p className="m-0 mt-[5px] text-[13px] font-medium text-text-secondary">
          Live snapshot of companies, registrations, and platform activity.
        </p>
      </div>

      {/* Key Metrics */}
      <div>
        <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.1em] text-text-secondary">Key Metrics</h4>
        <div className="grid grid-cols-4 gap-4">
          {/* Total stat card — primary */}
          <div className="card p-4">
            <div className="mb-3.5 flex items-center justify-between">
              <div className="flex items-center gap-[9px]">
                <div className={`flex h-8 w-8 flex-none items-center justify-center rounded-[9px] ${primaryStat.bg} ${primaryStat.color}`}>
                  {primaryStat.icon}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                  {primaryStat.label}
                </span>
              </div>
            </div>
            <div className="flex items-baseline gap-[7px]">
              <span className="text-[21px] font-extrabold tracking-tight text-foreground">
                {primaryStat.value}
              </span>
            </div>
          </div>

          {/* Status stat cards */}
          {statusEntries.map(([status, count]) => {
            const meta = statusMeta[status] || { label: status, icon: <MdMoreHoriz size={17} />, bg: 'bg-muted', color: 'text-text-secondary', badgeBg: 'bg-neutral-bg', badgeColor: 'text-neutral' };
            return (
              <div key={status} className="card p-4">
                <div className="mb-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-[9px]">
                    <div className={`flex h-8 w-8 flex-none items-center justify-center rounded-[9px] ${meta.bg} ${meta.color}`}>
                      {meta.icon}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                      {meta.label}
                    </span>
                  </div>
                </div>
                <div className="flex items-baseline gap-[7px]">
                  <span className="text-[21px] font-extrabold tracking-tight text-foreground">
                    {count as number}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent companies + activity */}
      <div className="grid grid-cols-12 gap-4">

        {/* Recent Companies */}
        <div className="col-span-7 card-lg p-[22px]">
          <div className="mb-[14px] flex items-center justify-between">
            <div>
              <h3 className="m-0 text-[16px] font-bold text-foreground">Recent Companies</h3>
              <p className="m-0 mt-[3px] text-[11px] font-medium text-text-secondary">
                Latest {stats.recentCompanies.length} registered companies
              </p>
            </div>
            <Link
              href="/companies"
              className="text-[11px] font-bold text-primary no-underline transition-colors hover:text-primary-dark"
            >
              View All
            </Link>
          </div>

          {stats.recentCompanies.length === 0 ? (
            <div className="py-6 text-center text-[12px] text-text-muted">No companies registered yet.</div>
          ) : (
            <div>
              {stats.recentCompanies.map((c: { id: string; name: string; status: string }, i: number) => {
                const meta = statusMeta[c.status] || { badgeBg: 'bg-neutral-bg', badgeColor: 'text-neutral' };
                return (
                  <Link
                    key={c.id}
                    href={`/companies/${c.id}`}
                    className="flex items-center justify-between border-b border-border py-[11px] text-[12.5px] font-bold text-foreground no-underline transition-colors last:border-0 hover:text-primary"
                  >
                    <span>{c.name}</span>
                    <span className={`badge ${meta.badgeBg} ${meta.badgeColor}`}>
                      {c.status}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="col-span-5 card-lg p-[22px]">
          <div className="mb-[14px] flex items-center justify-between">
            <div>
              <h3 className="m-0 text-[16px] font-bold text-foreground">Recent Activity</h3>
              <p className="m-0 mt-[3px] text-[11px] font-medium text-text-secondary">
                Latest audit trail entries
              </p>
            </div>
            <Link
              href="/audit-log"
              className="text-[11px] font-bold text-primary no-underline transition-colors hover:text-primary-dark"
            >
              View All
            </Link>
          </div>

          {stats.recentAudit.length === 0 ? (
            <div className="py-6 text-center text-[12px] text-text-muted">No activity recorded yet.</div>
          ) : (
            <div className="relative flex flex-col gap-[18px]">
              {/* Timeline line */}
              <div className="absolute left-[15px] top-[6px] bottom-[6px] w-px bg-border" />

              {stats.recentAudit.map((a: { id: string; action: string; superAdmin?: { name: string } | null }) => (
                <div key={a.id} className="relative flex gap-3">
                  <div className="z-10 flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] bg-[rgba(111,211,196,0.14)] text-primary">
                    <MdHistory size={16} />
                  </div>
                  <div className="flex-1 pt-px">
                    <p className="m-0 text-[12px] leading-[1.4] text-foreground">
                      <span className="font-bold">{a.action}</span>
                    </p>
                    <div className="mt-1 flex items-center gap-[6px]">
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-text-muted">
                        <MdPerson size={12} />
                        {a.superAdmin?.name || 'System'}
                      </span>
                      <span className="rounded-[5px] bg-muted px-[5px] py-px text-[9px] font-bold text-text-secondary">
                        AUDIT
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card-lg p-[22px]">
        <h3 className="mb-4 text-[16px] font-bold text-foreground">Quick Actions</h3>
        <div className="flex gap-3">
          <Link
            href="/companies/new"
            className="btn-primary"
          >
            <MdBusiness size={16} />
            New Company
          </Link>
          <Link
            href="/companies"
            className="inline-flex items-center gap-[6px] rounded-[12px] border border-border bg-background px-[18px] py-[8px] text-[13px] font-bold text-text-strong-2 no-underline transition-colors hover:bg-muted"
          >
            Manage Companies
            <MdArrowForward size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
