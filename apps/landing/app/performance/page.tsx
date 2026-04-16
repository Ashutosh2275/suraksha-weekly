'use client';

import Link from 'next/link';
import { PerformanceVerification } from '@/components/performance-verification';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield } from 'lucide-react';
import { PageErrorBoundary } from '@/components/error-boundary';

export default function PerformancePage() {
  return (
    <PageErrorBoundary>
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <nav className="bg-white border-b border-slate-200 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-indigo-600" />
                <span className="font-bold text-slate-900">Suraksha Weekly</span>
              </div>
              <span className="text-slate-400">•</span>
              <span className="text-sm text-slate-600">Performance Verification</span>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Home
              </Link>
            </Button>
          </div>
        </nav>

        {/* Main Content */}
        <main className="py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                System Performance Verification
              </h1>
              <p className="text-slate-600 max-w-2xl mx-auto">
                Monitor and verify the health and performance of API endpoints.
                This tool tests response times, success rates, and overall system reliability.
              </p>
            </div>

            <PerformanceVerification />

            {/* Footer Note */}
            <div className="mt-8 text-center">
              <p className="text-xs text-slate-500">
                Performance verification runs automated tests against health endpoints.
                Use this tool to ensure system reliability before production deployments.
              </p>
            </div>
          </div>
        </main>
      </div>
    </PageErrorBoundary>
  );
}