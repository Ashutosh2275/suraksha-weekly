'use client';

import React, { useEffect, useState } from 'react';
import {
  Activity, AlertTriangle, Zap, Shield,
} from 'lucide-react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatINR } from '@/lib/utils';
import {
  getFraudClusters,
  getFraudModelStatus,
  runGraphAnalysis,
  getErrorMessage,
  type FraudCluster,
  type ModelStatus,
} from '@/lib/api';

export default function FraudLabPage() {
  const [model, setModel] = useState<ModelStatus | null>(null);
  const [clusters, setClusters] = useState<FraudCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadFraudData() {
    setLoading(true);
    setError(null);
    try {
      const [modelData, clusterData] = await Promise.all([
        getFraudModelStatus(),
        getFraudClusters(),
      ]);
      setModel(modelData);
      setClusters(clusterData.clusters);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleRunGraphAnalysis() {
    setRunningAnalysis(true);
    setError(null);
    try {
      await runGraphAnalysis();
      await loadFraudData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setRunningAnalysis(false);
    }
  }

  useEffect(() => {
    loadFraudData();
  }, []);

  const criticalClusters = clusters.filter((c) => c.risk_level === 'critical').length;
  const blockedEstimate = clusters.reduce((sum, c) => sum + c.member_count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Fraud Detection Lab</h1>
        <p className="text-slate-500 mt-1">Monitor ML model health, fraud clusters, and anomalies</p>
      </div>

      {error && (
        <Card>
          <CardContent className="pt-6 text-red-600">{error}</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-2">
              <p className="text-sm text-slate-500">Model Precision</p>
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {model ? `${(model.last_precision * 100).toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs mt-2 text-slate-500">
              Floor: {model ? `${(model.precision_floor * 100).toFixed(1)}%` : '—'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-2">
              <p className="text-sm text-slate-500">Fraud Clusters</p>
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{clusters.length}</p>
            <p className="text-xs text-red-600 mt-2">{criticalClusters} critical clusters</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-2">
              <p className="text-sm text-slate-500">Flagged Members</p>
              <Zap className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{blockedEstimate}</p>
            <p className="text-xs text-orange-600 mt-2">Across unresolved clusters</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-2">
              <p className="text-sm text-slate-500">Rule-only Mode</p>
              <Activity className="w-5 h-5 text-slate-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{model?.rule_only_mode ? 'ON' : 'OFF'}</p>
            <p className={`text-xs mt-2 ${model?.rule_only_mode ? 'text-red-600' : 'text-green-600'}`}>
              {model?.rule_only_mode ? 'Model degraded fallback active' : 'ML + rule blend active'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Model Health</CardTitle>
          <CardDescription>Fraud model runtime and precision status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-slate-500">Loading model status...</div>
          ) : model ? (
            <div className="border rounded-lg p-4 flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">IsolationForest + Rules</h3>
                <p className="text-sm text-slate-500 mt-1">Model path: {model.model_path}</p>
                <p className="text-sm text-slate-500 mt-1">Loaded: {model.model_loaded ? 'Yes' : 'No'}</p>
              </div>
              <Badge className={model.rule_only_mode ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}>
                {model.rule_only_mode ? 'Rule Only' : 'Active'}
              </Badge>
            </div>
          ) : null}
          <div className="flex gap-3">
            <Button onClick={loadFraudData} variant="outline" disabled={loading}>Refresh</Button>
            <Button onClick={handleRunGraphAnalysis} disabled={runningAnalysis}>
              {runningAnalysis ? 'Running Analysis...' : 'Run Graph Analysis'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detected Fraud Clusters</CardTitle>
          <CardDescription>Grouped suspicious patterns and anomalies</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-slate-500">Loading clusters...</div>
          ) : clusters.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No fraud clusters detected</div>
          ) : (
            <div className="space-y-3">
              {clusters.map((cluster) => (
                <div key={cluster.id} className="border rounded-lg p-4 flex items-start justify-between hover:bg-slate-50">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900">{cluster.cluster_type}</h4>
                    <p className="text-sm text-slate-500 mt-1">
                      {cluster.member_count} members | Link node: {cluster.link_node}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">Estimated risk exposure: {formatINR(cluster.member_count * 500)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={cluster.risk_level === 'critical' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}>
                      {cluster.risk_level}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
