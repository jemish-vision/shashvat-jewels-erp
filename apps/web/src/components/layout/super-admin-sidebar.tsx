'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { superAdminNav } from '@/config/navigation';

const iconMap: Record<string, string> = {
  dashboard: '\u2302',
  business: '\u2630',
  history: '\u29D6',
  settings: '\u2699',
};

export function SuperAdminSidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      width: 'var(--sidebar-w)', height: '100vh', background: 'var(--card)',
      borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
      position: 'fixed', left: 0, top: 0,
    }}>
      <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>Admin</span>
      </div>
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {superAdminNav.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 'var(--radius-btn)',
                fontSize: 14, textDecoration: 'none',
                background: isActive ? 'var(--primary)' : 'transparent',
                color: isActive ? '#fff' : 'var(--text-strong-2)',
              }}
            >
              <span style={{ fontSize: 18 }}>{iconMap[item.icon] || '\u25CF'}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
