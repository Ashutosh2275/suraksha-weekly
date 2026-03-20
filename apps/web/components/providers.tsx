'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { ErrorBoundary } from '@/components/error-boundary';

/**
 * Wraps the entire app in NextAuth SessionProvider and global UI providers
 * so any client component can call useSession() and use toast notifications.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary onError={(error, errorInfo) => {
      // Log to external error tracking service in production
      console.error('Global error caught:', error, errorInfo);

      // You can integrate with services like Sentry here:
      // Sentry.captureException(error, { extra: errorInfo });
    }}>
      <SessionProvider>
        {children}
        <Toaster richColors position="bottom-center" />
      </SessionProvider>
    </ErrorBoundary>
  );
}
