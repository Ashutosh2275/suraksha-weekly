"use client";

import { PageShell } from "@/components/common/PageShell";
import { Skeleton } from "@/components/common/Skeleton";
import { AuditLogExplorer } from "@/components/audit/AuditLogExplorer";
import { fetchAuditLogs } from "@/lib/adminApi";
import { usePolling } from "@/lib/usePolling";

export default function AuditPage() {
  const { data, error, isLoading } = usePolling(fetchAuditLogs, 30000);

  return (
    <PageShell subtitle="Track privileged actions and policy mutations with searchable audit events." title="Audit Explorer">
      {isLoading && <Skeleton className="h-56" />}
      {error && <p className="rounded-xl border border-rose-500/50 bg-rose-950/20 p-3 text-sm text-rose-200">{error}</p>}
      {data && <AuditLogExplorer rows={data} />}
    </PageShell>
  );
}
