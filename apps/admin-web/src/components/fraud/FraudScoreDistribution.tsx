"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface FraudScoreDistributionProps {
  scores: number[];
}

export function FraudScoreDistribution({ scores }: FraudScoreDistributionProps) {
  const bins = [0, 0, 0, 0, 0];
  scores.forEach((score) => {
    const idx = Math.min(4, Math.floor(score * 5));
    bins[idx] += 1;
  });

  const data = [
    { range: "0.0-0.2", count: bins[0] },
    { range: "0.2-0.4", count: bins[1] },
    { range: "0.4-0.6", count: bins[2] },
    { range: "0.6-0.8", count: bins[3] },
    { range: "0.8-1.0", count: bins[4] },
  ];

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-sm font-semibold text-white">Fraud Score Distribution</h2>
      <div className="mt-3 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="range" tick={{ fill: "#cbd5e1", fontSize: 11 }} />
            <YAxis tick={{ fill: "#cbd5e1", fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }} />
            <Bar dataKey="count" fill="#38bdf8" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
