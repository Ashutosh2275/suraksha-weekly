interface ProtectedEarningsWidgetProps {
  amount: number;
}

export function ProtectedEarningsWidget({ amount }: ProtectedEarningsWidgetProps) {
  return (
    <section className="rounded-2xl bg-slate-900 p-4 text-white shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-300">Protected Earnings</p>
      <p className="mt-2 text-xl font-semibold leading-tight">This week you are covered for up to ₹{amount.toLocaleString("en-IN")}</p>
    </section>
  );
}
