"use client";

import { Bar, BarChart, ReferenceArea, ResponsiveContainer, XAxis, YAxis } from "recharts";

interface ClaimIncidenceBandProps {
  incidenceRate: number;
}

export function ClaimIncidenceBand({ incidenceRate }: ClaimIncidenceBandProps) {
  const data = [{ name: "Incidence", value: incidenceRate }];

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-sm font-semibold text-white">Claim Incidence vs Target Band</h2>
      <p className="text-xs text-slate-400">Target band: 10-18%</p>
      <div className="mt-3 h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 10 }}>
            <ReferenceArea x1={10} x2={18} fill="#0ea5e9" fillOpacity={0.18} />
            <XAxis domain={[0, 30]} tick={{ fill: "#cbd5e1", fontSize: 12 }} type="number" unit="%" />
            <YAxis dataKey="name" tick={{ fill: "#cbd5e1", fontSize: 12 }} type="category" width={90} />
            <Bar dataKey="value" fill="#22d3ee" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
