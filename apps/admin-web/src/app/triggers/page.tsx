"use client";

import { PageShell } from "@/components/common/PageShell";
import { Skeleton } from "@/components/common/Skeleton";
import { ManualRestrictionToggle } from "@/components/triggers/ManualRestrictionToggle";
import { TriggerFeed } from "@/components/triggers/TriggerFeed";
import { TriggerHeatmap } from "@/components/triggers/TriggerHeatmap";
import { fetchTriggerFeed } from "@/lib/adminApi";
import { usePolling } from "@/lib/usePolling";

export default function TriggersPage() {
  const { data, error, isLoading } = usePolling(fetchTriggerFeed, 30000);

  return (
    <PageShell subtitle="Operational trigger visibility with event heatmap and analyst controls." title="Triggers">
      {isLoading && <Skeleton className="h-56" />}
      {error && <p className="rounded-xl border border-rose-500/50 bg-rose-950/20 p-3 text-sm text-rose-200">{error}</p>}
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <TriggerHeatmap events={data ?? []} />
          <ManualRestrictionToggle />
        </div>
        <TriggerFeed events={data ?? []} />
      </div>
    </PageShell>
  );
}
