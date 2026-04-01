import { TriggerEvent } from "@/lib/adminApi";

interface TriggerFeedProps {
  events: TriggerEvent[];
}

export function TriggerFeed({ events }: TriggerFeedProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-sm font-semibold text-white">Trigger Feed (Live)</h2>
      <ul className="mt-3 space-y-2">
        {events.map((event) => (
          <li key={event.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-200">
            <p className="font-semibold text-white">{event.id} • {event.zone}</p>
            <p>{event.trigger_type} • confidence {(event.confidence * 100).toFixed(1)}%</p>
            <p className="text-slate-400">{new Date(event.occurred_at).toLocaleString()}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
