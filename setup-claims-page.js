// This file will create the claims directory and page
const fs = require('fs');
const path = require('path');

const claimsDir = path.join(__dirname, 'apps', 'admin-web', 'src', 'app', 'claims');

// Create the directory
fs.mkdirSync(claimsDir, { recursive: true });
console.log('Created claims directory');

// Claims page content
const claimsPageContent = `'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface Claim {
  id: string;
  workerId: string;
  workerName: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'UNDER_REVIEW';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  fraudScore: number;
  zone: string;
  date: string;
  trigger: string;
  submittedAt: string;
}

// Mock Data
const MOCK_CLAIMS: Claim[] = [
  {
    id: 'CLM-2024-001',
    workerId: 'WRK-12345',
    workerName: 'Ravi Kumar',
    amount: 420,
    status: 'PENDING',
    riskLevel: 'LOW',
    fraudScore: 0.15,
    zone: 'Zone 1 - Andheri East',
    date: '2024-04-02',
    trigger: 'Heavy Rain',
    submittedAt: '2024-04-02T14:30:00Z'
  },
  {
    id: 'CLM-2024-002',
    workerId: 'WRK-12346',
    workerName: 'Priya Sharma',
    amount: 350,
    status: 'APPROVED',
    riskLevel: 'MEDIUM',
    fraudScore: 0.45,
    zone: 'Zone 2 - Bandra West',
    date: '2024-04-02',
    trigger: 'High AQI',
    submittedAt: '2024-04-02T12:15:00Z'
  },
  {
    id: 'CLM-2024-003',
    workerId: 'WRK-12347',
    workerName: 'Amit Singh',
    amount: 280,
    status: 'UNDER_REVIEW',
    riskLevel: 'HIGH',
    fraudScore: 0.75,
    zone: 'Zone 3 - Powai',
    date: '2024-04-01',
    trigger: 'Local Restriction',
    submittedAt: '2024-04-01T16:45:00Z'
  },
  {
    id: 'CLM-2024-004',
    workerId: 'WRK-12348',
    workerName: 'Sneha Patel',
    amount: 500,
    status: 'REJECTED',
    riskLevel: 'CRITICAL',
    fraudScore: 0.92,
    zone: 'Zone 1 - Andheri East',
    date: '2024-04-01',
    trigger: 'Heavy Rain',
    submittedAt: '2024-04-01T11:20:00Z'
  },
  {
    id: 'CLM-2024-005',
    workerId: 'WRK-12349',
    workerName: 'Rajesh Gupta',
    amount: 400,
    status: 'PROCESSING',
    riskLevel: 'LOW',
    fraudScore: 0.20,
    zone: 'Zone 4 - Malad West',
    date: '2024-04-02',
    trigger: 'Extreme Heat',
    submittedAt: '2024-04-02T09:10:00Z'
  },
  {
    id: 'CLM-2024-006',
    workerId: 'WRK-12350',
    workerName: 'Meera Joshi',
    amount: 320,
    status: 'APPROVED',
    riskLevel: 'MEDIUM',
    fraudScore: 0.35,
    zone: 'Zone 5 - Goregaon East',
    date: '2024-04-01',
    trigger: 'Heavy Rain',
    submittedAt: '2024-04-01T18:30:00Z'
  }
];

export default function ClaimsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [zoneFilter, setZoneFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const filteredClaims = useMemo(() => {
    return MOCK_CLAIMS.filter(claim => {
      const matchesSearch = searchTerm === '' || 
        claim.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.workerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.workerId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || claim.status === statusFilter;
      const matchesRisk = riskFilter === 'ALL' || claim.riskLevel === riskFilter;
      const matchesZone = zoneFilter === 'ALL' || claim.zone.includes(zoneFilter);
      
      return matchesSearch && matchesStatus && matchesRisk && matchesZone;
    });
  }, [searchTerm, statusFilter, riskFilter, zoneFilter]);

  const stats = useMemo(() => {
    const total = MOCK_CLAIMS.length;
    const approved = MOCK_CLAIMS.filter(c => c.status === 'APPROVED').length;
    const pending = MOCK_CLAIMS.filter(c => c.status === 'PENDING').length;
    const underReview = MOCK_CLAIMS.filter(c => c.status === 'UNDER_REVIEW').length;
    const processing = MOCK_CLAIMS.filter(c => c.status === 'PROCESSING').length;
    const rejected = MOCK_CLAIMS.filter(c => c.status === 'REJECTED').length;
    
    return { total, approved, pending, underReview, processing, rejected };
  }, []);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'success';
      case 'REJECTED': return 'danger';
      case 'PENDING': return 'warning';
      case 'PROCESSING': return 'primary';
      case 'UNDER_REVIEW': return 'secondary';
      default: return 'neutral';
    }
  };

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'success';
      case 'MEDIUM': return 'warning';
      case 'HIGH': return 'danger';
      case 'CRITICAL': return 'danger';
      default: return 'neutral';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-text-primary mb-2">
          Claims Management
        </h1>
        <p className="text-text-secondary">
          Comprehensive claims processing and management interface
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold text-text-primary">{stats.total}</div>
          <div className="text-sm text-text-secondary">Total Claims</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          <div className="text-sm text-text-secondary">Approved</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
          <div className="text-sm text-text-secondary">Pending</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.underReview}</div>
          <div className="text-sm text-text-secondary">Under Review</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-indigo-600">{stats.processing}</div>
          <div className="text-sm text-text-secondary">Processing</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          <div className="text-sm text-text-secondary">Rejected</div>
        </Card>
      </div>

      {/* Filters and View Toggle */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
            <Input
              placeholder="Search claims, workers, IDs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'APPROVED', label: 'Approved' },
                { value: 'REJECTED', label: 'Rejected' },
                { value: 'PROCESSING', label: 'Processing' },
                { value: 'UNDER_REVIEW', label: 'Under Review' }
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="Filter by status"
            />
            <Select
              options={[
                { value: 'ALL', label: 'All Risk Levels' },
                { value: 'LOW', label: 'Low Risk' },
                { value: 'MEDIUM', label: 'Medium Risk' },
                { value: 'HIGH', label: 'High Risk' },
                { value: 'CRITICAL', label: 'Critical Risk' }
              ]}
              value={riskFilter}
              onChange={setRiskFilter}
              placeholder="Filter by risk"
            />
            <Select
              options={[
                { value: 'ALL', label: 'All Zones' },
                { value: 'Zone 1', label: 'Zone 1' },
                { value: 'Zone 2', label: 'Zone 2' },
                { value: 'Zone 3', label: 'Zone 3' },
                { value: 'Zone 4', label: 'Zone 4' },
                { value: 'Zone 5', label: 'Zone 5' }
              ]}
              value={zoneFilter}
              onChange={setZoneFilter}
              placeholder="Filter by zone"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'secondary'}
              onClick={() => setViewMode('grid')}
              size="sm"
            >
              Grid
            </Button>
            <Button
              variant={viewMode === 'table' ? 'primary' : 'secondary'}
              onClick={() => setViewMode('table')}
              size="sm"
            >
              Table
            </Button>
          </div>
        </div>

        <div className="text-sm text-text-secondary">
          Showing {filteredClaims.length} of {stats.total} claims
        </div>
      </Card>

      {/* Claims List */}
      <AnimatePresence mode="wait">
        {filteredClaims.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="p-12 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-text-primary mb-2">No claims found</h3>
              <p className="text-text-secondary">Try adjusting your search or filters</p>
            </Card>
          </motion.div>
        ) : viewMode === 'grid' ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid gap-4"
          >
            {filteredClaims.map((claim) => (
              <Card key={claim.id} className="p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <h3 className="font-mono font-semibold text-text-primary">{claim.id}</h3>
                      <Badge variant={getStatusBadgeVariant(claim.status)}>
                        {claim.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant={getRiskBadgeVariant(claim.riskLevel)}>
                        {claim.riskLevel} RISK
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
                      <div>
                        <div className="text-text-secondary">Worker</div>
                        <div className="font-medium">{claim.workerName}</div>
                        <div className="text-xs text-text-muted font-mono">{claim.workerId}</div>
                      </div>
                      <div>
                        <div className="text-text-secondary">Amount</div>
                        <div className="font-semibold text-lg">₹{claim.amount}</div>
                      </div>
                      <div>
                        <div className="text-text-secondary">Fraud Score</div>
                        <div className={\`font-medium \${
                          claim.fraudScore > 0.7 ? 'text-red-600' :
                          claim.fraudScore > 0.4 ? 'text-amber-600' : 'text-green-600'
                        }\`}>
                          {(claim.fraudScore * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-text-secondary">Zone</div>
                        <div className="font-medium">{claim.zone}</div>
                      </div>
                      <div>
                        <div className="text-text-secondary">Trigger</div>
                        <div className="font-medium">{claim.trigger}</div>
                      </div>
                      <div>
                        <div className="text-text-secondary">Submitted</div>
                        <div className="font-medium">{formatDate(claim.submittedAt)}</div>
                        <div className="text-xs text-text-muted">{formatTime(claim.submittedAt)}</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4 border-t border-gray-100">
                  <Button variant="secondary" size="sm">
                    View Details
                  </Button>
                  {claim.status === 'PENDING' && (
                    <>
                      <Button variant="primary" size="sm">
                        Approve
                      </Button>
                      <Button variant="danger" size="sm">
                        Reject
                      </Button>
                    </>
                  )}
                  {claim.status === 'UNDER_REVIEW' && (
                    <Button variant="primary" size="sm">
                      Continue Review
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="table"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-subtle">
                    <tr>
                      <th className="text-left p-4 font-medium text-text-secondary">Claim ID</th>
                      <th className="text-left p-4 font-medium text-text-secondary">Worker</th>
                      <th className="text-left p-4 font-medium text-text-secondary">Amount</th>
                      <th className="text-left p-4 font-medium text-text-secondary">Status</th>
                      <th className="text-left p-4 font-medium text-text-secondary">Risk</th>
                      <th className="text-left p-4 font-medium text-text-secondary">Fraud Score</th>
                      <th className="text-left p-4 font-medium text-text-secondary">Zone</th>
                      <th className="text-left p-4 font-medium text-text-secondary">Submitted</th>
                      <th className="text-left p-4 font-medium text-text-secondary">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClaims.map((claim) => (
                      <tr key={claim.id} className="border-t border-gray-100 hover:bg-surface-subtle transition-colors">
                        <td className="p-4">
                          <div className="font-mono font-medium">{claim.id}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium">{claim.workerName}</div>
                          <div className="text-xs text-text-muted font-mono">{claim.workerId}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold">₹{claim.amount}</div>
                        </td>
                        <td className="p-4">
                          <Badge variant={getStatusBadgeVariant(claim.status)}>
                            {claim.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Badge variant={getRiskBadgeVariant(claim.riskLevel)}>
                            {claim.riskLevel}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className={\`font-medium \${
                            claim.fraudScore > 0.7 ? 'text-red-600' :
                            claim.fraudScore > 0.4 ? 'text-amber-600' : 'text-green-600'
                          }\`}>
                            {(claim.fraudScore * 100).toFixed(1)}%
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">{claim.zone}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">{formatDate(claim.submittedAt)}</div>
                          <div className="text-xs text-text-muted">{formatTime(claim.submittedAt)}</div>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-1">
                            <Button variant="secondary" size="sm">View</Button>
                            {claim.status === 'PENDING' && (
                              <>
                                <Button variant="primary" size="sm">✓</Button>
                                <Button variant="danger" size="sm">✗</Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}`;

// Write the page file
const pageFilePath = path.join(claimsDir, 'page.tsx');
fs.writeFileSync(pageFilePath, claimsPageContent);
console.log('Created claims page.tsx');

console.log('Claims page setup complete!');