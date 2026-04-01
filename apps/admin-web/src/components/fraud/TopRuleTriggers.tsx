"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { FraudRuleMetric } from "@/lib/adminApi";

interface TopRuleTriggersProps {
  metrics: FraudRuleMetric[];
}

export function TopRuleTriggers({ metrics }: TopRuleTriggersProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-sm font-semibold text-white">Top Rule Triggers</h2>
      <div className="mt-3 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={metrics} layout="vertical">
            <XAxis tick={{ fill: "#cbd5e1", fontSize: 11 }} type="number" />
            <YAxis dataKey="rule" tick={{ fill: "#cbd5e1", fontSize: 11 }} type="category" width={130} />
            <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }} />
            <Bar dataKey="count" fill="#22c55e" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
