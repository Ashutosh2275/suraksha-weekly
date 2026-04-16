import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Complete Your Profile | Suraksha Weekly Setup',
  description: 'Set up your delivery profile to get personalized AI-powered insurance quotes. Tell us about your work zones, hours, and earnings for accurate premium calculation.',
  keywords: [
    'delivery partner profile',
    'insurance onboarding',
    'AI premium calculation',
    'personalized insurance quotes'
  ],
  robots: {
    index: false,
    follow: false
  },
  openGraph: {
    title: 'Complete Your Suraksha Profile',
    description: 'Quick setup to get personalized insurance protection for your delivery work.',
    type: 'website'
  }
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}