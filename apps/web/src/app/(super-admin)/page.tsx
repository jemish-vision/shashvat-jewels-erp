'use client';

import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '@/features/super-admin/queries';
import Link from 'next/link';

const statusColors: Record<string, string> = {
  TRIAL: 'text-info', ACTIVE: 'text-success', SUSPENDED: 'text-warning', CANCELLED: 'text-neutral',
};

const statusPills: Record<string, string> = {
  TRIAL: 'bg-info-bg text-info',
  ACTIVE: 'bg-success-bg text-success',
  SUSPENDED: 'bg-warning-bg text-warning',
  CANCELLED: 'bg-neutral-bg text-neutral',
};

export default function SuperAdminDashboard() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['super-admin', 'dashboard'],
    queryFn: getDashboardStats,
  });

  if (isLoading) return <div className="text-text-secondary">Loading&hellip;</div>;
  if (error || !stats) return <div className="text-danger">Failed to load dashboard</div>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[22px] font-bold tracking-tight text-foreground">Platform Dashboard</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
        {Object.entries(stats.byStatus).map(([status, count]) => (
          <div key={status} className="rounded-card border border-border bg-card p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_10px_24px_-14px_rgba(15,23,42,0.10),0_22px_48px_-30px_rgba(63,163,147,0.22)] transition-all duration-300 hover:translate-y-[-3px] hover:shadow-[0_4px_10px_rgba(15,23,42,0.06),0_22px_42px_-16px_rgba(63,163,147,0.28)]">
            <div className="mb-1 text-[13px] text-text-muted">{status}</div>
            <div className={`text-[28px] font-bold ${statusColors[status] || 'text-foreground'}`}>
              {count as number}
            </div>
          </div>
        ))}
        <div className="rounded-card border border-border bg-card p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_10px_24px_-14px_rgba(15,23,42,0.10),0_22px_48px_-30px_rgba(63,163,147,0.22)] transition-all duration-300 hover:translate-y-[-3px] hover:shadow-[0_4px_10px_rgba(15,23,42,0.06),0_22px_42px_-16px_rgba(63,163,147,0.28)]">
          <div className="mb-1 text-[13px] text-text-muted">Total Active</div>
          <div className="text-[28px] font-bold text-primary">{stats.total}</div>
        </div>
      </div>

      {/* Recent companies + activity */}
      <div className="grid grid-cols-2 gap-6">
        {/* Recent companies */}
        <div className="rounded-card border border-border bg-card p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_12px_28px_-14px_rgba(15,23,42,0.10),0_26px_54px_-30px_rgba(63,163,147,0.22)] transition-all duration-300 hover:translate-y-[-3px] hover:shadow-[0_6px_14px_rgba(15,23,42,0.06),0_26px_48px_-16px_rgba(63,163,147,0.26)]">
          <h2 className="mb-4 text-[16px] font-semibold text-foreground">Recent Companies</h2>
          {stats.recentCompanies.map((c: { id: string; name: string; status: string }) => (
            <Link
              key={c.id}
              href={`/companies/${c.id}`}
              className="flex items-center justify-between border-b border-border py-2 text-[14px] text-text-strong-2 no-underline last:border-0"
            >
              <span>{c.name}</span>
              <span className={`rounded-md px-2 py-px text-[10px] font-bold uppercase ${statusPills[c.status] || 'text-text-muted'}`}>
                {c.status}
              </span>
            </Link>
          ))}
        </div>

        {/* Recent activity */}
        <div className="rounded-card border border-border bg-card p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_12px_28px_-14px_rgba(15,23,42,0.10),0_26px_54px_-30px_rgba(63,163,147,0.22)] transition-all duration-300 hover:translate-y-[-3px] hover:shadow-[0_6px_14px_rgba(15,23,42,0.06),0_26px_48px_-16px_rgba(63,163,147,0.26)]">
          <h2 className="mb-4 text-[16px] font-semibold text-foreground">Recent Activity</h2>
          {stats.recentAudit.map((a: { id: string; action: string; superAdmin?: { name: string } | null }) => (
            <div key={a.id} className="flex items-center justify-between border-b border-border py-2 text-[13px] text-text-secondary last:border-0">
              <span>{a.action}</span>
              <span className="font-medium">{a.superAdmin?.name || 'System'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
