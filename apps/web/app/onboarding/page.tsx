'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CITY_ZONES } from '@/lib/utils';
import { CheckCircle, XCircle } from 'lucide-react';

type PlatformType = 'Zomato' | 'Swiggy' | 'Both';

interface OnboardingData {
  name: string;
  city: string;
  service_zones: string[];
  platform_type: PlatformType;
  avg_daily_hours: number;
  avg_weekly_earnings: number;
}

interface FieldErrors {
  name?: string;
  city?: string;
  service_zones?: string;
  avg_daily_hours?: string;
  avg_weekly_earnings?: string;
}

type ValidationResult = { isValid: boolean; errors: FieldErrors };

const INITIAL_DATA: OnboardingData = {
  name: '',
  city: '',
  service_zones: [],
  platform_type: 'Zomato',
  avg_daily_hours: 8,
  avg_weekly_earnings: 5000,
};

const STEPS = [
  { title: 'Location', description: 'Where do you deliver?' },
  { title: 'Work Details', description: 'Tell us about your work' },
  { title: 'Review', description: 'Confirm your details' },
];

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isDemoAccount = session?.worker?.phone === '+919876543210';

  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<{ [K in keyof OnboardingData]?: boolean }>({});

  // Move validation functions before useEffect
  const validateCurrentStep = useCallback((): ValidationResult => {
    const errors: FieldErrors = {};

    if (step === 0) {
      if (!data.name.trim()) errors.name = 'Full name is required';
      else if (data.name.trim().length < 2) errors.name = 'Name must be at least 2 characters';

      if (!data.city) errors.city = 'Please select your city';

      if (data.service_zones.length === 0) {
        errors.service_zones = 'Select at least one delivery zone';
      }
    }

    if (step === 1) {
      if (data.avg_daily_hours < 1 || data.avg_daily_hours > 24) {
        errors.avg_daily_hours = 'Daily hours must be between 1 and 24';
      }

      if (data.avg_weekly_earnings < 500) {
        errors.avg_weekly_earnings = 'Weekly earnings must be at least ₹500';
      } else if (data.avg_weekly_earnings > 50000) {
        errors.avg_weekly_earnings = 'Weekly earnings seems too high (max ₹50,000)';
      }
    }

    return { isValid: Object.keys(errors).length === 0, errors };
  }, [step, data]);

  // Real-time validation when data changes - moved before early returns
  useEffect(() => {
    if (status === 'authenticated') {
      const validation = validateCurrentStep();
      setFieldErrors(validation.errors);
    }
  }, [data, step, status, validateCurrentStep]);

  // Redirect to auth if not logged in
  if (status === 'unauthenticated') {
    router.push('/auth');
    return null;
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const zones = data.city ? (CITY_ZONES[data.city] ?? []) : [];
  const progress = ((step + 1) / STEPS.length) * 100;

  function toggleZone(zone: string) {
    setData((prev) => ({
      ...prev,
      service_zones: prev.service_zones.includes(zone)
        ? prev.service_zones.filter((z) => z !== zone)
        : [...prev.service_zones, zone],
    }));
  }

  function validateStep(): boolean {
    const validation = validateCurrentStep();
    setFieldErrors(validation.errors);
    if (!validation.isValid) {
      // Set a general error if validation fails
      const firstError = Object.values(validation.errors)[0];
      setError(firstError || 'Please fix the errors above');
    } else {
      setError('');
    }
    return validation.isValid;
  }

  function markTouched(field: keyof OnboardingData) {
    setTouched(prev => ({ ...prev, [field]: true }));
  }

  function updateData<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) {
    setData(prev => ({ ...prev, [key]: value }));
    markTouched(key);
  }

  function handleNext() {
    if (!validateStep()) return;
    setStep((s) => s + 1);
  }

  async function handleSubmit() {
    if (!validateStep()) return;

    if (isDemoAccount) {
      router.push('/dashboard/quote');
      return;
    }

    startTransition(async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';
        const res = await fetch(`${apiBase}/workers/me`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.backendToken ?? ''}`,
          },
          body: JSON.stringify(data),
        });

        if (!res.ok && res.status !== 404) {
          // 404 = worker doesn't exist yet — that's OK for first-time flow
          const body = (await res.json()) as { detail?: string };
          setError(body.detail ?? 'Failed to save profile. Please try again.');
          return;
        }

        router.push('/dashboard/quote');
      } catch {
        setError('Network error — please try again');
      }
    });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      {/* Header */}
      <div className="mb-8 w-full max-w-lg text-center">
        <div className="mb-1 flex items-center justify-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-lg font-bold text-slate-900">Suraksha Weekly</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Step {step + 1} of {STEPS.length}
        </p>
      </div>

      <div className="w-full max-w-lg">
        {/* Progress bar */}
        <Progress value={progress} className="mb-6 h-2" />

        {/* Step indicators */}
        <div className="mb-6 flex justify-between">
          {STEPS.map((s, i) => (
            <div key={s.title} className="flex items-center gap-1">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  i <= step ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500'
                }`}
              >
                {i < step ? '✓' : i + 1}
              </div>
              <span
                className={`hidden text-xs sm:inline ${
                  i === step ? 'font-semibold text-slate-900' : 'text-slate-400'
                }`}
              >
                {s.title}
              </span>
            </div>
          ))}
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>{STEPS[step].title}</CardTitle>
            <CardDescription>{STEPS[step].description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* ── Step 0: Location ── */}
            {step === 0 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    Full Name
                    {touched.name && !fieldErrors.name && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {touched.name && fieldErrors.name && (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </Label>
                  <Input
                    id="name"
                    placeholder="Ramesh Kumar"
                    value={data.name}
                    onChange={(e) => updateData('name', e.target.value)}
                    onBlur={() => markTouched('name')}
                    className={
                      touched.name && fieldErrors.name
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : touched.name && !fieldErrors.name
                        ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                        : ''
                    }
                  />
                  {touched.name && fieldErrors.name && (
                    <p className="text-sm text-red-600">{fieldErrors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>City</Label>
                  <Select
                    value={data.city}
                    onValueChange={(val) =>
                      setData({ ...data, city: val, service_zones: [] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your city" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(CITY_ZONES).map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {data.city && (
                  <div className="space-y-2">
                    <Label>Delivery Zones <span className="text-xs text-muted-foreground">(select all that apply)</span></Label>
                    <div className="flex flex-wrap gap-2">
                      {zones.map((zone) => {
                        const selected = data.service_zones.includes(zone);
                        return (
                          <button
                            key={zone}
                            type="button"
                            onClick={() => toggleZone(zone)}
                            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                              selected
                                ? 'border-primary bg-primary text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-primary'
                            }`}
                          >
                            {zone}
                          </button>
                        );
                      })}
                    </div>
                    {data.service_zones.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {data.service_zones.length} zone{data.service_zones.length > 1 ? 's' : ''} selected
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ── Step 1: Work Details ── */}
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label>Primary Platform</Label>
                  <RadioGroup
                    value={data.platform_type}
                    onValueChange={(val) =>
                      setData({ ...data, platform_type: val as PlatformType })
                    }
                    className="flex gap-4"
                  >
                    {(['Zomato', 'Swiggy', 'Both'] as PlatformType[]).map((platform) => (
                      <div key={platform} className="flex items-center gap-2">
                        <RadioGroupItem value={platform} id={platform} />
                        <Label htmlFor={platform} className="cursor-pointer">
                          {platform}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hours">
                    Average Daily Delivery Hours
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {data.avg_daily_hours} hrs
                    </Badge>
                  </Label>
                  <Input
                    id="hours"
                    type="number"
                    min={1}
                    max={24}
                    step={0.5}
                    value={data.avg_daily_hours}
                    onChange={(e) =>
                      setData({ ...data, avg_daily_hours: parseFloat(e.target.value) || 0 })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Typical range: 6–12 hours/day
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="earnings" className="flex items-center gap-2">
                    Average Weekly Earnings (₹)
                    {touched.avg_weekly_earnings && !fieldErrors.avg_weekly_earnings && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {touched.avg_weekly_earnings && fieldErrors.avg_weekly_earnings && (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </Label>
                  <Input
                    id="earnings"
                    type="number"
                    min={500}
                    step={100}
                    value={data.avg_weekly_earnings}
                    onChange={(e) => updateData('avg_weekly_earnings', parseInt(e.target.value) || 0)}
                    onBlur={() => markTouched('avg_weekly_earnings')}
                    placeholder="5000"
                    className={
                      touched.avg_weekly_earnings && fieldErrors.avg_weekly_earnings
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : touched.avg_weekly_earnings && !fieldErrors.avg_weekly_earnings
                        ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                        : ''
                    }
                  />
                  {touched.avg_weekly_earnings && fieldErrors.avg_weekly_earnings && (
                    <p className="text-sm text-red-600">{fieldErrors.avg_weekly_earnings}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Your payout is calculated as a % of your declared weekly baseline
                  </p>
                </div>
              </>
            )}

            {/* ── Step 2: Review ── */}
            {step === 2 && (
              <div className="space-y-3">
                <ReviewRow label="Name" value={data.name} />
                <ReviewRow label="City" value={data.city} />
                <ReviewRow
                  label="Zones"
                  value={data.service_zones.join(', ') || '—'}
                />
                <ReviewRow label="Platform" value={data.platform_type} />
                <ReviewRow label="Daily Hours" value={`${data.avg_daily_hours} hrs`} />
                <ReviewRow label="Weekly Earnings" value={`₹${data.avg_weekly_earnings.toLocaleString('en-IN')}`} />
                <Alert variant="info">
                  <AlertDescription>
                    Your profile powers the premium calculation. You can update it anytime from the dashboard.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 pt-2">
              {step > 0 && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setStep((s) => s - 1); setError(''); }}
                  disabled={isPending}
                >
                  ← Back
                </Button>
              )}
              {step < STEPS.length - 1 ? (
                <Button className="flex-1" onClick={handleNext}>
                  Next →
                </Button>
              ) : (
                <Button className="flex-1" onClick={handleSubmit} disabled={isPending}>
                  {isPending ? 'Saving…' : 'See My Quote →'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** Inline review row component */
function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md bg-slate-50 px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}
