"use client";

import { useState } from "react";

import { ReviewQueueItem, decideClaim } from "@/lib/adminApi";

interface ClaimReviewPanelProps {
  selected: ReviewQueueItem | null;
  onActionDone: () => void;
}

export function ClaimReviewPanel({ selected, onActionDone }: ClaimReviewPanelProps) {
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(decision: "APPROVE" | "REJECT"): Promise<void> {
    if (!selected) return;
    if (!notes.trim()) {
      setError("Notes are mandatory.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await decideClaim(selected.claim_id, decision, notes.trim());
      setNotes("");
      onActionDone();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Action failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <aside className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-sm font-semibold text-white">Claim Review Panel</h2>
      {!selected ? (
        <p className="mt-2 text-xs text-slate-400">Select a queue row to inspect full details.</p>
      ) : (
        <div className="mt-3 space-y-3 text-sm text-slate-200">
          <div>
            <p className="font-semibold text-white">{selected.claim_id}</p>
            <p>{selected.worker} • {selected.zone}</p>
            <p className="text-xs text-slate-400">{selected.detail}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Fraud reason tags</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {selected.reason_tags.map((tag) => (
                <span key={tag} className="rounded-full border border-slate-700 px-2 py-0.5 text-xs text-slate-200">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="review-notes">
              Mandatory notes
            </label>
            <textarea
              id="review-notes"
              className="mt-1 min-h-24 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              onChange={(event) => setNotes(event.target.value)}
              value={notes}
            />
          </div>
          {error ? <p className="text-xs text-rose-300">{error}</p> : null}
          <div className="grid grid-cols-2 gap-2">
            <button
              className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              disabled={submitting}
              onClick={() => void submit("APPROVE")}
              type="button"
            >
              Approve
            </button>
            <button
              className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              disabled={submitting}
              onClick={() => void submit("REJECT")}
              type="button"
            >
              Reject
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
