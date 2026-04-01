"use client";

import { AutoApprovalRate } from "@/components/dashboard/AutoApprovalRate";
import { ClaimIncidenceBand } from "@/components/dashboard/ClaimIncidenceBand";
import { KPIGrid } from "@/components/dashboard/KPIGrid";
import { LossRatioTrend } from "@/components/dashboard/LossRatioTrend";
import { PageShell } from "@/components/common/PageShell";
import { Skeleton } from "@/components/common/Skeleton";
import { fetchKpis, fetchLossRatioTrend } from "@/lib/adminApi";
import { usePolling } from "@/lib/usePolling";

export default function DashboardPage() {
  const { data: kpis, error: kpiError, isLoading: kpisLoading } = usePolling(fetchKpis, 30000);
  const { data: trend, error: trendError, isLoading: trendLoading } = usePolling(fetchLossRatioTrend, 30000);
  const isLoading = kpisLoading || trendLoading;
  const error = kpiError ?? trendError;

  return (
    <PageShell subtitle="Underwriting and claims health with live KPI snapshots." title="Admin Dashboard">
      {isLoading && (
        <div className="grid gap-3 md:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      )}
      {error && <p className="rounded-xl border border-rose-500/50 bg-rose-950/20 p-3 text-sm text-rose-200">{error}</p>}
      {kpis && trend && (
        <div className="space-y-4">
          <KPIGrid kpis={kpis} />
          <div className="grid gap-4 lg:grid-cols-2">
            <ClaimIncidenceBand incidenceRate={kpis.claim_incidence_rate} />
            <LossRatioTrend data={trend} />
          </div>
          <AutoApprovalRate rate={kpis.auto_approval_rate} />
        </div>
      )}
    </PageShell>
  );
}
