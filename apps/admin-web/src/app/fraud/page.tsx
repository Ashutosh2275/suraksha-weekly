'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

// Types
interface FraudKPI {
  avgScoreToday: number;
  criticalBlocksToday: number;
  falsePositiveRate: number;
  modelStatus: 'Stable' | 'Drift Detected' | 'Retraining';
}

interface ScoreBucket {
  range: string;
  count: number;
  color: string;
}

interface FraudRule {
  id: string;
  name: string;
  description: string;
  severity: 'HIGH' | 'CRITICAL';
  hitCount: number;
  lastTriggered: Date;
}

interface SuspiciousCluster {
  id: string;
  signalType: 'Device' | 'Payout Handle' | 'IP Address';
  signalValue: string;
  workerCount: number;
  claimCount: number;
  lastSeen: Date;
  linkedWorkers?: string[];
  linkedClaims?: string[];
}

interface ClaimInvestigation {
  claimId: string;
  workerId: string;
  workerName: string;
  zone: string;
  fraudScore: number;
  riskTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  ruleFlags: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'BLOCKED';
  decision: string;
  timestamp: Date;
}

// Mock Data
const FRAUD_KPIS: FraudKPI = {
  avgScoreToday: 0.18,
  criticalBlocksToday: 3,
  falsePositiveRate: 2.4,
  modelStatus: 'Stable',
};

const SCORE_DISTRIBUTION: ScoreBucket[] = [
  { range: '0.0-0.1', count: 2456, color: '#10B981' },
  { range: '0.1-0.2', count: 892, color: '#34D399' },
  { range: '0.2-0.3', count: 234, color: '#6EE7B7' },
  { range: '0.3-0.4', count: 145, color: '#FEF3C7' },
  { range: '0.4-0.5', count: 89, color: '#FDE68A' },
  { range: '0.5-0.6', count: 56, color: '#FBBF24' },
  { range: '0.6-0.7', count: 34, color: '#F59E0B' },
  { range: '0.7-0.8', count: 23, color: '#EF4444' },
  { range: '0.8-0.9', count: 12, color: '#DC2626' },
  { range: '0.9-1.0', count: 5, color: '#B91C1C' },
];

const FRAUD_RULES: FraudRule[] = [
  {
    id: 'impossible-travel',
    name: 'Impossible Travel',
    description: 'Location change exceeds physical limits',
    severity: 'CRITICAL',
    hitCount: 156,
    lastTriggered: new Date(Date.now() - 15 * 60 * 1000),
  },
  {
    id: 'device-switch',
    name: 'Device Switch',
    description: 'New device during active session',
    severity: 'HIGH',
    hitCount: 89,
    lastTriggered: new Date(Date.now() - 45 * 60 * 1000),
  },
  {
    id: 'velocity-anomaly',
    name: 'Velocity Anomaly',
    description: 'Unusual claim submission pattern',
    severity: 'HIGH',
    hitCount: 67,
    lastTriggered: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: 'duplicate-biometric',
    name: 'Duplicate Biometric',
    description: 'Fingerprint matches existing worker',
    severity: 'CRITICAL',
    hitCount: 23,
    lastTriggered: new Date(Date.now() - 4 * 60 * 60 * 1000),
  },
  {
    id: 'policy-timing',
    name: 'Policy Timing',
    description: 'Claim too soon after policy purchase',
    severity: 'HIGH',
    hitCount: 45,
    lastTriggered: new Date(Date.now() - 6 * 60 * 60 * 1000),
  },
];

const SUSPICIOUS_CLUSTERS: SuspiciousCluster[] = [
  {
    id: 'cluster-001',
    signalType: 'Device',
    signalValue: 'iPhone13Pro-****8374',
    workerCount: 8,
    claimCount: 23,
    lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000),
    linkedWorkers: ['WRK-2847', 'WRK-3912', 'WRK-5043', 'WRK-7129', 'WRK-8456', 'WRK-9023', 'WRK-1204', 'WRK-6578'],
    linkedClaims: ['CLM-001', 'CLM-002', 'CLM-003'],
  },
  {
    id: 'cluster-002',
    signalType: 'Payout Handle',
    signalValue: '919876******@paytm',
    workerCount: 12,
    claimCount: 45,
    lastSeen: new Date(Date.now() - 45 * 60 * 1000),
    linkedWorkers: ['WRK-1001', 'WRK-1002', 'WRK-1003'],
    linkedClaims: ['CLM-004', 'CLM-005'],
  },
  {
    id: 'cluster-003',
    signalType: 'IP Address',
    signalValue: '103.21.58.***',
    workerCount: 6,
    claimCount: 18,
    lastSeen: new Date(Date.now() - 3 * 60 * 60 * 1000),
  },
  {
    id: 'cluster-004',
    signalType: 'Device',
    signalValue: 'Samsung-A52-****2891',
    workerCount: 3,
    claimCount: 7,
    lastSeen: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
];

