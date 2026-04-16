import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How Suraksha Weekly Works | AI Income Protection for Delivery Partners',
  description: 'Learn how AI-powered parametric insurance automatically protects delivery partners against weather disruptions, platform outages, and environmental hazards. No claim forms, instant payouts.',
  keywords: [
    'how parametric insurance works',
    'delivery partner income protection',
    'AI insurance explained',
    'weather insurance for gig workers',
    'automatic claims processing',
    'Zomato Swiggy insurance guide'
  ],
  openGraph: {
    title: 'How Suraksha Weekly Works | AI Income Protection',
    description: 'Discover how AI automatically protects your delivery income. No forms, no waiting - just instant protection when disruptions hit.',
    type: 'article',
    url: 'https://suraksha.com/how-it-works',
    siteName: 'Suraksha Weekly',
    images: [
      {
        url: 'https://suraksha.com/images/how-it-works-og.jpg',
        width: 1200,
        height: 630,
        alt: 'How Suraksha Weekly protects delivery partners with AI-powered insurance'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How Suraksha Weekly Works | AI Income Protection',
    description: 'AI-powered insurance that automatically protects delivery partners. No forms, instant payouts when disruptions hit.',
    images: ['https://suraksha.com/images/how-it-works-twitter.jpg']
  },
  alternates: {
    canonical: 'https://suraksha.com/how-it-works'
  }
};

export default function HowItWorksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}