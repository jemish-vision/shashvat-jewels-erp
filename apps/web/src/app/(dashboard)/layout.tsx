import { TenantSidebar } from '@/components/layout/tenant-sidebar';
import { TenantTopbar } from '@/components/layout/tenant-topbar';

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <TenantSidebar />
      <div className="ml-[var(--sidebar-w,272px)] flex flex-1 flex-col">
        <TenantTopbar />
        <main className="flex-1 bg-background p-6 pt-[calc(var(--header-h,64px)+1.5rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}
