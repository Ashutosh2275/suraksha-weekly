import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | Suraksha Weekly Income Shield',
  description: 'View your active policy, recent claims, and real-time trigger alerts. Track your income protection and payout history in one secure dashboard.',
  keywords: [
    'insurance dashboard',
    'policy status',
    'claims history',
    'delivery partner dashboard',
    'income protection tracking'
  ],
  robots: {
    index: false,
    follow: false
  },
  openGraph: {
    title: 'Your Suraksha Dashboard | Income Protection Status',
    description: 'Secure dashboard to manage your income protection policy and track claims.',
    type: 'website',
    siteName: 'Suraksha Weekly'
  }
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}