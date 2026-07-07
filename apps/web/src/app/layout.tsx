import type { Metadata } from 'next';
import './globals.css';
import { SessionProvider } from '@/components/layout/session-provider';
import { QueryProvider } from '@/components/ui/query-provider';
import { ToastProvider } from '@/components/ui/toast';

export const metadata: Metadata = {
  title: 'Shashvat Jewels',
  description: 'Jewelry ERP Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <QueryProvider>
            <ToastProvider>{children}</ToastProvider>
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
