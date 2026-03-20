import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login & Sign Up | Join Suraksha Weekly',
  description: 'Quick OTP-based login for delivery partners. Get instant access to AI-powered income protection starting ₹249/week. No passwords, just secure phone verification.',
  keywords: [
    'delivery partner login',
    'gig worker signup',
    'OTP login',
    'insurance registration',
    'Zomato Swiggy worker signup'
  ],
  openGraph: {
    title: 'Join Suraksha Weekly | Secure OTP Login',
    description: 'Quick signup for delivery partners. Secure OTP-based access to your income protection dashboard.',
    type: 'website'
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}