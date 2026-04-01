"use client";

import { useEffect, useState } from "react";

import { Skeleton } from "@/components/common/Skeleton";
import { ActiveAlertBanner } from "@/components/dashboard/ActiveAlertBanner";
import { PolicyStatusCard } from "@/components/dashboard/PolicyStatusCard";
import { ProtectedEarningsWidget } from "@/components/dashboard/ProtectedEarningsWidget";
import { QuickRenewButton } from "@/components/dashboard/QuickRenewButton";
import { ActiveAlert, PolicySummary, getActiveAlert, getPolicySummary } from "@/lib/workerApi";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [policy, setPolicy] = useState<PolicySummary | null>(null);
  const [alert, setAlert] = useState<ActiveAlert | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([getPolicySummary(), getActiveAlert()]).then(([policySummary, activeAlert]) => {
      if (!mounted) {
        return;
      }
      setPolicy(policySummary);
      setAlert(activeAlert);
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-md bg-slate-50 px-4 py-6">
      <header className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Worker Dashboard</p>
        <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
      </header>

      {loading || !policy || !alert ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <div className="space-y-3">
          <PolicyStatusCard policy={policy} />
          <ProtectedEarningsWidget amount={policy.weeklyCoverAmount} />
          <ActiveAlertBanner alert={alert} />
          <QuickRenewButton amount={149} policyId={policy.id} />
        </div>
      )}
    </main>
  );
}
