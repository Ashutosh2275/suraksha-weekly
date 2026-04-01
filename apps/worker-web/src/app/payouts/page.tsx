"use client";

import { useEffect, useState } from "react";

import { Skeleton } from "@/components/common/Skeleton";
import { PayoutReceiptCard } from "@/components/payouts/PayoutReceiptCard";
import { PayoutItem, getPayouts } from "@/lib/workerApi";

export default function PayoutsPage() {
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);

  useEffect(() => {
    getPayouts().then((result) => {
      setPayouts(result);
      setLoading(false);
    });
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-md bg-slate-50 px-4 py-6">
      <header className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payouts</p>
        <h1 className="text-2xl font-semibold text-slate-900">Payout history</h1>
      </header>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (
        <div className="space-y-3">
          {payouts.map((payout) => (
            <PayoutReceiptCard key={payout.id} payout={payout} />
          ))}
        </div>
      )}
    </main>
  );
}
