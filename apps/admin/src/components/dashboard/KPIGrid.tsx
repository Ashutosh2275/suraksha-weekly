import { KpiSummary } from "@/lib/adminApi";

interface KPIGridProps {
  kpis: KpiSummary;
}

export function KPIGrid({ kpis }: KPIGridProps) {
  const cards = [
    { label: "Active Policies", value: kpis.active_policies.toLocaleString("en-IN") },
    { label: "Claims Today", value: kpis.claims_today.toLocaleString("en-IN") },
    { label: "Fraud Flags Today", value: kpis.fraud_flags_today.toLocaleString("en-IN") },
    { label: "Payout Total Today", value: `₹${kpis.payout_total_today.toLocaleString("en-IN")}` },
    { label: "Claim Incidence Rate", value: `${kpis.claim_incidence_rate.toFixed(1)}%`, helper: "Target 10-18%" },
    { label: "Fraud Leakage", value: `${kpis.fraud_leakage.toFixed(1)}%`, helper: "Target 0%" },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <article key={card.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">{card.label}</p>
          <p className="mt-1 text-2xl font-semibold text-white">{card.value}</p>
          {card.helper ? <p className="mt-1 text-xs text-cyan-300">{card.helper}</p> : null}
        </article>
      ))}
    </section>
  );
}
