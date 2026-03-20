'use client';

import { useEffect, useState } from 'react';
import {
  Zap, CloudRain, Thermometer, Wind, AlertOctagon, WifiOff,
  CheckCircle, Clock, XCircle, AlertTriangle, Activity,
  RefreshCw, ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatINR } from '@/lib/utils';
import {
  simulateDisruption, getDemoZones, runE2EHealthCheck,
  getErrorMessage,
  type DemoDisruptionResponse, type DemoDisruptionRequest,
  type TriggerType, type IntensityLevel, type E2EHealthResponse,
} from '@/lib/api';

// ─── Configuration ────────────────────────────────────────────────────────────

const TRIGGER_TYPES: Array<{
  value: TriggerType;
  label: string;
  unit:  string;
  icon:  React.ComponentType<{ className?: string }>;
  color: string;
}> = [
  { value: 'HeavyRain',        label: 'Heavy Rain',        unit: 'mm/hr',    icon: CloudRain,    color: 'text-blue-600' },
  { value: 'ExtremeHeat',      label: 'Extreme Heat',      unit: '°C',       icon: Thermometer,  color: 'text-orange-600' },
  { value: 'SeverePollution',  label: 'Severe Pollution',  unit: 'AQI',      icon: Wind,         color: 'text-purple-600' },
  { value: 'LocalRestriction', label: 'Local Restriction', unit: 'active',   icon: AlertOctagon, color: 'text-red-600' },
  { value: 'PlatformOutage',   label: 'Platform Outage',   unit: 'min down', icon: WifiOff,      color: 'text-slate-600' },
];

