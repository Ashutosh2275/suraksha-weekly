'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatINR } from '@/lib/utils';

interface Plan {
  id: 'basic' | 'standard' | 'pro';
  name: string;
  weekly: number;
  coverage: number;
  triggers: number;
  badge?: string;
  extra?: string;
}

const PLANS: Plan[] = [
  { id: 'basic', name: 'Basic', weekly: 49, coverage: 500, triggers: 2 },
  { id: 'standard', name: 'Standard', weekly: 99, coverage: 1500, triggers: 5, badge: 'Most Popular' },
  { id: 'pro', name: 'Pro', weekly: 189, coverage: 3000, triggers: 5, badge: 'Best Value', extra: 'Priority SLA' },
];

export default function QuotePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<'basic' | 'standard' | 'pro'>('standard');

  function buy(plan: Plan) {
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.65 } });
    toast.success(`${plan.name} plan activated`, {
      description: `₹${plan.weekly}/week · ₹${plan.coverage} coverage`,
      duration: 1800,
    });
    setTimeout(() => router.push('/dashboard'), 900);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <h1 className="text-3xl font-bold text-slate-900 text-center">Choose Your Weekly Plan</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map((plan) => {
            const isSelected = selected === plan.id;
            return (
              <Card
                key={plan.id}
                className={isSelected ? 'ring-2 ring-indigo-500 border-indigo-400' : ''}
                onClick={() => setSelected(plan.id)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{plan.name}</CardTitle>
                    {plan.badge ? <Badge>{plan.badge}</Badge> : null}
                  </div>
                  <CardDescription>
                    <span className="text-3xl font-bold text-slate-900">{formatINR(plan.weekly)}</span> / week
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-slate-700">
                  <p>Coverage: {formatINR(plan.coverage)}</p>
                  <p>Triggers: {plan.triggers}</p>
                  {plan.extra ? <p>{plan.extra}</p> : null}
                </CardContent>
                <CardFooter>
                  <Button className="w-full" onClick={() => buy(plan)}>Buy Now</Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Why is your premium ₹99?</CardTitle>
            <CardDescription className="text-blue-800">Explainability panel for Standard plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm text-slate-800">
                <span>Zone 3 high disruption risk +18%</span>
                <span>68%</span>
              </div>
              <Progress value={68} className="mt-1" />
            </div>
            <div>
              <div className="flex items-center justify-between text-sm text-slate-800">
                <span>Peak hours exposure (8hrs/day) +12%</span>
                <span>52%</span>
              </div>
              <Progress value={52} className="mt-1" />
            </div>
            <div>
              <div className="flex items-center justify-between text-sm text-slate-800">
                <span>New member — no trust discount yet</span>
                <span>30%</span>
              </div>
              <Progress value={30} className="mt-1" />
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
