'use client';

import React, { useEffect, useState } from 'react';
import { ChevronRight, Filter } from 'lucide-react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { formatINR, formatDateTime } from '@/lib/utils';
import { getAdminClaims, getErrorMessage, type AdminClaim } from '@/lib/api';

export default function ClaimsPage() {
  const [claims, setClaims] = useState<AdminClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  async function loadClaims() {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminClaims({ limit: 200 });
      setClaims(data.claims);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClaims();
  }, []);

  const statusColors: Record<string, string> = {
    initiated: 'bg-blue-100 text-blue-800',
    in_review: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    paid: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    blocked: 'bg-red-100 text-red-800',
  };

  const filteredClaims = claims.filter((claim) => {
    const matchesStatus = statusFilter === 'all' || claim.status === statusFilter;
    const matchesSearch =
      claim.id.toLowerCase().includes(searchTerm.toLowerCase())
      || (claim.zone ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Claims Management</h1>
        <p className="text-slate-500 mt-1">View and manage all insurance claims</p>
      </div>

      <div className="flex gap-4 items-end flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <label className="text-sm font-medium text-slate-700 mb-2 block">Search Claim ID or Zone</label>
          <input
            type="text"
            placeholder="Search claim ID, zone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 block">Status</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="initiated">Initiated</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="button" onClick={loadClaims} disabled={loading}>
          <Filter className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Claims Table</CardTitle>
          <CardDescription>{filteredClaims.length} claims found</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading claims...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">{error}</div>
          ) : filteredClaims.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No claims found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Claim ID</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Trigger</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Zone</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Amount</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Fraud Score</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Initiated</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClaims.map((claim) => (
                    <tr key={claim.id} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs">{claim.id.substring(0, 12)}...</td>
                      <td className="px-4 py-3">{claim.trigger_type ?? '—'}</td>
                      <td className="px-4 py-3">{claim.zone ?? '—'}</td>
                      <td className="px-4 py-3 font-semibold">{formatINR(claim.payout_amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${claim.fraud_score < 30 ? 'bg-green-100 text-green-800' : claim.fraud_score < 65 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                          {claim.fraud_score.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={statusColors[claim.status] || 'bg-slate-100 text-slate-800'}>
                          {claim.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(claim.initiated_at)}</td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm">
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
