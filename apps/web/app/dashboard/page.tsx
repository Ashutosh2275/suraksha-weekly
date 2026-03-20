'use client';

import { useMemo, useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TRIGGER_FACTORS: Record<string, number> = {
  HeavyRain: 0.8,
  ExtremeHeat: 0.6,
  SeverePollution: 0.75,
  LocalRestriction: 1.0,
  PlatformOutage: 0.9,
};

function FallbackCard() {
  return (
    <Card>
      <CardContent className="pt-6 text-slate-700">Loading dashboard data...</CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [trigger, setTrigger] = useState('HeavyRain');
  const [duration, setDuration] = useState(3);

  try {
    const estimated = useMemo(() => {
      const hourlyBaseline = 120;
      const value = Math.round(hourlyBaseline * duration * (TRIGGER_FACTORS[trigger] ?? 0.8));
      return value >= 287 ? 287 : value;
    }, [duration, trigger]);

    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <Card className="border-amber-300 bg-amber-50 animate-pulse">
            <CardContent className="pt-4">
              <p className="font-semibold text-amber-900">Your Shield is Active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rahul Sharma</CardTitle>
              <CardDescription>Worker dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-lg font-semibold text-slate-900">Pro Plan · ₹189/week · ₹3,000 coverage · Active</p>
                <Badge title="12% premium discount · Priority processing" className="bg-amber-100 text-amber-900">Gold</Badge>
              </div>
              <p className="text-sm text-slate-600">Renews in 5d 12h 33m</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payout History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-slate-500">
                      <th className="text-left py-2">Date</th>
                      <th className="text-left py-2">Trigger</th>
                      <th className="text-left py-2">Zone</th>
                      <th className="text-left py-2">Amount</th>
                      <th className="text-left py-2">Status</th>
                      <th className="text-left py-2">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2">Today</td>
                      <td className="py-2">Heavy Rain</td>
                      <td className="py-2">Mumbai Zone 3</td>
                      <td className="py-2">₹287</td>
                      <td className="py-2"><Badge className="bg-green-100 text-green-800">Paid</Badge></td>
                      <td className="py-2 font-mono text-xs">rzp_test_demo_001</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Claim Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>1. Disruption Detected</p>
              <p>2. Claim Initiated</p>
              <p>3. Fraud Check (score 12, LOW RISK ✓)</p>
              <p>4. ₹287 Credited</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Coverage Simulator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-slate-700 mb-1">Trigger Type</p>
                  <Select value={trigger} onValueChange={setTrigger}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HeavyRain">Heavy Rain</SelectItem>
                      <SelectItem value="ExtremeHeat">Extreme Heat</SelectItem>
                      <SelectItem value="SeverePollution">Severe Pollution</SelectItem>
                      <SelectItem value="LocalRestriction">Local Restriction</SelectItem>
                      <SelectItem value="PlatformOutage">Platform Outage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-sm text-slate-700 mb-1">Duration: {duration}h</p>
                  <input
                    type="range"
                    min={1}
                    max={8}
                    step={1}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
              <p className="text-lg font-semibold text-slate-900">Estimated payout: ₹{estimated}</p>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  } catch {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <FallbackCard />
        </div>
      </main>
    );
  }
}
