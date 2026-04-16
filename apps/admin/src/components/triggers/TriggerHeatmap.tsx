import { TriggerEvent } from "@/lib/adminApi";

interface TriggerHeatmapProps {
  events: TriggerEvent[];
}

function intensityClass(activeCount: number): string {
  if (activeCount >= 6) return "bg-rose-500/70";
  if (activeCount >= 4) return "bg-orange-500/70";
  if (activeCount >= 2) return "bg-amber-500/70";
  return "bg-emerald-500/60";
}

export function TriggerHeatmap({ events }: TriggerHeatmapProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-sm font-semibold text-white">Trigger Heatmap</h2>
      <p className="text-xs text-slate-400">City zone intensity by active trigger count</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {events.map((event) => (
          <article key={event.id} className={`rounded-xl p-3 ${intensityClass(event.active_count)}`}>
            <p className="text-xs font-semibold text-white">{event.zone}</p>
            <p className="text-xs text-white/90">{event.city}</p>
            <p className="mt-1 text-[11px] text-white/90">{event.trigger_type}</p>
            <p className="text-[11px] text-white/90">Active: {event.active_count}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
