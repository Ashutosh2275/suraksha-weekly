import { SuspiciousCluster } from "@/lib/adminApi";

interface SuspiciousClusterTableProps {
  clusters: SuspiciousCluster[];
}

export function SuspiciousClusterTable({ clusters }: SuspiciousClusterTableProps) {
  return (
    <section className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <h2 className="mb-3 text-sm font-semibold text-white">Suspicious Cluster Table</h2>
      <table className="min-w-full text-left text-xs text-slate-200">
        <thead>
          <tr className="border-b border-slate-800 text-slate-400">
            <th className="px-2 py-2">cluster_id</th>
            <th className="px-2 py-2">workers</th>
            <th className="px-2 py-2">shared_device</th>
            <th className="px-2 py-2">shared_handle</th>
            <th className="px-2 py-2">risk_score</th>
          </tr>
        </thead>
        <tbody>
          {clusters.map((cluster) => (
            <tr key={cluster.cluster_id} className="border-b border-slate-800/70">
              <td className="px-2 py-2 font-semibold text-white">{cluster.cluster_id}</td>
              <td className="px-2 py-2">{cluster.workers.join(", ")}</td>
              <td className="px-2 py-2">{cluster.shared_device}</td>
              <td className="px-2 py-2">{cluster.shared_handle}</td>
              <td className="px-2 py-2">{cluster.risk_score.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
