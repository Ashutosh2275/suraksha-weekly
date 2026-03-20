"use client";

/**
 * Insurance Economics Simulation Dashboard — Suraksha Admin (PRD §44)
 *
 * Stress-test portfolio financial metrics under catastrophic event scenarios.
 */

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CheckCircle,
  Download,
  Play,
  TrendingUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// ── Types ─────────────────────────────────────────────────────────────────

interface WeeklyBreakdown {
  week: number;
  claims_count: number;
  claims_cost_inr: number;
  premium_earned_inr: number;
  loss_ratio_pct: number;
  combined_ratio_pct: number;
  triggers_fired: string[];
}

interface CitySegment {
  city: string;
  loss_ratio_pct: number;
  combined_ratio_pct: number;
  contribution_margin_pct: number;
  stop_expand_flag: boolean;
  stop_expand_reason: string | null;
  exposure_at_risk_inr?: number;
}

interface SimulationResult {
  scenario_name: string;
  inputs: Record<string, number | string>;
  gross_loss_ratio_pct: number;
  combined_ratio_pct: number;
  contribution_margin_pct: number;
  required_premium_adjustment_pct: number;
  exposure_at_risk_inr: number;
  weekly_breakdown: WeeklyBreakdown[];
  city_segment_breakdown: CitySegment[];
  is_sustainable: boolean;
  sustainability_issues: string[];
  simulation_timestamp: string;
  cache_key: string;
}

interface HistoryItem {
  scenario: string;
  timestamp: string;
  cache_key: string;
}

// ── Scenarios ─────────────────────────────────────────────────────────────

const SCENARIOS = [
  {
    value: "monsoon_stress",
    label: "Monsoon Stress Test",
    description: "3-month monsoon with 60% HeavyRain frequency",
  },
  {
    value: "aqi_season_stress",
    label: "AQI Season Stress",
    description: "8-week pollution season (40% frequency)",
  },
  {
    value: "extreme_heatwave",
    label: "Extreme Heatwave",
    description: "6-week heatwave (50% ExtremeHeat frequency)",
  },
  {
    value: "civic_lockdown",
    label: "Civic Lockdown",
    description: "2-week city lockdown (80% LocalRestriction)",
  },
  { value: "custom", label: "Custom Scenario", description: "Configure parameters manually" },
];

// ── Main Component ────────────────────────────────────────────────────────

