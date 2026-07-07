'use client';

import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '@/features/super-admin/queries';
import Link from 'next/link';

const statusColors: Record<string, string> = {
  TRIAL: 'var(--info)', ACTIVE: 'var(--success)', SUSPENDED: 'var(--warning)', CANCELLED: 'var(--neutral)',
};

export default function SuperAdminDashboard() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['super-admin', 'dashboard'],
    queryFn: getDashboardStats,
  });

  if (isLoading) return <div style={{ color: 'var(--text-secondary)' }}>Loading…</div>;
  if (error || !stats) return <div style={{ color: 'var(--danger)' }}>Failed to load dashboard</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--foreground)' }}>Platform Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
        {Object.entries(stats.byStatus).map(([status, count]) => (
          <div key={status} style={{ padding: 20, background: 'var(--card)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>{status}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: statusColors[status] || 'var(--foreground)' }}>{count}</div>
          </div>
        ))}
        <div style={{ padding: 20, background: 'var(--card)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Total Active</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary)' }}>{stats.total}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={{ background: 'var(--card)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)', padding: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--foreground)' }}>Recent Companies</h2>
          {stats.recentCompanies.map((c) => (
            <Link key={c.id} href={`/companies/${c.id}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', textDecoration: 'none', fontSize: 14, color: 'var(--text-strong-2)' }}>
              <span>{c.name}</span>
              <span style={{ color: statusColors[c.status] || 'var(--text-muted)' }}>{c.status}</span>
            </Link>
          ))}
        </div>

        <div style={{ background: 'var(--card)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)', padding: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--foreground)' }}>Recent Activity</h2>
          {stats.recentAudit.map((a) => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--text-secondary)' }}>
              <span>{a.action}</span>
              <span>{a.superAdmin?.name || 'System'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
