'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, TrendingUp, X, Calendar, Clock, User, MapPin, AlertTriangle, Shield, FileText, CreditCard } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useClaims, UnifiedClaim } from '@/lib/ClaimsContext';

// Types
interface KPIData {
  label: string;
  value: string | number;
  change: number;
  icon: 'trending' | 'amount' | 'status' | 'risk' | 'time' | 'satisfaction';
}

interface FilterState {
  search: string;
  status: string;
  riskLevel: string;
  zone: string;
}

// Constants
const STATUSES = ['All Status', 'PENDING', 'APPROVED', 'REJECTED', 'INVESTIGATING', 'PAID', 'CANCELLED'];
const RISK_LEVELS = ['All Risk Levels', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

// Component
export default function ClaimsPage() {
  const { claims, approveClaim, rejectClaim, investigateClaim } = useClaims();
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'All Status',
    riskLevel: 'All Risk Levels',
    zone: 'All Zones',
  });
  const [selectedClaim, setSelectedClaim] = useState<UnifiedClaim | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Modal handler functions
  const openClaimDetails = useCallback((claim: UnifiedClaim) => {
    setSelectedClaim(claim);
    setIsModalOpen(true);
  }, []);

  const closeClaimDetails = useCallback(() => {
    setSelectedClaim(null);
    setIsModalOpen(false);
  }, []);

  // Handle keyboard accessibility for modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        closeClaimDetails();
      }
    };

    if (isModalOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen, closeClaimDetails]);

  // Calculate real-time KPIs from actual claims data
  const kpiData = useMemo(() => {
    const totalClaims = claims.length;
    const todayClaims = claims.filter(c => 
      new Date(c.submittedDate).toDateString() === new Date().toDateString()
    ).length;

    const totalAmount = claims.reduce((sum, claim) => sum + claim.amount, 0);
    const todayAmount = claims
      .filter(c => new Date(c.submittedDate).toDateString() === new Date().toDateString())
      .reduce((sum, claim) => sum + claim.amount, 0);

    const approvedClaims = claims.filter(c => c.status === 'APPROVED').length;
    const approvalRate = totalClaims > 0 ? (approvedClaims / totalClaims) * 100 : 0;

    const highRiskClaims = claims.filter(c => 
      c.riskLevel === 'CRITICAL' || c.riskLevel === 'HIGH'
    ).length;

    const avgProcessingTime = claims.length > 0 
      ? claims.reduce((sum, c) => sum + (c.processingDays || 0), 0) / claims.length 
      : 0;

    const satisfaction = 4.6; // Mock satisfaction score

    return [
      { label: 'Total Claims (Today)', value: todayClaims, change: 12.5, icon: 'trending' as const },
      { label: 'Total Amount (Today)', value: `₹${(todayAmount / 100000).toFixed(1)}L`, change: 8.3, icon: 'amount' as const },
      { label: 'Approved Rate', value: `${approvalRate.toFixed(1)}%`, change: 2.1, icon: 'status' as const },
      { label: 'High Risk Claims', value: highRiskClaims, change: -5.2, icon: 'risk' as const },
      { label: 'Avg Processing Time', value: `${avgProcessingTime.toFixed(1)}h`, change: -1.8, icon: 'time' as const },
      { label: 'Worker Satisfaction', value: `${satisfaction}/5`, change: 3.4, icon: 'satisfaction' as const },
    ];
  }, [claims]);

  // Dynamic zones from actual data
  const zones = useMemo(() => {
    const uniqueZones = [...new Set(claims.map(c => c.zone))];
    return ['All Zones', ...uniqueZones.sort()];
  }, [claims]);

  // Filter claims based on filters
  const filteredClaims = useMemo(() => {
    return claims.filter((claim) => {
      const matchesSearch =
        claim.claimId.toLowerCase().includes(filters.search.toLowerCase()) ||
        claim.workerName.toLowerCase().includes(filters.search.toLowerCase()) ||
        claim.workerId.toLowerCase().includes(filters.search.toLowerCase());

      const matchesStatus = filters.status === 'All Status' || claim.status === filters.status;
      const matchesRisk = filters.riskLevel === 'All Risk Levels' || claim.riskLevel === filters.riskLevel;
      const matchesZone = filters.zone === 'All Zones' || claim.zone === filters.zone;

      return matchesSearch && matchesStatus && matchesRisk && matchesZone;
    });
  }, [filters, claims]);

  // Helper functions
  const getStatusColor = (status: string): 'accent' | 'warning' | 'danger' | 'secondary' => {
    switch (status) {
      case 'APPROVED':
      case 'PAID':
        return 'accent';
      case 'PENDING':
        return 'secondary';
      case 'INVESTIGATING':
        return 'warning';
      case 'REJECTED':
      case 'CANCELLED':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const getRiskColor = (risk: string): 'accent' | 'warning' | 'danger' | 'secondary' => {
    switch (risk) {
      case 'CRITICAL':
        return 'danger';
      case 'HIGH':
        return 'warning';
      case 'MEDIUM':
        return 'secondary';
      case 'LOW':
        return 'accent';
      default:
        return 'secondary';
    }
  };

  const getKPIIcon = (icon: string) => {
    switch (icon) {
      case 'trending':
        return '📊';
      case 'amount':
        return '💰';
      case 'status':
        return '✅';
      case 'risk':
        return '⚠️';
      case 'time':
        return '⏱️';
      case 'satisfaction':
        return '😊';
      default:
        return '📈';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Claims Management</h1>
            <p className="text-slate-400">Monitor and manage all insurance claims</p>
          </div>
          <div className="text-6xl">🛡️</div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8"
      >
        {kpiData.map((kpi, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            whileHover={{ translateY: -4 }}
          >
            <Card className="bg-gradient-to-br from-slate-800 to-slate-700 border-slate-600 hover:border-slate-500 cursor-pointer transition-all">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-slate-400 text-sm font-medium">{kpi.label}</p>
                    <p className="text-white text-2xl font-bold mt-2">{kpi.value}</p>
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-3xl"
                  >
                    {getKPIIcon(kpi.icon)}
                  </motion.div>
                </div>
                <div
                  className={`mt-4 text-sm font-semibold ${
                    kpi.change >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {kpi.change >= 0 ? '↑' : '↓'} {Math.abs(kpi.change)}% from yesterday
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Filters Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-8"
      >
        <Card className="bg-slate-800 border-slate-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-400" />
              Advanced Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <Input
                  placeholder="Search by Claim ID, Worker name..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10 bg-slate-700 border-slate-600 text-white placeholder-slate-500"
                />
              </div>

              {/* Status Filter */}
              <Select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>

              {/* Risk Level Filter */}
              <Select
                value={filters.riskLevel}
                onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              >
                {RISK_LEVELS.map((risk) => (
                  <option key={risk} value={risk}>
                    {risk}
                  </option>
                ))}
              </Select>

              {/* Zone Filter */}
              <Select
                value={filters.zone}
                onChange={(e) => setFilters({ ...filters, zone: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              >
                {zones.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Claims List - Grid View */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {filteredClaims.length > 0 ? (
          filteredClaims.map((claim, index) => (
            <motion.div
              key={claim.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileHover={{ translateY: -4 }}
            >
              <Card className="bg-gradient-to-br from-slate-800 to-slate-700 border-slate-600 hover:border-slate-500 cursor-pointer transition-all h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-white text-lg">
                        {claim.claimId}
                      </CardTitle>
                      <p className="text-slate-400 text-xs mt-1">{claim.workerId}</p>
                    </div>
                    <Badge color={getStatusColor(claim.status)}>
                      {claim.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-slate-400 text-xs font-semibold mb-1">WORKER</p>
                    <p className="text-white font-medium">{claim.workerName}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-slate-400 text-xs font-semibold mb-1">AMOUNT</p>
                      <p className="text-white font-bold text-lg">
                        ₹{claim.amount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs font-semibold mb-1">ZONE</p>
                      <p className="text-white font-medium">{claim.zone}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-slate-400 text-xs font-semibold mb-1">RISK LEVEL</p>
                      <Badge color={getRiskColor(claim.riskLevel)}>
                        {claim.riskLevel}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs font-semibold mb-1">
                        PROCESSING DAYS
                      </p>
                      <p className="text-white font-medium">
                        {claim.processingDays.toFixed(1)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-slate-400 text-xs font-semibold mb-1">SUBMITTED</p>
                    <p className="text-slate-300 text-sm">
                      {formatDate(new Date(claim.submittedDate))}
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      size="sm"
                      onClick={() => openClaimDetails(claim)}
                    >
                      View Details
                    </Button>
                    {(claim.status === 'PENDING' || claim.status === 'INVESTIGATING') && (
                      <>
                        <Button
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          size="sm"
                          onClick={() => approveClaim(claim.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                          size="sm"
                          onClick={() => rejectClaim(claim.id)}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {(claim.status === 'APPROVED' || claim.status === 'REJECTED' || 
                      claim.status === 'PAID' || claim.status === 'CANCELLED') && (
                      <Button
                        className="flex-1 bg-slate-500 text-slate-300"
                        size="sm"
                        disabled
                      >
                        Completed
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-slate-400 text-lg">
              No claims found matching your filters
            </p>
          </div>
        )}
      </motion.div>

      {/* Footer Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-8 text-center text-slate-400 text-sm"
      >
        <p>
          Showing {filteredClaims.length} of {claims.length} claims •
          Last updated: {new Date().toLocaleTimeString()}
        </p>
      </motion.div>

      {/* Claim Details Modal */}
      <AnimatePresence>
        {isModalOpen && selectedClaim && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={closeClaimDetails}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-slate-800 rounded-xl border border-slate-600 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-600">
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedClaim.claimId}</h2>
                  <p className="text-slate-400 text-sm">
                    Submitted {formatDate(new Date(selectedClaim.submittedDate))}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge color={getStatusColor(selectedClaim.status)}>
                    {selectedClaim.status}
                  </Badge>
                  <Button
                    className="bg-slate-700 hover:bg-slate-600 text-white p-2"
                    onClick={closeClaimDetails}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                {/* Worker Information */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <Card className="bg-slate-700 border-slate-600">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-400" />
                        Worker Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-slate-400 text-xs font-semibold mb-1">NAME</p>
                        <p className="text-white font-medium">{selectedClaim.workerName}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs font-semibold mb-1">WORKER ID</p>
                        <p className="text-white font-mono">{selectedClaim.workerId}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs font-semibold mb-1">ZONE</p>
                        <p className="text-white flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-green-400" />
                          {selectedClaim.zone}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-700 border-slate-600">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-green-400" />
                        Claim Amount
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-slate-400 text-xs font-semibold mb-1">CLAIMED AMOUNT</p>
                        <p className="text-white font-bold text-3xl">
                          ₹{selectedClaim.amount.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-slate-400 text-xs font-semibold mb-1">RISK LEVEL</p>
                          <Badge color={getRiskColor(selectedClaim.riskLevel)}>
                            {selectedClaim.riskLevel}
                          </Badge>
                        </div>
                        {selectedClaim.fraudScore !== undefined && (
                          <div>
                            <p className="text-slate-400 text-xs font-semibold mb-1">FRAUD SCORE</p>
                            <p className={`font-bold ${
                              selectedClaim.fraudScore > 0.7 ? 'text-red-400' :
                              selectedClaim.fraudScore > 0.4 ? 'text-yellow-400' : 'text-green-400'
                            }`}>
                              {(selectedClaim.fraudScore * 100).toFixed(0)}%
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Timeline & Processing */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <Card className="bg-slate-700 border-slate-600">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white flex items-center gap-2">
                        <Clock className="w-5 h-5 text-amber-400" />
                        Processing Timeline
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-slate-400 text-xs font-semibold mb-1">SUBMITTED</p>
                        <p className="text-white flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-400" />
                          {new Date(selectedClaim.submittedDate).toLocaleDateString('en-IN', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs font-semibold mb-1">PROCESSING DAYS</p>
                        <p className="text-white font-medium">
                          {selectedClaim.processingDays.toFixed(1)} days
                        </p>
                      </div>
                      {selectedClaim.reviewedBy && (
                        <div>
                          <p className="text-slate-400 text-xs font-semibold mb-1">REVIEWED BY</p>
                          <p className="text-white font-medium">{selectedClaim.reviewedBy}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Incident Details */}
                  <Card className="bg-slate-700 border-slate-600">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-400" />
                        Incident Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedClaim.incidentType && (
                        <div>
                          <p className="text-slate-400 text-xs font-semibold mb-1">TYPE</p>
                          <p className="text-white font-medium">{selectedClaim.incidentType}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-slate-400 text-xs font-semibold mb-1">DESCRIPTION</p>
                        <p className="text-white text-sm leading-relaxed">
                          {selectedClaim.description || 'No description provided'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Review Queue Specific Information */}
                {selectedClaim.slaDeadline && (
                  <Card className="bg-slate-700 border-slate-600 mb-6">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white flex items-center gap-2">
                        <Shield className="w-5 h-5 text-purple-400" />
                        Review Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-slate-400 text-xs font-semibold mb-1">SLA DEADLINE</p>
                          <p className="text-white font-medium">
                            {new Date(selectedClaim.slaDeadline).toLocaleString()}
                          </p>
                        </div>
                        {selectedClaim.triggeredRules && selectedClaim.triggeredRules.length > 0 && (
                          <div>
                            <p className="text-slate-400 text-xs font-semibold mb-1">TRIGGERED RULES</p>
                            <div className="flex flex-wrap gap-1">
                              {selectedClaim.triggeredRules.map((rule, index) => (
                                <Badge key={index} color="warning" className="text-xs">
                                  {rule.description}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedClaim.priority && (
                          <div>
                            <p className="text-slate-400 text-xs font-semibold mb-1">PRIORITY</p>
                            <Badge color={selectedClaim.priority === 'HIGH' ? 'danger' : 'secondary'}>
                              {selectedClaim.priority}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-slate-600">
                  {(selectedClaim.status === 'PENDING' || selectedClaim.status === 'INVESTIGATING') && (
                    <>
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => {
                          approveClaim(selectedClaim.id);
                          closeClaimDetails();
                        }}
                      >
                        Approve Claim
                      </Button>
                      <Button
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => {
                          rejectClaim(selectedClaim.id);
                          closeClaimDetails();
                        }}
                      >
                        Reject Claim
                      </Button>
                    </>
                  )}
                  <Button
                    className="bg-slate-600 hover:bg-slate-500 text-white px-6"
                    onClick={closeClaimDetails}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}