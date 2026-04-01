"use client";

import { useEffect, useMemo, useState } from "react";

import { PageShell } from "@/components/common/PageShell";
import { Skeleton } from "@/components/common/Skeleton";
import { ClaimReviewPanel } from "@/components/review-queue/ClaimReviewPanel";
import { QueueTable } from "@/components/review-queue/QueueTable";
import { ReviewQueueItem, fetchReviewQueue } from "@/lib/adminApi";
import { usePolling } from "@/lib/usePolling";

export default function ReviewQueuePage() {
  const { data, error, isLoading, refresh } = usePolling(fetchReviewQueue, 30000);
  const [selected, setSelected] = useState<ReviewQueueItem | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const summary = useMemo(() => {
    if (!data) {
      return { total: 0, breached: 0, highRisk: 0 };
    }
    const now = Date.now();
    return {
      total: data.length,
      breached: data.filter((item) => new Date(item.sla_deadline).getTime() < now).length,
      highRisk: data.filter((item) => item.fraud_score >= 0.7).length,
    };
  }, [data]);

  return (
    <PageShell subtitle="Live triage queue with SLA countdown and fraud risk indicators." title="Review Queue">
      {isLoading && <Skeleton className="h-56" />}
      {error && <p className="rounded-xl border border-rose-500/50 bg-rose-950/20 p-3 text-sm text-rose-200">{error}</p>}
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-slate-300">
              <p className="text-slate-400">Queue Size</p>
              <p className="text-xl font-semibold text-white">{summary.total}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-slate-300">
              <p className="text-slate-400">SLA Breached</p>
              <p className="text-xl font-semibold text-rose-300">{summary.breached}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-slate-300">
              <p className="text-slate-400">High Risk</p>
              <p className="text-xl font-semibold text-amber-300">{summary.highRisk}</p>
            </div>
          </div>
          <QueueTable now={now} onSelect={setSelected} rows={data ?? []} selectedClaimId={selected?.claim_id ?? null} />
        </div>
        <ClaimReviewPanel onActionDone={() => void refresh()} selected={selected} />
      </div>
    </PageShell>
  );
}
