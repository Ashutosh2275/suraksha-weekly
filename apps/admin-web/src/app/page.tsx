import Link from 'next/link';
import { Card } from '@/components/common/ui/Card';
import { Button } from '@/components/common/ui/Button';
import { StatusPill } from '@/components/common/ui/StatusPill';

export default function AdminDashboard() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6 md:px-6 md:py-8">
      <header className="mb-6 space-y-3">
        <StatusPill label="Operations Control Plane" tone="success" />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-text)]">Suraksha Admin</h1>
          <p className="mt-1 text-sm text-[var(--color-text-soft)]">Mobile-first command center for claims, fraud, trigger events, and audits.</p>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card description="Live underwriting and claims health metrics." title="Dashboard">
          <Link href="/dashboard">
            <Button className="w-full" variant="primary">Open Dashboard</Button>
          </Link>
        </Card>

        <Card description="Fast triage lane for pending manual decisions." title="Review Queue">
          <Link href="/review-queue">
            <Button className="w-full" variant="secondary">Open Queue</Button>
          </Link>
        </Card>

        <Card description="Track active disruptions and trigger health." title="Triggers">
          <Link href="/triggers">
            <Button className="w-full" variant="secondary">Open Triggers</Button>
          </Link>
        </Card>

        <Card description="Monitor clusters and model status for abuse signals." title="Fraud">
          <Link href="/fraud">
            <Button className="w-full" variant="secondary">Open Fraud</Button>
          </Link>
        </Card>

        <Card description="Immutable activity and forensic timeline." title="Audit">
          <Link href="/audit">
            <Button className="w-full" variant="secondary">Open Audit</Button>
          </Link>
        </Card>
      </section>

      <p className="mt-6 text-xs text-[var(--color-text-soft)]">Designed for thumb reach on mobile and high-throughput review on larger screens.</p>
    </main>
  );
}
