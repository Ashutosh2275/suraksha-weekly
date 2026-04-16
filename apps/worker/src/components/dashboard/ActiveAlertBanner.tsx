import { ActiveAlert } from "@/lib/workerApi";

interface ActiveAlertBannerProps {
  alert: ActiveAlert;
}

export function ActiveAlertBanner({ alert }: ActiveAlertBannerProps) {
  if (!alert.isActive) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Active Trigger Alert</p>
      <h3 className="mt-1 text-sm font-semibold text-amber-900">{alert.title}</h3>
      <p className="mt-1 text-sm text-amber-800">{alert.description}</p>
    </section>
  );
}
