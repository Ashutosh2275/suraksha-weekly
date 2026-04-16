"use client";

import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";

interface AutoApprovalRateProps {
  rate: number;
}

export function AutoApprovalRate({ rate }: AutoApprovalRateProps) {
  const clampedRate = Math.max(0, Math.min(100, rate));
  const data = [{ name: "autoApproval", value: clampedRate, fill: clampedRate >= 80 ? "#22c55e" : "#f59e0b" }];

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-sm font-semibold text-white">Auto Approval Rate</h2>
      <p className="text-xs text-slate-400">Target ≥ 80%</p>
      <div className="mt-3 h-44">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="50%" data={data} endAngle={90} innerRadius="55%" outerRadius="100%" startAngle={180}>
            <PolarAngleAxis domain={[0, 100]} tick={false} type="number" />
            <RadialBar background dataKey="value" />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <p className="-mt-3 text-center text-2xl font-semibold text-white">{clampedRate.toFixed(1)}%</p>
    </section>
  );
}
