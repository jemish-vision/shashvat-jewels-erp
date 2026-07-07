import { SuperAdminSidebar } from '@/components/layout/super-admin-sidebar';
import { Topbar } from '@/components/layout/topbar';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <SuperAdminSidebar />
      <div style={{ marginLeft: 'var(--sidebar-w)', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Topbar />
        <main style={{ padding: 24, flex: 1, background: 'var(--background)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
