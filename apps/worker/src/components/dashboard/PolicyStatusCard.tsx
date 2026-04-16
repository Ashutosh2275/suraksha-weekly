import { StatusBadge } from "@/components/common/StatusBadge";
import { PolicySummary } from "@/lib/workerApi";

interface PolicyStatusCardProps {
  policy: PolicySummary;
}

export function PolicyStatusCard({ policy }: PolicyStatusCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Policy Status</h2>
        <StatusBadge status={policy.status} />
      </div>
      <div className="space-y-2 text-sm text-slate-600">
        <p>
          Coverage: <span className="font-medium text-slate-900">{policy.coverageStart}</span> to{" "}
          <span className="font-medium text-slate-900">{policy.coverageEnd}</span>
        </p>
        <p>
          Zone coverage: <span className="font-medium text-slate-900">{policy.zoneCoverage.join(", ")}</span>
        </p>
      </div>
    </section>
  );
}