const CLAIM_INVESTIGATIONS: ClaimInvestigation[] = [
  {
    claimId: 'CLM-2024-001',
    workerId: 'WRK-847',
    workerName: 'Rajesh Kumar',
    zone: 'Andheri East',
    fraudScore: 0.89,
    riskTier: 'CRITICAL',
    ruleFlags: ['impossible-travel', 'device-switch'],
    status: 'BLOCKED',
    decision: 'Blocked due to impossible travel pattern',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    claimId: 'CLM-2024-002',
    workerId: 'WRK-1203',
    workerName: 'Priya Sharma',
    zone: 'Gurgaon Sector 29',
    fraudScore: 0.34,
    riskTier: 'MEDIUM',
    ruleFlags: ['velocity-anomaly'],
    status: 'APPROVED',
    decision: 'Approved after manual review',
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
  },
  {
    claimId: 'CLM-2024-003',
    workerId: 'WRK-592',
    workerName: 'Amit Patel',
    zone: 'Koramangala',
    fraudScore: 0.72,
    riskTier: 'HIGH',
    ruleFlags: ['policy-timing', 'velocity-anomaly'],
    status: 'PENDING',
    decision: 'Under investigation',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
  },
  {
    claimId: 'CLM-2024-004',
    workerId: 'WRK-2847',
    workerName: 'Deepak Singh',
    zone: 'Bandra West',
    fraudScore: 0.15,
    riskTier: 'LOW',
    ruleFlags: [],
    status: 'APPROVED',
    decision: 'Auto-approved',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
  },
];

