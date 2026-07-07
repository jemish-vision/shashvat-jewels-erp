'use client';

import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { listCompanies } from '@/features/super-admin/queries';
import Link from 'next/link';

const statusColors: Record<string, string> = {
  TRIAL: 'var(--info)', ACTIVE: 'var(--success)', SUSPENDED: 'var(--warning)', CANCELLED: 'var(--neutral)',
};

export default function CompaniesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, fetchNextPage, hasNextPage, isLoading, error } = useInfiniteQuery({
    queryKey: ['super-admin', 'companies', search, statusFilter],
    queryFn: ({ pageParam }) => listCompanies({ limit: 25, cursor: pageParam, search: search || undefined, status: statusFilter || undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.pageInfo.hasNextPage ? last.pageInfo.nextCursor : undefined,
  });

  const companies = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--foreground)' }}>Companies</h1>
        <Link href="/companies/new" style={{ padding: '8px 16px', background: 'var(--primary)', color: '#fff', borderRadius: 'var(--radius-btn)', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
          + New Company
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <input placeholder="Search name, slug, email…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--input)', borderRadius: 'var(--radius-input)', fontSize: 14 }} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--input)', borderRadius: 'var(--radius-input)', fontSize: 14, background: 'var(--card)' }}>
          <option value="">All statuses</option>
          <option value="TRIAL">Trial</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {error && <div style={{ color: 'var(--danger)' }}>Failed to load companies</div>}

      {isLoading ? <div style={{ color: 'var(--text-secondary)' }}>Loading…</div> : (
        <div style={{ background: 'var(--card)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Slug</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Plan</th>
                <th style={thStyle}>Created</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={tdStyle}>{c.name}</td>
                  <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{c.slug}</td>
                  <td style={tdStyle}><span style={{ color: statusColors[c.status] || 'var(--text-muted)', fontSize: 13 }}>{c.status}</span></td>
                  <td style={tdStyle}>{c.plan || '-'}</td>
                  <td style={tdStyle}>{new Date(c.createdAt).toLocaleDateString('en-IN')}</td>
                  <td style={tdStyle}><Link href={`/companies/${c.id}`} style={{ color: 'var(--primary)', fontSize: 13 }}>View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasNextPage && (
        <button onClick={() => fetchNextPage()} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--input)', borderRadius: 'var(--radius-btn)', cursor: 'pointer', alignSelf: 'center' }}>
          Load more
        </button>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' };
const tdStyle: React.CSSProperties = { padding: '10px 14px', fontSize: 14, color: 'var(--text-strong-2)' };
