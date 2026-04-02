'use client';

import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

// Types
interface AuditEvent {
  id: string;
  timestamp: Date;
  entityType: 'Policy' | 'Claim' | 'Payout' | 'FraudAssessment' | 'AdminAction';
  entityId: string;
  action: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  changeSummary: string;
  previousState?: any;
  newState?: any;
  description: string;
}

interface FilterState {
  entityType: string;
  dateRange: string;
  customDateStart: string;
  customDateEnd: string;
  actor: string;
  action: string;
  search: string;
}

// Mock Data
const AUDIT_EVENTS: AuditEvent[] = [
  {
    id: 'audit_001',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    entityType: 'Claim',
    entityId: 'CLM-2024-5847',
    action: 'STATUS_CHANGED',
    actorId: 'admin_rajesh',
    actorName: 'Rajesh Kumar',
    actorRole: 'FRAUD_ANALYST',
    changeSummary: 'Status changed from PENDING to APPROVED',
    previousState: {
      status: 'PENDING',
      reviewerId: null,
      fraudScore: 0.34,
      notes: ''
    },
    newState: {
      status: 'APPROVED',
      reviewerId: 'admin_rajesh',
      fraudScore: 0.34,
      notes: 'Manual review completed - legitimate claim verified'
    },
    description: 'Claim CLM-2024-5847 status changed from PENDING to APPROVED by Rajesh Kumar (FRAUD_ANALYST)'
  },
  {
    id: 'audit_002',
    timestamp: new Date(Date.now() - 32 * 60 * 1000),
    entityType: 'Policy',
    entityId: 'POL-2024-8934',
    action: 'CREATED',
    actorId: 'system',
    actorName: 'System',
    actorRole: 'SYSTEM',
    changeSummary: 'New policy created for worker WRK-3847',
    previousState: null,
    newState: {
      id: 'POL-2024-8934',
      workerId: 'WRK-3847',
      premium: 67,
      coverage: 1500,
      zone: 'Andheri East',
      status: 'ACTIVE'
    },
    description: 'Policy POL-2024-8934 created for worker WRK-3847 in Andheri East zone'
  },
  {
    id: 'audit_003',
    timestamp: new Date(Date.now() - 48 * 60 * 1000),
    entityType: 'FraudAssessment',
    entityId: 'FRD-2024-1203',
    action: 'SCORE_UPDATED',
    actorId: 'ml_engine',
    actorName: 'ML Engine',
    actorRole: 'SYSTEM',
    changeSummary: 'Fraud score increased from 0.23 to 0.89 due to impossible travel rule',
    previousState: {
      score: 0.23,
      rules: ['policy_timing'],
      confidence: 0.67
    },
    newState: {
      score: 0.89,
      rules: ['policy_timing', 'impossible_travel'],
      confidence: 0.94
    },
    description: 'Fraud assessment FRD-2024-1203 score updated from 0.23 to 0.89 by ML Engine'
  },
  {
    id: 'audit_004',
    timestamp: new Date(Date.now() - 75 * 60 * 1000),
    entityType: 'Payout',
    entityId: 'PAY-2024-4567',
    action: 'PROCESSED',
    actorId: 'payment_gateway',
    actorName: 'Payment Gateway',
    actorRole: 'SYSTEM',
    changeSummary: 'Payout of ₹420 processed successfully',
    previousState: {
      status: 'PENDING',
      amount: 420,
      upiHandle: 'worker@oksbi'
    },
    newState: {
      status: 'SUCCESS',
      amount: 420,
      upiHandle: 'worker@oksbi',
      transactionId: 'TXN123456789',
      processedAt: new Date().toISOString()
    },
    description: 'Payout PAY-2024-4567 of ₹420 processed successfully to worker@oksbi'
  },
  {
    id: 'audit_005',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    entityType: 'AdminAction',
    entityId: 'ACT-2024-0892',
    action: 'TRIGGER_ACTIVATED',
    actorId: 'admin_priya',
    actorName: 'Priya Sharma',
    actorRole: 'RISK_ADMIN',
    changeSummary: 'Manual trigger activated for Koramangala zone',
    previousState: {
      zone: 'Koramangala',
      triggerActive: false,
      reason: null
    },
    newState: {
      zone: 'Koramangala',
      triggerActive: true,
      reason: 'Heavy rainfall reported by multiple sources',
      activatedBy: 'admin_priya',
      activatedAt: new Date().toISOString()
    },
    description: 'Manual trigger activated for Koramangala zone by Priya Sharma (RISK_ADMIN)'
  },
  {
    id: 'audit_006',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
    entityType: 'Claim',
    entityId: 'CLM-2024-5892',
    action: 'BLOCKED',
    actorId: 'ml_engine',
    actorName: 'ML Engine',
    actorRole: 'SYSTEM',
    changeSummary: 'Claim automatically blocked due to fraud score 0.94',
    previousState: {
      status: 'PENDING',
      fraudScore: 0.94,
      autoDecision: null
    },
    newState: {
      status: 'BLOCKED',
      fraudScore: 0.94,
      autoDecision: 'FRAUD_DETECTED',
      blockedReason: 'Impossible travel pattern detected'
    },
    description: 'Claim CLM-2024-5892 automatically blocked by ML Engine due to high fraud score'
  },
  {
    id: 'audit_007',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    entityType: 'AdminAction',
    entityId: 'ACT-2024-0891',
    action: 'SETTINGS_CHANGED',
    actorId: 'admin_superuser',
    actorName: 'System Administrator',
    actorRole: 'SUPER_ADMIN',
    changeSummary: 'Fraud threshold changed from 0.7 to 0.8',
    previousState: {
      fraudThreshold: 0.7,
      autoApproveThreshold: 0.3
    },
    newState: {
      fraudThreshold: 0.8,
      autoApproveThreshold: 0.3
    },
    description: 'System fraud threshold updated from 0.7 to 0.8 by System Administrator'
  },
];

