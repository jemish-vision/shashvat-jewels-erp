'use client';

import { useAuth } from '@/lib/auth-context';
import { site } from '@/config/site';

export function Topbar() {
  const { user, logout } = useAuth();

  return (
    <header style={{
      height: 'var(--header-h)', background: 'var(--card)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', position: 'sticky', top: 0, zIndex: 50,
      backdropFilter: 'blur(8px)',
    }}>
      <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}>{site.name}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          {user?.email || user?.role}
        </span>
        <button
          onClick={() => logout()}
          style={{
            padding: '6px 14px', background: 'transparent', border: '1px solid var(--input)',
            borderRadius: 'var(--radius-btn)', fontSize: 13, color: 'var(--text-strong-2)',
            cursor: 'pointer',
          }}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
