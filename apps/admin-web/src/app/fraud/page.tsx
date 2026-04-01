"use client";

import { PageShell } from "@/components/common/PageShell";
import { Skeleton } from "@/components/common/Skeleton";
import { FraudScoreDistribution } from "@/components/fraud/FraudScoreDistribution";
import { SuspiciousClusterTable } from "@/components/fraud/SuspiciousClusterTable";
import { TopRuleTriggers } from "@/components/fraud/TopRuleTriggers";
import { fetchFraudScores, fetchSuspiciousClusters, fetchTopRuleTriggers } from "@/lib/adminApi";
import { usePolling } from "@/lib/usePolling";

export default function FraudPage() {
  const { data: scores, error: scoreError, isLoading: scoresLoading } = usePolling(fetchFraudScores, 30000);
  const { data: topRules, error: ruleError, isLoading: rulesLoading } = usePolling(fetchTopRuleTriggers, 30000);
  const { data: clusters, error: clusterError, isLoading: clustersLoading } = usePolling(fetchSuspiciousClusters, 30000);
  const isLoading = scoresLoading || rulesLoading || clustersLoading;
  const error = scoreError ?? ruleError ?? clusterError;

  return (
    <PageShell subtitle="Fraud analytics to monitor model behavior and networked abuse patterns." title="Fraud Monitor">
      {isLoading && <Skeleton className="h-56" />}
      {error && <p className="rounded-xl border border-rose-500/50 bg-rose-950/20 p-3 text-sm text-rose-200">{error}</p>}
      {scores && topRules && clusters && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <FraudScoreDistribution scores={scores} />
            <TopRuleTriggers metrics={topRules} />
          </div>
          <SuspiciousClusterTable clusters={clusters} />
        </div>
      )}
    </PageShell>
  );
}
