import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/sidebar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Suraksha Admin — Insurer Dashboard',
  description: 'Operations, claims management, fraud monitoring and payout oversight for Suraksha Weekly gig income insurance.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {/* Fixed left sidebar */}
        <Sidebar />
        {/* Main content offset to the right of the sidebar */}
        <main className="ml-64 min-h-screen bg-slate-50">{children}</main>
      </body>
    </html>
  );
}
