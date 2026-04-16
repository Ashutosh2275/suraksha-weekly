import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    template: '%s | Suraksha Weekly',
    default: 'Suraksha Weekly — AI Income Shield for Delivery Partners'
  },
  description: 'Parametric income insurance for Zomato & Swiggy delivery partners. AI-powered protection against rain, heat, pollution, platform outages. No claim forms, instant payouts starting ₹249/week.',
  keywords: [
    'gig worker insurance',
    'delivery partner insurance',
    'income protection',
    'Zomato insurance',
    'Swiggy insurance',
    'parametric insurance',
    'weather insurance',
    'AI insurance',
    'automatic claims',
    'gig economy protection'
  ],
  authors: [{ name: 'Suraksha Weekly Team' }],
  creator: 'Suraksha Weekly',
  publisher: 'Suraksha Weekly',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://suraksha.com'),
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://suraksha.com',
    siteName: 'Suraksha Weekly',
    title: 'Suraksha Weekly | AI Income Protection for Delivery Partners',
    description: 'AI-powered parametric insurance protecting delivery partners against weather, outages, and disruptions. No paperwork, instant payouts.',
    images: [
      {
        url: '/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Suraksha Weekly - Income protection for delivery partners'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Suraksha Weekly | AI Income Protection',
    description: 'Protecting delivery partners with AI-powered insurance. No forms, instant payouts when disruptions hit.',
    creator: '@SurakshaWeekly',
    images: ['/images/twitter-image.jpg']
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'google-site-verification-code',
    yandex: 'yandex-verification-code',
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