export default function AuditLogExplorer() {
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    entityType: 'All',
    dateRange: 'Last 7 days',
    customDateStart: '',
    customDateEnd: '',
    actor: '',
    action: '',
    search: '',
  });

  const filteredEvents = useMemo(() => {
    return AUDIT_EVENTS.filter(event => {
      // Entity type filter
      if (filters.entityType !== 'All' && event.entityType !== filters.entityType) {
        return false;
      }

      // Date range filter
      const now = new Date();
      let startDate = new Date(0);
      
      if (filters.dateRange === 'Today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (filters.dateRange === 'Last 7 days') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (filters.dateRange === 'Last 30 days') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (filters.dateRange === 'Custom' && filters.customDateStart) {
        startDate = new Date(filters.customDateStart);
      }

      if (event.timestamp < startDate) return false;

      // Actor filter
      if (filters.actor && !event.actorId.toLowerCase().includes(filters.actor.toLowerCase()) && 
          !event.actorRole.toLowerCase().includes(filters.actor.toLowerCase())) {
        return false;
      }

      // Action filter
      if (filters.action && !event.action.toLowerCase().includes(filters.action.toLowerCase())) {
        return false;
      }

      // Search filter
      if (filters.search && !event.description.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [filters]);

  const getEntityTypeColor = (entityType: string) => {
    switch (entityType) {
      case 'Policy': return 'primary';
      case 'Claim': return 'warning';
      case 'Payout': return 'accent';
      case 'FraudAssessment': return 'danger';
      case 'AdminAction': return 'secondary';
      default: return 'neutral';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SYSTEM': return 'secondary';
      case 'FRAUD_ANALYST': return 'warning';
      case 'RISK_ADMIN': return 'danger';
      case 'SUPER_ADMIN': return 'primary';
      default: return 'neutral';
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short', 
      year: 'numeric'
    }) + ' · ' + date.toLocaleTimeString('en-GB', {
      hour12: false,
      timeZone: 'UTC'
    }) + ' UTC';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const exportCSV = () => {
    const headers = ['Timestamp', 'Entity Type', 'Entity ID', 'Action', 'Actor ID', 'Actor Role', 'Change Summary'];
    const rows = filteredEvents.map(event => [
      formatTimestamp(event.timestamp),
      event.entityType,
      event.entityId,
      event.action,
      event.actorId,
      event.actorRole,
      event.changeSummary
    ]);

    const csvContent = [headers, ...rows].map(row => 
      row.map(field => `"${field}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderJsonDiff = (previous: any, current: any) => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <div>
          <h4 className="text-sm font-medium text-text-secondary mb-2">Previous State</h4>
          <div className="bg-red-50 border border-red-200 rounded p-3 text-xs font-mono overflow-auto max-h-60">
            <pre className="text-red-800 whitespace-pre-wrap">
              {previous ? JSON.stringify(previous, null, 2) : 'null'}
            </pre>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium text-text-secondary mb-2">New State</h4>
          <div className="bg-green-50 border border-green-200 rounded p-3 text-xs font-mono overflow-auto max-h-60">
            <pre className="text-green-800 whitespace-pre-wrap">
              {current ? JSON.stringify(current, null, 2) : 'null'}
            </pre>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-text-primary mb-2">
          Audit Log Explorer
        </h1>
        <p className="text-text-secondary">
          Comprehensive audit trail for all system changes and administrative actions
        </p>
      </div>

      {/* Filter Bar */}
      <Card className="p-6 sticky top-0 z-10 bg-white shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-4">
          <Select
            options={[
              { value: 'All', label: 'All Entities' },
              { value: 'Policy', label: 'Policy' },
              { value: 'Claim', label: 'Claim' },
              { value: 'Payout', label: 'Payout' },
              { value: 'FraudAssessment', label: 'Fraud Assessment' },
              { value: 'AdminAction', label: 'Admin Action' }
            ]}
            value={filters.entityType}
            onChange={(value) => setFilters(prev => ({ ...prev, entityType: value }))}
            placeholder="Entity Type"
          />

          <Select
            options={[
              { value: 'Today', label: 'Today' },
              { value: 'Last 7 days', label: 'Last 7 days' },
              { value: 'Last 30 days', label: 'Last 30 days' },
              { value: 'Custom', label: 'Custom range' }
            ]}
            value={filters.dateRange}
            onChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}
            placeholder="Date Range"
          />

          <Input
            placeholder="Actor ID or role"
            value={filters.actor}
            onChange={(e) => setFilters(prev => ({ ...prev, actor: e.target.value }))}
          />

          <Input
            placeholder="Action filter"
            value={filters.action}
            onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
          />

          <Input
            placeholder="Search descriptions"
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="md:col-span-1"
          />

          <Button onClick={exportCSV} variant="secondary" className="whitespace-nowrap">
            Export CSV
          </Button>
        </div>

        {filters.dateRange === 'Custom' && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <Input
              type="date"
              placeholder="Start date"
              value={filters.customDateStart}
              onChange={(e) => setFilters(prev => ({ ...prev, customDateStart: e.target.value }))}
            />
            <Input
              type="date"
              placeholder="End date"
              value={filters.customDateEnd}
              onChange={(e) => setFilters(prev => ({ ...prev, customDateEnd: e.target.value }))}
            />
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">View:</span>
            <div className="flex rounded-lg border border-gray-200 p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 text-sm rounded ${
                  viewMode === 'list' 
                    ? 'bg-brand-primary text-white' 
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                List
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1 text-sm rounded ${
                  viewMode === 'timeline' 
                    ? 'bg-brand-primary text-white' 
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Timeline
              </button>
            </div>
          </div>
          <div className="text-sm text-text-muted">
            {filteredEvents.length} events found
          </div>
        </div>
      </Card>

      {/* Results */}
      {filteredEvents.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">No audit events found</h3>
          <p className="text-text-secondary">No audit events match your current filters</p>
        </Card>
      ) : viewMode === 'list' ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">Timestamp</th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">Entity</th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">ID</th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">Action</th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">Actor</th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">Change Summary</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => (
                  <motion.tr
                    key={event.id}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setExpandedRow(expandedRow === event.id ? null : event.id)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    layout
                  >
                    <td className="py-3 px-4">
                      <div className="text-xs font-mono text-text-secondary">
                        {formatTimestamp(event.timestamp)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={getEntityTypeColor(event.entityType)} size="sm">
                        {event.entityType}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(event.entityId);
                        }}
                        className="text-xs font-mono text-text-primary hover:text-brand-primary transition-colors"
                        title="Click to copy full ID"
                      >
                        {event.entityId.length > 12 ? event.entityId.substring(0, 12) + '...' : event.entityId}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-text-primary">{event.action}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-text-primary">{event.actorName}</span>
                        <Badge variant={getRoleColor(event.actorRole)} size="sm">
                          {event.actorRole}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-text-secondary">{event.changeSummary}</span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Expanded Row Details */}
          <AnimatePresence>
            {expandedRow && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-gray-200 bg-gray-50 p-6"
              >
                {(() => {
                  const event = filteredEvents.find(e => e.id === expandedRow);
                  if (!event) return null;
                  
                  return (
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary mb-4">
                        State Change Details
                      </h3>
                      <div className="mb-4 p-4 bg-white rounded border">
                        <h4 className="font-medium text-text-secondary mb-2">Full Description</h4>
                        <p className="text-text-primary">{event.description}</p>
                      </div>
                      {(event.previousState || event.newState) && 
                        renderJsonDiff(event.previousState, event.newState)
                      }
                    </div>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      ) : (
        // Timeline View
        <div className="space-y-6">
          {filteredEvents.reduce((groups: { [key: string]: AuditEvent[] }, event) => {
            const hour = event.timestamp.toISOString().substring(0, 13);
            if (!groups[hour]) groups[hour] = [];
            groups[hour].push(event);
            return groups;
          }, {}) && Object.entries(
            filteredEvents.reduce((groups: { [key: string]: AuditEvent[] }, event) => {
              const hour = event.timestamp.toISOString().substring(0, 13);
              if (!groups[hour]) groups[hour] = [];
              groups[hour].push(event);
              return groups;
            }, {})
          ).map(([hour, events]) => (
            <Card key={hour} className="p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                {new Date(hour + ':00:00.000Z').toLocaleString('en-GB', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })} ({events.length} events)
              </h3>
              <div className="space-y-3">
                {events.map((event) => (
                  <div key={event.id} className="flex items-start gap-4 p-3 bg-gray-50 rounded border-l-4 border-brand-primary">
                    <Badge variant={getEntityTypeColor(event.entityType)} size="sm">
                      {event.entityType}
                    </Badge>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-text-primary">{event.action}</span>
                        <span className="text-xs font-mono text-text-muted">{event.entityId}</span>
                      </div>
                      <p className="text-sm text-text-secondary">{event.changeSummary}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-text-muted">by {event.actorName}</span>
                        <Badge variant={getRoleColor(event.actorRole)} size="sm">
                          {event.actorRole}
                        </Badge>
                        <span className="text-xs text-text-muted font-mono">
                          {event.timestamp.toLocaleTimeString('en-GB', { hour12: false })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