export default function SimulationPage() {
  const [selectedScenario, setSelectedScenario] = useState<string>("monsoon_stress");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Custom parameters (for "custom" scenario)
  const [claimFrequency, setClaimFrequency] = useState(0.14);
  const [avgSeverity, setAvgSeverity] = useState(350);
  const [weeks, setWeeks] = useState(6);
  const [policyCount, setPolicyCount] = useState(1000);

  // Load history from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("simulation_history");
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  const runSimulation = async () => {
    setIsLoading(true);

    try {
      let overridesParam = "";
      if (selectedScenario === "custom") {
        const overrides = {
          claim_frequency_per_week: claimFrequency,
          avg_claim_severity_inr: { HeavyRain: avgSeverity },
          weeks,
          active_policy_count: policyCount,
        };
        overridesParam = `&overrides=${encodeURIComponent(JSON.stringify(overrides))}`;
      }

      const response = await fetch(
        `/api/v1/admin/simulation/run?scenario=${selectedScenario}${overridesParam}`,
        {
          headers: {
            "X-Admin-Token": process.env.NEXT_PUBLIC_ADMIN_TOKEN || "",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: SimulationResult = await response.json();
      setResult(data);

      // Add to history
      const newItem: HistoryItem = {
        scenario: selectedScenario,
        timestamp: data.simulation_timestamp,
        cache_key: data.cache_key,
      };
      const updatedHistory = [newItem, ...history].slice(0, 5);
      setHistory(updatedHistory);
      localStorage.setItem("simulation_history", JSON.stringify(updatedHistory));
    } catch (error) {
      console.error("[simulation] Error running simulation:", error);
      alert("Failed to run simulation. Check console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  const exportReport = () => {
    if (!result) return;

    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `simulation_${result.scenario_name}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadHistoryItem = async (item: HistoryItem) => {
    // Reload cached result
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/v1/admin/simulation/run?scenario=${item.scenario}`,
        {
          headers: {
            "X-Admin-Token": process.env.NEXT_PUBLIC_ADMIN_TOKEN || "",
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setResult(data);
        setSelectedScenario(item.scenario);
      }
    } catch (error) {
      console.error("[simulation] Error loading history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Insurance Economics Simulation</h1>
        <p className="text-muted-foreground mt-2">
          Stress-test portfolio under catastrophic event scenarios
        </p>
      </div>

      {/* History Panel */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Simulations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {history.map((item, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => loadHistoryItem(item)}
                >
                  {SCENARIOS.find((s) => s.value === item.scenario)?.label || item.scenario}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scenario Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Scenario Configuration</CardTitle>
          <CardDescription>Select a preset or configure custom parameters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="scenario">Scenario</Label>
            <Select value={selectedScenario} onValueChange={setSelectedScenario}>
              <SelectTrigger id="scenario">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCENARIOS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <div>
                      <div className="font-medium">{s.label}</div>
                      <div className="text-xs text-muted-foreground">{s.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedScenario === "custom" && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Claim Frequency: {(claimFrequency * 100).toFixed(0)}%</Label>
                <Slider
                  value={[claimFrequency]}
                  onValueChange={([v]) => setClaimFrequency(v)}
                  min={0.05}
                  max={0.6}
                  step={0.01}
                />
              </div>

              <div className="space-y-2">
                <Label>Avg Claim Severity: ₹{avgSeverity}</Label>
                <Slider
                  value={[avgSeverity]}
                  onValueChange={([v]) => setAvgSeverity(v)}
                  min={100}
                  max={1000}
                  step={10}
                />
              </div>

              <div className="space-y-2">
                <Label>Simulation Weeks: {weeks}</Label>
                <Slider
                  value={[weeks]}
                  onValueChange={([v]) => setWeeks(v)}
                  min={1}
                  max={24}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label>Active Policies: {policyCount.toLocaleString()}</Label>
                <Slider
                  value={[policyCount]}
                  onValueChange={([v]) => setPolicyCount(v)}
                  min={100}
                  max={10000}
                  step={100}
                />
              </div>
            </div>
          )}

          <Button
            onClick={runSimulation}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>Running Simulation...</>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run Simulation
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Loading Skeleton */}
      {isLoading && !result && (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {/* Results Panel */}
      {result && !isLoading && (
        <div className="space-y-6">
          {/* Sustainability Alerts */}
          {!result.is_sustainable && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Unsustainable Scenario</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside mt-2">
                  {result.sustainability_issues.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Gross Loss Ratio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {result.gross_loss_ratio_pct.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {result.gross_loss_ratio_pct < 70 ? "Healthy" : result.gross_loss_ratio_pct < 85 ? "Acceptable" : "High"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Combined Ratio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {result.combined_ratio_pct.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Target: 85%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Contribution Margin</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {result.contribution_margin_pct.toFixed(1)}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Exposure at Risk</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₹{(result.exposure_at_risk_inr / 1000000).toFixed(2)}M
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Premium Adjustment Recommendation */}
          {result.required_premium_adjustment_pct > 0 ? (
            <Alert>
              <TrendingUp className="h-4 w-4" />
              <AlertTitle>Premium Adjustment Needed</AlertTitle>
              <AlertDescription>
                Recommended premium increase: <strong>+{result.required_premium_adjustment_pct.toFixed(1)}%</strong> to reach 85% combined ratio target.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>No Adjustment Needed</AlertTitle>
              <AlertDescription>
                Current pricing is sustainable under this scenario.
              </AlertDescription>
            </Alert>
          )}

          {/* Combined Ratio Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Weekly Combined Ratio Trend</CardTitle>
              <CardDescription>Target: 85% (reference line)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={result.weekly_breakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" label={{ value: "Week", position: "insideBottom", offset: -5 }} />
                  <YAxis label={{ value: "Combined Ratio %", angle: -90, position: "insideLeft" }} />
                  <Tooltip />
                  <Legend />
                  <ReferenceLine y={85} stroke="green" strokeDasharray="3 3" label="Target 85%" />
                  <Line type="monotone" dataKey="combined_ratio_pct" stroke="#8884d8" name="Combined Ratio %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* City Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle>City Segment Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>City</TableHead>
                    <TableHead className="text-right">Loss Ratio %</TableHead>
                    <TableHead className="text-right">Combined Ratio %</TableHead>
                    <TableHead className="text-right">Contribution Margin %</TableHead>
                    <TableHead>Expand Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.city_segment_breakdown.map((city) => (
                    <TableRow key={city.city}>
                      <TableCell className="font-medium">{city.city}</TableCell>
                      <TableCell className="text-right">{city.loss_ratio_pct.toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{city.combined_ratio_pct.toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{city.contribution_margin_pct.toFixed(1)}%</TableCell>
                      <TableCell>
                        <Badge variant={city.stop_expand_flag ? "destructive" : "default"}>
                          {city.stop_expand_flag ? "Stop" : "Continue"}
                        </Badge>
                        {city.stop_expand_flag && city.stop_expand_reason && (
                          <p className="text-xs text-muted-foreground mt-1">{city.stop_expand_reason}</p>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button onClick={exportReport} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
            {result.required_premium_adjustment_pct > 0 && (
              <Button variant="default">
                Propose Premium Adjustment
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