const INTENSITIES: Array<{
  value: IntensityLevel;
  label: string;
  description: string;
  color: string;
}> = [
  { value: 'moderate', label: 'Moderate', description: 'Just above threshold — standard payout',  color: 'border-amber-400 bg-amber-50' },
  { value: 'severe',   label: 'Severe',   description: '~2× threshold — elevated claim volume',   color: 'border-orange-500 bg-orange-50' },
  { value: 'extreme',  label: 'Extreme',  description: '~4× threshold — maximum impact scenario', color: 'border-red-600 bg-red-50' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function DemoPage(): React.JSX.Element {
  // ── City / zone data ──────────────────────────────────────────────────────
  const [cityZones, setCityZones] = useState<Record<string, string[]>>({
    Bengaluru:  ['Koramangala', 'Whitefield', 'Indiranagar', 'HSR Layout', 'Electronic City'],
    Mumbai:     ['Andheri', 'Bandra', 'Dadar', 'Lower Parel', 'Powai'],
    Delhi:      ['Connaught Place', 'Noida Sector 18', 'Gurugram', 'Saket', 'Rohini'],
    Hyderabad:  ['Banjara Hills', 'Hitech City', 'Secunderabad', 'Gachibowli', 'Ameerpet'],
    Chennai:    ['Anna Nagar', 'T Nagar', 'Velachery', 'OMR', 'Porur'],
    Pune:       ['Koregaon Park', 'Hadapsar', 'Kharadi', 'Baner', 'Hinjewadi'],
  });

  useEffect(() => {
    getDemoZones()
      .then((r) => setCityZones(r.cities))
      .catch(() => undefined); // fallback to default
  }, []);

  // ── Form state ────────────────────────────────────────────────────────────
  const cities = Object.keys(cityZones);
  const [selectedCity,     setSelectedCity]     = useState<string>('Bengaluru');
  const [selectedZone,     setSelectedZone]     = useState<string>('Koramangala');
  const [selectedTrigger,  setSelectedTrigger]  = useState<TriggerType>('HeavyRain');
  const [selectedIntensity,setSelectedIntensity]= useState<IntensityLevel>('moderate');

  // Keep zone in sync when city changes
  const zones = cityZones[selectedCity] ?? [];
  useEffect(() => {
    if (!zones.includes(selectedZone)) {
      setSelectedZone(zones[0] ?? '');
    }
  }, [selectedCity]);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Simulation state ──────────────────────────────────────────────────────
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<DemoDisruptionResponse | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [history,  setHistory]  = useState<DemoDisruptionResponse[]>([]);

  async function handleSimulate(): Promise<void> {
    setLoading(true);
    setError(null);
    setResult(null);
    const body: DemoDisruptionRequest = {
      trigger_type:    selectedTrigger,
      zone:            selectedZone,
      intensity_level: selectedIntensity,
      city:            selectedCity,
    };
    try {
      const res = await simulateDisruption(body);
      setResult(res);
      setHistory((prev) => [res, ...prev].slice(0, 5));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  // ── E2E health check ──────────────────────────────────────────────────────
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthResult,  setHealthResult]  = useState<E2EHealthResponse | null>(null);

  async function handleE2E(): Promise<void> {
    setHealthLoading(true);
    setHealthResult(null);
    try {
      const res = await runE2EHealthCheck();
      setHealthResult(res);
    } catch (err) {
      setHealthResult({
        status:   'degraded',
        steps:    [{ step: 'request', status: 'failed', latency_ms: 0, detail: getErrorMessage(err) }],
        total_ms: 0,
      });
    } finally {
      setHealthLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-6xl">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-lg bg-amber-100 p-2">
            <Zap className="h-5 w-5 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Demo Control Panel</h1>
          <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
            LIVE
          </span>
        </div>
        <p className="text-slate-500 text-sm max-w-2xl">
          Fire parametric disruption triggers and watch the full claim pipeline execute in real time.
          Results appear in under 2 seconds and are reflected immediately on the worker dashboard.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        {/* ── Left: Controls ───────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Trigger Type */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">1 — Select Trigger Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {TRIGGER_TYPES.map(({ value, label, unit, icon: Icon, color }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSelectedTrigger(value)}
                    className={`flex items-center gap-3 rounded-lg border-2 px-3 py-2.5 text-left text-sm font-medium transition-all ${
                      selectedTrigger === value
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`h-4 w-4 flex-shrink-0 ${color}`} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{label}</p>
                      <p className="text-xs text-slate-400">{unit}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Zone & City */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">2 — Select Zone</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {/* City */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">City</label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {cities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              {/* Zone */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Zone</label>
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {zones.map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Intensity */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">3 — Select Intensity</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              {INTENSITIES.map(({ value, label, description, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelectedIntensity(value)}
                  className={`rounded-lg border-2 p-3 text-left transition-all ${
                    selectedIntensity === value
                      ? color + ' border-current'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <p className="font-semibold text-sm text-slate-800">{label}</p>
                  <p className="mt-1 text-xs text-slate-500 leading-snug">{description}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Fire button */}
          <div className="flex gap-3">
            <Button
              onClick={handleSimulate}
              loading={loading}
              className="flex-1 h-12 text-base font-semibold"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Running pipeline…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Trigger Disruption
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleE2E}
              loading={healthLoading}
              className="h-12 px-4 text-sm"
              title="Run end-to-end pipeline health check"
            >
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline ml-1.5">E2E Check</span>
            </Button>
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Simulation history */}
          {history.length > 0 && (
            <Card className="rounded-xl shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-500 font-medium">Recent Simulations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-700">{h.trigger_type}</span>
                      <ChevronRight className="h-3 w-3 text-slate-400" />
                      <span className="text-slate-500">{h.zone}</span>
                      <Badge variant={h.intensity_level === 'extreme' ? 'destructive' : h.intensity_level === 'severe' ? 'orange' : 'warning'} className="text-[10px] px-1 py-0">
                        {h.intensity_level}
                      </Badge>
                    </div>
                    <div className="text-right text-slate-500">
                      {h.claims_initiated} claims · {h.orchestration_ms}ms
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right: Results ───────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Result card */}
          {result ? (
            <ResultCard result={result} />
          ) : (
            <Card className="rounded-xl shadow-sm border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Zap className="mb-3 h-8 w-8 text-slate-300" />
                <p className="font-medium text-slate-500">No simulation run yet</p>
                <p className="mt-1 text-xs text-slate-400">
                  Select a trigger type, zone and intensity, then click &quot;Trigger Disruption&quot;
                </p>
              </CardContent>
            </Card>
          )}

          {/* E2E health check results */}
          {healthResult && <HealthCheckCard result={healthResult} />}
        </div>
      </div>
    </div>
  );
}

// ─── Result Card ──────────────────────────────────────────────────────────────

function ResultCard({ result }: { result: DemoDisruptionResponse }): React.JSX.Element {
  const allAutoApproved =
    result.claims_initiated > 0 && result.claims_auto_approved === result.claims_initiated;

  return (
    <Card className={`rounded-xl shadow-sm border-2 ${allAutoApproved ? 'border-green-400' : 'border-indigo-300'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-slate-900">
            Simulation Result
          </CardTitle>
          <Badge
            variant={allAutoApproved ? 'success' : result.claims_flagged > 0 ? 'warning' : 'default'}
          >
            {allAutoApproved ? 'All Approved' : result.claims_flagged > 0 ? 'Flagged' : 'Processed'}
          </Badge>
        </div>
        <CardDescription>
          {result.trigger_type} · {result.zone}, {result.city} · {result.intensity_level}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* KPI row */}
        <div className="grid grid-cols-2 gap-3">
          <KpiBox
            label="Claims Initiated"
            value={String(result.claims_initiated)}
            sub="workers affected"
            color="text-slate-900"
          />
          <KpiBox
            label="Auto-Approved"
            value={String(result.claims_auto_approved)}
            sub="instant payout"
            color="text-green-700"
          />
          <KpiBox
            label="Flagged"
            value={String(result.claims_flagged)}
            sub="fraud review"
            color="text-amber-700"
          />
          <KpiBox
            label="Total Payout"
            value={formatINR(result.total_payout_initiated)}
            sub="initiated"
            color="text-indigo-700"
          />
        </div>

        {/* Trigger details */}
        <div className="rounded-lg bg-slate-50 p-3 space-y-1.5 text-sm">
          <Row label="Trigger ID"       value={result.trigger_id.slice(0, 16) + '…'} />
          <Row label="Measured value"   value={`${result.measured_value} (threshold: ${result.threshold_value})`} />
          <Row label="Confidence"       value={`${(result.confidence_score * 100).toFixed(0)}%`} />
          <Row label="Orchestration"    value={`${result.orchestration_ms} ms`} />
          <Row label="Triggered at"     value={new Date(result.triggered_at).toLocaleTimeString()} />
        </div>

        {/* Breakdown bar */}
        {result.claims_initiated > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-500">Claim Status Breakdown</p>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
              {result.breakdown.auto_approved > 0 && (
                <div
                  className="bg-green-500 transition-all"
                  style={{ width: `${(result.breakdown.auto_approved / result.claims_initiated) * 100}%` }}
                />
              )}
              {result.breakdown.in_review > 0 && (
                <div
                  className="bg-amber-400 transition-all"
                  style={{ width: `${(result.breakdown.in_review / result.claims_initiated) * 100}%` }}
                />
              )}
              {result.breakdown.blocked > 0 && (
                <div
                  className="bg-red-500 transition-all"
                  style={{ width: `${(result.breakdown.blocked / result.claims_initiated) * 100}%` }}
                />
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
              {result.breakdown.auto_approved > 0 && <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-green-500" />{result.breakdown.auto_approved} approved</span>}
              {result.breakdown.in_review > 0 && <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-amber-400" />{result.breakdown.in_review} in review</span>}
              {result.breakdown.blocked > 0 && <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-red-500" />{result.breakdown.blocked} blocked</span>}
            </div>
          </div>
        )}

        {result.claims_initiated === 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            <p className="font-medium">No claims created</p>
            <p className="text-xs mt-0.5">
              No active policies found in zone &quot;{result.zone}&quot;. Run{' '}
              <code className="rounded bg-amber-100 px-1">python scripts/demo_reset.py</code>
              {' '}to seed demo data.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Health Check Card ────────────────────────────────────────────────────────

function HealthCheckCard({ result }: { result: E2EHealthResponse }): React.JSX.Element {
  return (
    <Card className={`rounded-xl shadow-sm border-2 ${result.status === 'healthy' ? 'border-green-400' : 'border-red-400'}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Pipeline Health Check</CardTitle>
          <Badge variant={result.status === 'healthy' ? 'success' : 'destructive'}>
            {result.status === 'healthy' ? '✓ Healthy' : '✗ Degraded'}
          </Badge>
        </div>
        <CardDescription>E2E in {result.total_ms}ms</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-1.5">
          {result.steps.map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-xs">
              {step.status === 'ok' ? (
                <CheckCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-green-500" />
              ) : step.status === 'failed' ? (
                <XCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-red-500" />
              ) : (
                <Clock className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-slate-300" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className={`font-medium ${step.status === 'failed' ? 'text-red-700' : step.status === 'ok' ? 'text-slate-700' : 'text-slate-400'}`}>
                    {step.step.replace(/_/g, ' ')}
                  </span>
                  <span className="text-slate-400 shrink-0">{step.latency_ms}ms</span>
                </div>
                {step.detail && (
                  <p className="text-slate-400 truncate">{step.detail}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function KpiBox({
  label, value, sub, color,
}: {
  label: string; value: string; sub: string; color: string;
}): React.JSX.Element {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-0.5 text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[11px] text-slate-400">{sub}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="font-medium text-slate-800 text-right truncate">{value}</span>
    </div>
  );
}
