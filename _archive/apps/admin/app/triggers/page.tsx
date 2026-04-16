'use client';

import React, { useEffect, useState } from 'react';
import {
  CloudRain, Thermometer, Wind, AlertOctagon, WifiOff, Clock, MapPin, CheckCircle, AlertCircle, XCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { formatDateTime } from '@/lib/utils';
import { getActiveTriggers, getErrorMessage, type TriggerData } from '@/lib/api';

const TRIGGER_ICONS: Record<string, React.ReactNode> = {
  HeavyRain: <CloudRain className="w-5 h-5 text-blue-600" />,
  ExtremeHeat: <Thermometer className="w-5 h-5 text-red-600" />,
  SeverePollution: <Wind className="w-5 h-5 text-orange-600" />,
  LocalRestriction: <AlertOctagon className="w-5 h-5 text-purple-600" />,
  PlatformOutage: <WifiOff className="w-5 h-5 text-slate-600" />,
};

export default function TriggersPage() {
  const [triggers, setTriggers] = useState<TriggerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  async function loadTriggers() {
    setLoading(true);
    setError(null);
    try {
      const data = await getActiveTriggers();
      setTriggers(data.triggers);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTriggers();
  }, []);

  const filteredTriggers = triggers.filter((trigger) => {
    const matchesType = typeFilter === 'all' || trigger.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || trigger.status === statusFilter;
    return matchesType && matchesStatus;
  });

  const statusIcon: Record<string, React.ReactNode> = {
    active: <CheckCircle className="w-4 h-4 text-green-600" />,
    evaluated: <AlertCircle className="w-4 h-4 text-yellow-600" />,
    resolved: <XCircle className="w-4 h-4 text-slate-400" />,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Trigger Events</h1>
        <p className="text-slate-500 mt-1">Monitor and manage disruption triggers in real-time</p>
      </div>

      <div className="flex gap-4 items-end flex-wrap">
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 block">Trigger Type</label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="HeavyRain">Heavy Rain</SelectItem>
              <SelectItem value="ExtremeHeat">Extreme Heat</SelectItem>
              <SelectItem value="SeverePollution">Severe Pollution</SelectItem>
              <SelectItem value="LocalRestriction">Local Restriction</SelectItem>
              <SelectItem value="PlatformOutage">Platform Outage</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 block">Status</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="evaluated">Evaluated</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={loadTriggers} disabled={loading}>Refresh</Button>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading triggers...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">{error}</div>
        ) : filteredTriggers.length === 0 ? (
          <div className="text-center py-8 text-slate-500">No triggers found</div>
        ) : (
          filteredTriggers.map((trigger) => (
            <Card key={trigger.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="mt-1">{TRIGGER_ICONS[trigger.type] || <AlertOctagon className="w-5 h-5" />}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                        {trigger.type}
                        {statusIcon[trigger.status]}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {trigger.zone}
                      </p>
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500">Value</p>
                          <p className="font-mono font-medium text-slate-900">{trigger.value}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Threshold</p>
                          <p className="font-mono font-medium text-slate-900">{trigger.threshold}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Confidence</p>
                          <p className="font-mono font-medium text-slate-900">{(trigger.confidence_score * 100).toFixed(0)}%</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Sources</p>
                          <p className="font-mono font-medium text-slate-900">{trigger.sources.length}</p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Detected: {formatDateTime(trigger.triggered_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Badge className={trigger.status === 'active' ? 'bg-green-100 text-green-800' : trigger.status === 'evaluated' ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-800'}>
                      {trigger.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
