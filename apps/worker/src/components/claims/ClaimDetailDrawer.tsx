"use client";

import { ClaimItem } from "@/lib/workerApi";
import { StatusBadge } from "@/components/common/StatusBadge";

interface ClaimDetailDrawerProps {
  claim: ClaimItem | null;
  onClose: () => void;
}

export function ClaimDetailDrawer({ claim, onClose }: ClaimDetailDrawerProps) {
  return (
    <div className={`fixed inset-0 z-50 ${claim ? "pointer-events-auto" : "pointer-events-none"}`}>
      <div
        aria-hidden
        className={`absolute inset-0 bg-black/30 transition ${claim ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-sm bg-white p-4 shadow-2xl transition-transform ${
          claim ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {claim ? (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Claim {claim.id}</h3>
              <StatusBadge status={claim.status} />
            </div>
            <dl className="space-y-3 text-sm text-slate-700">
              <div>
                <dt className="font-medium text-slate-900">Trigger event</dt>
                <dd>{claim.triggerType}</dd>
                <dd className="text-xs text-slate-500">{claim.triggerWindow}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-900">Payout amount</dt>
                <dd>₹{claim.payoutAmount.toLocaleString("en-IN")}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-900">Decision trace (plain language)</dt>
                <dd>{claim.decisionTrace}</dd>
              </div>
            </dl>
            <button className="mt-6 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" onClick={onClose} type="button">
              Close
            </button>
          </>
        ) : null}
      </aside>
    </div>
  );
}
