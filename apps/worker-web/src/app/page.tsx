import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-md bg-slate-50 px-4 py-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Suraksha Weekly</p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900">Worker Web</h1>
      <p className="mt-2 text-sm text-slate-600">AI Parametric Income Shield for gig delivery partners.</p>

      <div className="mt-6 space-y-3">
        <Link className="block rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white" href="/onboarding">
          Start Onboarding
        </Link>
        <Link className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800" href="/dashboard">
          Open Dashboard
        </Link>
        <Link className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800" href="/claims">
          View Claims
        </Link>
        <Link className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800" href="/payouts">
          View Payouts
        </Link>
      </div>
    </main>
  );
}
