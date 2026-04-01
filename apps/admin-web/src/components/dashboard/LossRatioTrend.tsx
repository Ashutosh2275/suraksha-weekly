"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface LossRatioTrendProps {
  data: Array<{ week: string; ratio: number }>;
}

export function LossRatioTrend({ data }: LossRatioTrendProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-sm font-semibold text-white">Loss Ratio Trend (Last 7 Weeks)</h2>
      <div className="mt-3 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="week" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
            <YAxis tick={{ fill: "#cbd5e1", fontSize: 12 }} unit="%" />
            <Tooltip
              contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#fff" }}
              formatter={(value) => [`${value}%`, "Loss Ratio"]}
            />
            <Line dataKey="ratio" stroke="#34d399" strokeWidth={3} type="monotone" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
