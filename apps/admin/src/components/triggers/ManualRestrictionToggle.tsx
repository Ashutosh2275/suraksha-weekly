"use client";

import { useState } from "react";

import { toggleManualRestriction } from "@/lib/adminApi";

const zones = ["BLR-North", "BLR-East", "MUM-West", "CHE-South"];

export function ManualRestrictionToggle() {
  const [zone, setZone] = useState(zones[0]);
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function submit(): Promise<void> {
    setStatus(null);
    try {
      await toggleManualRestriction(zone, active);
      setStatus(`LOCAL_RESTRICTION ${active ? "activated" : "deactivated"} for ${zone}`);
    } catch {
      setStatus("Could not update manual restriction");
    }
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-sm font-semibold text-white">ManualRestrictionToggle</h2>
      <p className="text-xs text-slate-400">RISK_ADMIN override for LOCAL_RESTRICTION trigger</p>
      <div className="mt-3 space-y-2 text-sm">
        <select className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" onChange={(event) => setZone(event.target.value)} value={zone}>
          {zones.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-slate-200">
          <input checked={active} onChange={(event) => setActive(event.target.checked)} type="checkbox" />
          Activate restriction
        </label>
        <button className="w-full rounded-xl bg-cyan-600 px-3 py-2 font-semibold text-white" onClick={() => void submit()} type="button">
          Update Restriction
        </button>
        {status ? <p className="text-xs text-slate-300">{status}</p> : null}
      </div>
    </section>
  );
}
