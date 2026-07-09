'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { getAuditLog } from '@/features/super-admin/queries';

export default function AuditLogPage() {
  const { data, fetchNextPage, hasNextPage, isLoading, error } = useInfiniteQuery({
    queryKey: ['super-admin', 'audit-log'],
    queryFn: ({ pageParam }) => getAuditLog({ limit: 25, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.pageInfo.hasNextPage ? last.pageInfo.nextCursor : undefined,
  });

  const entries = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--foreground)' }}>Audit Log</h1>
      {error && <div style={{ color: 'var(--danger)' }}>Failed to load audit log</div>}
      {isLoading ? <div style={{ color: 'var(--text-secondary)' }}>Loading…</div> : (
        <div style={{ background: 'var(--card)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
                <th style={thStyle}>Action</th>
                <th style={thStyle}>Target</th>
                <th style={thStyle}>Admin</th>
                <th style={thStyle}>IP</th>
                <th style={thStyle}>Time</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((a) => (
                <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={tdStyle}>{a.action}</td>
                  <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{a.targetType}#{a.targetId?.slice(0, 8)}</td>
                  <td style={tdStyle}>{a.superAdmin?.name || '-'}</td>
                  <td style={tdStyle}>{a.ipAddress || '-'}</td>
                  <td style={tdStyle}>{new Date(a.createdAt).toLocaleString('en-IN')}</td>
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
