'use client';

import { useState, useTransition } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Step = 'phone' | 'otp';
const DEMO_PHONE = '+919876543210';
const DEMO_OTP = '1234';

/** Requests an OTP from the FastAPI backend via the Next.js API route. */
async function requestOtp(phone: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'}/auth/request-otp`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      },
    );
    if (!res.ok) {
      const data = (await res.json()) as { detail?: string };
      return { ok: false, error: data.detail ?? 'Failed to send OTP' };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Network error — please try again' };
  }
}

export default function AuthPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  /** Validates Indian mobile number format: +91XXXXXXXXXX */
  function isValidPhone(val: string) {
    return /^\+91[6-9]\d{9}$/.test(val);
  }

  function isDemoPhone(val: string) {
    return val === DEMO_PHONE;
  }

  function handlePhoneChange(val: string) {
    // Auto-prefix +91 if user types without it
    if (val && !val.startsWith('+')) {
      val = '+91' + val.replace(/\D/g, '');
    }
    setPhone(val);
    setError('');
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!isValidPhone(phone)) {
      setError('Enter a valid Indian mobile number: +91XXXXXXXXXX');
      return;
    }

    if (isDemoPhone(phone)) {
      setStep('otp');
      setInfo(`Demo login enabled. Use OTP ${DEMO_OTP}.`);
      return;
    }

    startTransition(async () => {
      const result = await requestOtp(phone);
      if (result.ok) {
        setStep('otp');
        setInfo('OTP sent! Check your phone (or see backend logs in dev mode).');
      } else {
        setError(result.error ?? 'Failed to send OTP');
      }
    });
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const expectedOtpLength = isDemoPhone(phone) ? 4 : 6;
    const otpRegex = new RegExp(`^\\d{${expectedOtpLength}}$`);
    if (otp.length !== expectedOtpLength || !otpRegex.test(otp)) {
      setError(`Enter the ${expectedOtpLength}-digit OTP`);
      return;
    }

    startTransition(async () => {
      const result = await signIn('otp', {
        redirect: false,
        phone,
        otp,
      });

      if (result?.error) {
        setError('Invalid or expired OTP. Please try again.');
        return;
      }

      // New users go to onboarding; existing users go to dashboard
      // NextAuth callback URL handles this; we redirect based on session
      router.push('/onboarding');
    });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      {/* Logo */}
      <Link href="/" className="mb-8 flex items-center gap-2">
        <span className="text-3xl">🛡️</span>
        <span className="text-2xl font-bold text-slate-900">Suraksha Weekly</span>
      </Link>

      <Card className="w-full max-w-sm shadow-lg">
        {step === 'phone' ? (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Welcome back</CardTitle>
              <CardDescription>Enter your mobile number to get started</CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Mobile Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="+919876543210"
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    maxLength={13}
                    autoComplete="tel"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Indian number only: +91 followed by 10 digits
                  </p>
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={isPending}>
                  {isPending ? 'Sending OTP…' : 'Send OTP →'}
                </Button>
              </form>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Enter OTP</CardTitle>
              <CardDescription>
                We sent a {isDemoPhone(phone) ? '4-digit' : '6-digit'} code to{' '}
                <span className="font-medium text-slate-800">{phone}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {info && (
                <Alert variant="info" className="mb-4">
                  <AlertDescription>{info}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">{isDemoPhone(phone) ? '4-Digit OTP' : '6-Digit OTP'}</Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    pattern={isDemoPhone(phone) ? '\\d{4}' : '\\d{6}'}
                    placeholder={isDemoPhone(phone) ? '1234' : '123456'}
                    value={otp}
                    onChange={(e) => {
                      const maxOtpLength = isDemoPhone(phone) ? 4 : 6;
                      setOtp(e.target.value.replace(/\D/g, '').slice(0, maxOtpLength));
                      setError('');
                    }}
                    maxLength={isDemoPhone(phone) ? 4 : 6}
                    autoComplete="one-time-code"
                    className="text-center text-2xl tracking-widest"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isPending || otp.length < (isDemoPhone(phone) ? 4 : 6)}
                >
                  {isPending ? 'Verifying…' : 'Verify & Continue →'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setStep('phone');
                    setOtp('');
                    setError('');
                    setInfo('');
                  }}
                >
                  ← Change Number
                </Button>
              </form>
            </CardContent>
          </>
        )}
      </Card>

      <p className="mt-6 text-center text-xs text-slate-400">
        By continuing you agree to Suraksha Weekly&apos;s terms.
        <br />
        Income loss coverage only — not a health or life insurance product.
      </p>
    </div>
  );
}
