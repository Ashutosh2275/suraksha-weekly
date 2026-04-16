"use client";

import { ReviewQueueItem } from "@/lib/adminApi";

interface QueueTableProps {
  rows: ReviewQueueItem[];
  selectedClaimId: string | null;
  onSelect: (item: ReviewQueueItem) => void;
  now: number;
}

function formatCountdown(deadline: string, now: number): string {
  const diff = new Date(deadline).getTime() - now;
  const sign = diff < 0 ? "-" : "";
  const remaining = Math.abs(diff);
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return `${sign}${minutes}m ${seconds}s`;
}

function scoreClass(score: number): string {
  if (score >= 0.85) return "text-rose-400";
  if (score >= 0.65) return "text-orange-300";
  if (score >= 0.4) return "text-amber-300";
  return "text-emerald-300";
}

export function QueueTable({ rows, selectedClaimId, onSelect, now }: QueueTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
      <table className="min-w-full text-left text-xs">
        <thead className="bg-slate-800/80 text-slate-300">
          <tr>
            <th className="px-3 py-2">claim_id</th>
            <th className="px-3 py-2">worker</th>
            <th className="px-3 py-2">zone</th>
            <th className="px-3 py-2">trigger_type</th>
            <th className="px-3 py-2">fraud_score</th>
            <th className="px-3 py-2">risk_tier</th>
            <th className="px-3 py-2">sla_deadline</th>
            <th className="px-3 py-2">status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const breached = new Date(row.sla_deadline).getTime() < now;
            const isSelected = selectedClaimId === row.claim_id;
            return (
              <tr
                key={row.claim_id}
                className={`cursor-pointer border-t border-slate-800 ${
                  breached ? "bg-rose-950/40" : "bg-slate-900"
                } ${isSelected ? "ring-1 ring-cyan-400" : ""}`}
                onClick={() => onSelect(row)}
              >
                <td className="px-3 py-2 font-semibold text-white">{row.claim_id}</td>
                <td className="px-3 py-2 text-slate-200">{row.worker}</td>
                <td className="px-3 py-2 text-slate-300">{row.zone}</td>
                <td className="px-3 py-2 text-slate-300">{row.trigger_type}</td>
                <td className={`px-3 py-2 font-semibold ${scoreClass(row.fraud_score)}`}>{row.fraud_score.toFixed(2)}</td>
                <td className="px-3 py-2 text-slate-200">{row.risk_tier}</td>
                <td className="px-3 py-2 text-slate-200">{formatCountdown(row.sla_deadline, now)}</td>
                <td className="px-3 py-2 text-slate-200">{row.status}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
