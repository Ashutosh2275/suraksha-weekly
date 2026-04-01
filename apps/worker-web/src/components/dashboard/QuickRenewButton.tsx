"use client";

import { useState } from "react";

import { renewPolicy } from "@/lib/workerApi";

interface QuickRenewButtonProps {
  policyId: string;
  amount: number;
}

export function QuickRenewButton({ policyId, amount }: QuickRenewButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function confirmRenew(): Promise<void> {
    setLoading(true);
    setMessage(null);
    try {
      const result = await renewPolicy(policyId);
      setMessage(`Renewal submitted: ${result.status}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not renew policy");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
        onClick={() => setOpen(true)}
        type="button"
      >
        Renew in 1 Tap
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">Confirm Renewal</h3>
            <p className="mt-2 text-sm text-slate-600">You will be charged ₹{amount.toLocaleString("en-IN")} for the next weekly cover.</p>
            {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}
            <div className="mt-4 flex gap-2">
              <button className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" onClick={() => setOpen(false)} type="button">
                Close
              </button>
              <button
                className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                disabled={loading}
                onClick={confirmRenew}
                type="button"
              >
                {loading ? "Renewing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
