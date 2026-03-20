'use client';

import { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ClaimRow {
  worker: string;
  zone: string;
  trigger: string;
  payout: string;
  score: number;
  status: string;
  chips?: string[];
}

const CLAIMS: ClaimRow[] = [
  {
    worker: 'Rahul Sharma',
    zone: 'Mumbai Z3',
    trigger: 'HeavyRain',
    payout: '₹287',
    score: 12,
    status: 'Paid',
  },
  {
    worker: 'Priya Singh',
    zone: 'Mumbai Z2',
    trigger: 'HeavyRain',
    payout: '₹0',
    score: 95,
    status: 'BLOCKED',
    chips: ['GPS_SPOOF_DETECTED', 'IMPOSSIBLE_TRAVEL'],
  },
  {
    worker: 'Amit Kumar',
    zone: 'Delhi Z1',
    trigger: 'SeverePollution',
    payout: '₹0',
    score: 88,
    status: 'BLOCKED',
    chips: ['DUPLICATE_PAYOUT_DESTINATION'],
  },
];

function FallbackCard() {
  return (
    <Card>
      <CardContent className="pt-6 text-slate-700">Loading dashboard data...</CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const [hoverRow, setHoverRow] = useState<number | null>(null);

  try {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card><CardContent className="pt-6"><p className="text-sm text-slate-500">Active Policies</p><p className="text-2xl font-bold">10</p></CardContent></Card>
            <Card><CardContent className="pt-6"><p className="text-sm text-slate-500">Claims Today</p><p className="text-2xl font-bold">3</p></CardContent></Card>
            <Card><CardContent className="pt-6"><p className="text-sm text-slate-500">Loss Ratio</p><p className="text-2xl font-bold">62%</p></CardContent></Card>
            <Card><CardContent className="pt-6"><p className="text-sm text-slate-500">Fraud Flags</p><p className="text-2xl font-bold">2</p></CardContent></Card>
            <Card><CardContent className="pt-6"><p className="text-sm text-slate-500">Payout ₹</p><p className="text-2xl font-bold">₹861</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Claims Table</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-slate-500">
                      <th className="text-left py-2">Worker</th>
                      <th className="text-left py-2">Zone</th>
                      <th className="text-left py-2">Trigger</th>
                      <th className="text-left py-2">Payout</th>
                      <th className="text-left py-2">Score</th>
                      <th className="text-left py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CLAIMS.map((row, index) => (
                      <tr
                        key={`${row.worker}-${row.trigger}`}
                        className="border-b"
                        onMouseEnter={() => setHoverRow(index)}
                        onMouseLeave={() => setHoverRow(null)}
                      >
                        <td className="py-2">{row.worker}</td>
                        <td className="py-2">{row.zone}</td>
                        <td className="py-2">{row.trigger}</td>
                        <td className="py-2">{row.payout}</td>
                        <td className="py-2">
                          <Badge className={row.score < 30 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {row.score}
                          </Badge>
                        </td>
                        <td className="py-2">
                          <Badge className={row.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {row.status}
                          </Badge>
                          {hoverRow === index && row.chips ? (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {row.chips.map((chip) => (
                                <Badge key={chip} variant="outline">{chip}</Badge>
                              ))}
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trigger Feed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="font-semibold text-slate-900">Heavy Rain · Mumbai Zone 3</p>
                <p className="text-sm text-slate-600 mt-1">42mm/hr · Confidence: 91%</p>
                <Badge className="mt-2 bg-red-100 text-red-800">ACTIVE</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  } catch {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-6xl">
          <FallbackCard />
        </div>
      </main>
    );
  }
}
