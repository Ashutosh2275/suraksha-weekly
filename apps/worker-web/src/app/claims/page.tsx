"use client";

import { useEffect, useState } from "react";

import { Skeleton } from "@/components/common/Skeleton";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ClaimDetailDrawer } from "@/components/claims/ClaimDetailDrawer";
import { ClaimItem, getClaims } from "@/lib/workerApi";

export default function ClaimsPage() {
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<ClaimItem[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<ClaimItem | null>(null);

  useEffect(() => {
    getClaims().then((result) => {
      setClaims(result);
      setLoading(false);
    });
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-md bg-slate-50 px-4 py-6">
      <header className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Claims</p>
        <h1 className="text-2xl font-semibold text-slate-900">Claim history</h1>
      </header>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : claims.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
          <p className="font-medium text-slate-900">No claims yet</p>
          <p className="mt-2">
            Parametric claims are triggered automatically when verified disruption conditions match your policy terms. You usually do not need to upload documents.
          </p>
        </section>
      ) : (
        <ul className="space-y-3">
          {claims.map((claim) => (
            <li key={claim.id}>
              <button
                className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm"
                onClick={() => setSelectedClaim(claim)}
                type="button"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{claim.id}</p>
                    <p className="text-xs text-slate-500">Submitted {claim.submittedAt}</p>
                  </div>
                  <StatusBadge status={claim.status} />
                </div>
                <p className="mt-2 text-sm text-slate-700">Payout: ₹{claim.payoutAmount.toLocaleString("en-IN")}</p>
              </button>
            </li>
          ))}
        </ul>
      )}

      <ClaimDetailDrawer claim={selectedClaim} onClose={() => setSelectedClaim(null)} />
    </main>
  );
}
