import type { Metadata } from 'next';
import './globals.css';
import { SessionProvider } from '@/components/layout/session-provider';
import { QueryProvider } from '@/components/ui/query-provider';
import { ToastProvider } from '@/components/ui/toast';
import { ConfirmProvider } from '@/components/ui/confirm';

export const metadata: Metadata = {
  title: 'Shashvat Jewels',
  description: 'Jewelry ERP Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&amp;display=swap" rel="stylesheet" />
      </head>
      <body>
        <SessionProvider>
          <QueryProvider>
            <ConfirmProvider>
              <ToastProvider>{children}</ToastProvider>
            </ConfirmProvider>
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
