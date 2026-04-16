"use client";

import { useState } from "react";

import { PayoutItem } from "@/lib/workerApi";

interface PayoutReceiptCardProps {
  payout: PayoutItem;
}

export function PayoutReceiptCard({ payout }: PayoutReceiptCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">₹{payout.amount.toLocaleString("en-IN")}</p>
          <p className="text-xs text-slate-500">{payout.date}</p>
        </div>
        <button className="rounded-lg border border-slate-200 px-3 py-1 text-xs" onClick={() => setOpen((prev) => !prev)} type="button">
          {open ? "Hide Receipt" : "View Receipt"}
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-600">Ref: {payout.gatewayReference}</p>

      {open ? (
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
          <p>
            <span className="font-medium text-slate-900">Method:</span> {payout.method}
          </p>
          <p>
            <span className="font-medium text-slate-900">Gateway Ref:</span> {payout.gatewayReference}
          </p>
          <p>
            <span className="font-medium text-slate-900">Status note:</span> {payout.note}
          </p>
        </div>
      ) : null}
    </article>
  );
}
