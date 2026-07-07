import { SuperAdminSidebar } from '@/components/layout/super-admin-sidebar';
import { Topbar } from '@/components/layout/topbar';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <SuperAdminSidebar />
      <div className="ml-[var(--sidebar-w)] flex flex-1 flex-col">
        <Topbar />
        <main className="flex-1 bg-background p-6 pt-[calc(var(--header-h)+1.5rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}
