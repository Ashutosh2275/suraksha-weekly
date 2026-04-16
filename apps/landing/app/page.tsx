import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-5xl px-4 py-20 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900">
          Your earnings. Protected. Every week.
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Parametric income insurance for Zomato &amp; Swiggy delivery partners.
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold text-slate-900">11M+ Workers</p>
              <p className="text-sm text-slate-500 mt-1">India gig ecosystem coverage opportunity</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold text-slate-900">&lt; 10 Min Payout</p>
              <p className="text-sm text-slate-500 mt-1">Trigger to transfer in simulation mode</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold text-slate-900">₹29/week from</p>
              <p className="text-sm text-slate-500 mt-1">Flexible plans with transparent payouts</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-10">
          <Link href="/auth">
            <Button size="lg">Get Covered in 3 Minutes</Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
