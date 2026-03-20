'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ChevronRight, Info, Clock, User,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { formatDateTime } from '@/lib/utils';
import { getAdminAuditLogs, getErrorMessage, type AdminAuditLog } from '@/lib/api';

const ACTION_COLORS: Record<string, string> = {
  created: 'bg-blue-100 text-blue-800',
  updated: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  paid: 'bg-green-100 text-green-800',
  blocked: 'bg-red-100 text-red-800',
  deleted: 'bg-slate-100 text-slate-800',
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entityFilter, setEntityFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const loadAuditLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminAuditLogs({
        page: 1,
        limit: 200,
        entity_type: entityFilter !== 'all' ? entityFilter : undefined,
        action: actionFilter !== 'all' ? actionFilter : undefined,
        search: searchTerm.trim() || undefined,
      });
      setLogs(data.logs);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [actionFilter, entityFilter, searchTerm]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Audit Log</h1>
        <p className="text-slate-500 mt-1">Track all system changes and user actions</p>
      </div>

      <div className="flex gap-4 items-end flex-wrap">
        <div className="flex-1 min-w-[250px]">
          <label className="text-sm font-medium text-slate-700 mb-2 block">Search Entity or Actor</label>
          <input
            type="text"
            placeholder="Search entity ID, actor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 block">Entity Type</label>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Claim">Claim</SelectItem>
              <SelectItem value="FraudAssessment">Fraud Assessment</SelectItem>
              <SelectItem value="PayoutTransaction">Payout Transaction</SelectItem>
              <SelectItem value="Policy">Policy</SelectItem>
              <SelectItem value="Worker">Worker</SelectItem>
              <SelectItem value="TriggerEvent">Trigger Event</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 block">Action</label>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="updated">Updated</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="initiated">Initiated</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <button
          type="button"
          onClick={loadAuditLogs}
          disabled={loading}
          className="px-3 py-2 border border-slate-300 rounded-md text-sm hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading audit logs...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">{error}</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-slate-500">No audit logs found</div>
        ) : (
          logs.map((log) => (
            <Card
              key={log.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-1">
                      <Info className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{log.entity_type}</Badge>
                        <Badge className={ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-800'}>
                          {log.action}
                        </Badge>
                      </div>
                      <p className="font-mono text-sm text-slate-600 mb-2">{log.entity_id}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {log.actor}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDateTime(log.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${expandedLog === log.id ? 'rotate-90' : ''}`} />
                </div>

                {expandedLog === log.id && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs font-medium text-slate-600 mb-2">Payload:</p>
                    <pre className="bg-slate-50 p-3 rounded text-xs overflow-x-auto text-slate-800">
                      {JSON.stringify(log.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="text-center text-sm text-slate-500">
        Showing {logs.length} audit logs
      </div>
    </div>
  );
}
