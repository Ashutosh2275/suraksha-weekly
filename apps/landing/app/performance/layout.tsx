import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Performance Verification | System Health Check',
  description: 'Verify API performance and system health through automated endpoint testing.',
  robots: {
    index: false,
    follow: false
  }
};

export default function PerformanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}