export default function FraudIntelligence() {
  const [selectedScoreBucket, setSelectedScoreBucket] = useState<string | null>(null);
  const [selectedRule, setSelectedRule] = useState<string | null>(null);
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);

  const getFraudScoreColor = (score: number) => {
    if (score >= 0.7) return 'text-red-600 bg-red-100';
    if (score >= 0.3) return 'text-orange-600 bg-orange-100';
    return 'text-green-600 bg-green-100';
  };

  const getRiskTierColor = (tier: string) => {
    switch (tier) {
      case 'CRITICAL': return 'danger';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'secondary';
      case 'LOW': return 'accent';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'accent';
      case 'REJECTED': return 'warning';
      case 'BLOCKED': return 'danger';
      case 'PENDING': return 'secondary';
      default: return 'secondary';
    }
  };

  const filteredClaims = CLAIM_INVESTIGATIONS.filter(claim => {
    if (showCriticalOnly && claim.riskTier !== 'CRITICAL') return false;
    if (selectedScoreBucket) {
      const [min, max] = selectedScoreBucket.split('-').map(parseFloat);
      if (claim.fraudScore < min || claim.fraudScore >= max + 0.1) return false;
    }
    return true;
  });

  const formatDuration = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / (1000 * 60));
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-text-primary mb-2">
          Fraud Intelligence
        </h1>
        <p className="text-text-secondary">
          Security operations center for fraud detection and investigation
        </p>
      </div>

      {/* Fraud KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-text-secondary">Avg Fraud Score Today</h3>
            <div className={`w-3 h-3 rounded-full ${FRAUD_KPIS.avgScoreToday <= 0.2 ? 'bg-green-500' : 'bg-orange-500'}`}></div>
          </div>
          <div className="text-2xl font-display font-bold text-text-primary">
            {FRAUD_KPIS.avgScoreToday.toFixed(2)}
          </div>
          <div className="text-xs text-text-muted mt-1">Target: ≤0.20</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-text-secondary">Critical Blocks Today</h3>
            <div className={`w-3 h-3 rounded-full ${FRAUD_KPIS.criticalBlocksToday === 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
          </div>
          <div className="text-2xl font-display font-bold text-text-primary">
            {FRAUD_KPIS.criticalBlocksToday}
          </div>
          <div className="text-xs text-text-muted mt-1">Target: 0 leakage</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-text-secondary">False Positive Rate</h3>
            <div className={`w-3 h-3 rounded-full ${FRAUD_KPIS.falsePositiveRate < 5 ? 'bg-green-500' : 'bg-orange-500'}`}></div>
          </div>
          <div className="text-2xl font-display font-bold text-text-primary">
            {FRAUD_KPIS.falsePositiveRate}%
          </div>
          <div className="text-xs text-text-muted mt-1">Target: &lt;5%</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-text-secondary">Model Status</h3>
            <div className={`w-3 h-3 rounded-full ${
              FRAUD_KPIS.modelStatus === 'Stable' ? 'bg-green-500' : 
              FRAUD_KPIS.modelStatus === 'Drift Detected' ? 'bg-red-500' : 'bg-orange-500'
            }`}></div>
          </div>
          <div className={`text-lg font-display font-bold ${
            FRAUD_KPIS.modelStatus === 'Stable' ? 'text-green-600' : 
            FRAUD_KPIS.modelStatus === 'Drift Detected' ? 'text-red-600' : 'text-orange-600'
          }`}>
            {FRAUD_KPIS.modelStatus}
          </div>
          <div className="text-xs text-text-muted mt-1">ML Model Health</div>
        </Card>
      </div>

      {/* Fraud Score Distribution */}
      <Card className="p-6">
        <h3 className="text-xl font-display font-semibold text-text-primary mb-4">
          Fraud Score Distribution
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={SCORE_DISTRIBUTION}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="range" stroke="#94A3C0" />
              <YAxis stroke="#94A3C0" />
              <Tooltip 
                formatter={(value) => [`${value} claims`, 'Count']}
                labelStyle={{ color: '#0D1B3E' }}
              />
              <ReferenceLine x="0.2-0.3" stroke="#F59E0B" strokeDasharray="3 3" />
              <ReferenceLine x="0.6-0.7" stroke="#EF4444" strokeDasharray="3 3" />
              <Bar 
                dataKey="count" 
                radius={[4, 4, 0, 0]}
                onClick={(data) => setSelectedScoreBucket(data.range)}
                className="cursor-pointer"
              >
                {SCORE_DISTRIBUTION.map((entry, index) => (
                  <Bar key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-orange-500"></div>
            <span className="text-text-secondary">Auto-approve threshold (0.3)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-red-500"></div>
            <span className="text-text-secondary">Manual review threshold (0.7)</span>
          </div>
          {selectedScoreBucket && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setSelectedScoreBucket(null)}
                className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded"
              >
                Filtered: {selectedScoreBucket} ✕
              </button>
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rule Hit Frequency */}
        <Card className="p-6">
          <h3 className="text-xl font-display font-semibold text-text-primary mb-4">
            Rule Hit Frequency (This Week)
          </h3>
          <div className="space-y-3">
            {FRAUD_RULES.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center gap-4 p-3 rounded border hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setSelectedRule(selectedRule === rule.id ? null : rule.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-text-primary">{rule.name}</span>
                    <Badge variant={rule.severity === 'CRITICAL' ? 'danger' : 'warning'}>
                      {rule.severity}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-secondary">{rule.description}</p>
                  <p className="text-xs text-text-muted">Last: {formatDuration(rule.lastTriggered)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${rule.severity === 'CRITICAL' ? 'bg-red-500' : 'bg-orange-500'}`}
                      style={{ width: `${Math.min(100, (rule.hitCount / 200) * 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold text-text-primary w-8 text-right">
                    {rule.hitCount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Suspicious Clusters */}
        <Card className="p-6">
          <h3 className="text-xl font-display font-semibold text-text-primary mb-4">
            Shared Identity Signals
          </h3>
          <div className="space-y-2">
            {SUSPICIOUS_CLUSTERS.map((cluster) => (
              <div key={cluster.id}>
                <div
                  className={`p-3 rounded border cursor-pointer transition-colors ${
                    cluster.workerCount > 5 ? 'bg-red-50 border-red-200' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setExpandedCluster(expandedCluster === cluster.id ? null : cluster.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-text-primary">{cluster.signalType}</span>
                        <span className="text-xs font-mono text-text-secondary">{cluster.signalValue}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-text-muted">
                        <span>{cluster.workerCount} workers</span>
                        <span>{cluster.claimCount} claims</span>
                        <span>Last: {formatDuration(cluster.lastSeen)}</span>
                      </div>
                    </div>
                    {cluster.workerCount > 5 && (
                      <button className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors">
                        Investigate
                      </button>
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {expandedCluster === cluster.id && cluster.linkedWorkers && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="ml-4 mt-2 p-3 bg-gray-100 rounded border-l-4 border-orange-500"
                    >
                      <h4 className="font-medium text-text-primary mb-2">Linked Workers</h4>
                      <div className="flex flex-wrap gap-1">
                        {cluster.linkedWorkers.map((workerId) => (
                          <span key={workerId} className="px-2 py-1 bg-white border rounded text-xs font-mono">
                            {workerId}
                          </span>
                        ))}
                      </div>
                      {cluster.linkedClaims && (
                        <>
                          <h4 className="font-medium text-text-primary mb-2 mt-3">Recent Claims</h4>
                          <div className="flex flex-wrap gap-1">
                            {cluster.linkedClaims.map((claimId) => (
                              <span key={claimId} className="px-2 py-1 bg-white border rounded text-xs font-mono">
                                {claimId}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Claim Investigation Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-display font-semibold text-text-primary">
            Claim Investigation (Last 7 Days)
          </h3>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showCriticalOnly}
                onChange={(e) => setShowCriticalOnly(e.target.checked)}
                className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
              />
              <span className="text-sm text-text-secondary">Show only CRITICAL</span>
            </label>
            <span className="text-sm text-text-muted">
              {filteredClaims.length} of {CLAIM_INVESTIGATIONS.length} claims
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 font-medium text-text-secondary">Claim ID</th>
                <th className="text-left py-2 font-medium text-text-secondary">Worker</th>
                <th className="text-left py-2 font-medium text-text-secondary">Zone</th>
                <th className="text-left py-2 font-medium text-text-secondary">Fraud Score</th>
                <th className="text-left py-2 font-medium text-text-secondary">Risk Tier</th>
                <th className="text-left py-2 font-medium text-text-secondary">Rule Flags</th>
                <th className="text-left py-2 font-medium text-text-secondary">Status</th>
                <th className="text-left py-2 font-medium text-text-secondary">Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredClaims.map((claim) => (
                <tr key={claim.claimId} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                  <td className="py-3">
                    <span className="font-mono text-text-primary">{claim.claimId}</span>
                  </td>
                  <td className="py-3">
                    <div>
                      <div className="font-medium text-text-primary">{claim.workerName}</div>
                      <div className="text-xs font-mono text-text-muted">{claim.workerId}</div>
                    </div>
                  </td>
                  <td className="py-3 text-text-primary">{claim.zone}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getFraudScoreColor(claim.fraudScore)}`}>
                      {(claim.fraudScore * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="py-3">
                    <Badge variant={getRiskTierColor(claim.riskTier)}>
                      {claim.riskTier}
                    </Badge>
                  </td>
                  <td className="py-3">
                    {claim.ruleFlags.length > 0 ? (
                      <div className="flex items-center gap-1">
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                          {claim.ruleFlags.length}
                        </span>
                        <span className="text-xs text-text-muted">flags</span>
                      </div>
                    ) : (
                      <span className="text-xs text-text-muted">None</span>
                    )}
                  </td>
                  <td className="py-3">
                    <Badge variant={getStatusColor(claim.status)}>
                      {claim.status}
                    </Badge>
                  </td>
                  <td className="py-3 text-text-secondary text-xs">
                    {formatDuration(claim.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredClaims.length === 0 && (
          <div className="text-center py-8 text-text-muted">
            <div className="text-2xl mb-2">🔍</div>
            <p>No claims match the current filter</p>
          </div>
        )}
      </Card>
    </div>
  );
}
