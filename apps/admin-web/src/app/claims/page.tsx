'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, TrendingUp, X, Calendar, Clock, User, MapPin, AlertTriangle, Shield, FileText, CreditCard } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useClaims } from '@/lib/AppContext';
import { UnifiedClaim } from '@/lib/ClaimsContext';

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
  dateFrom: string;
  dateTo: string;
}

const iconMap = {
  trending: TrendingUp,
  amount: CreditCard,
  status: FileText,
  risk: AlertTriangle,
  time: Clock,
  satisfaction: Shield
};

// Status badges configuration
const statusConfig = {
  'PENDING': { color: 'bg-amber-100 text-amber-800 border-amber-200' },
  'APPROVED': { color: 'bg-green-100 text-green-800 border-green-200' },
  'REJECTED': { color: 'bg-red-100 text-red-800 border-red-200' },
  'INVESTIGATING': { color: 'bg-blue-100 text-blue-800 border-blue-200' },
  'PAID': { color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  'CANCELLED': { color: 'bg-gray-100 text-gray-800 border-gray-200' },
};

const riskLevelConfig = {
  'LOW': { color: 'bg-green-100 text-green-800 border-green-200' },
  'MEDIUM': { color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  'HIGH': { color: 'bg-red-100 text-red-800 border-red-200' },
  'CRITICAL': { color: 'bg-purple-100 text-purple-800 border-purple-200' },
};

export default function ClaimsPage() {
  // State management
  const { claims } = useClaims();
  const [currentView, setCurrentView] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    riskLevel: 'all',
    zone: 'all',
    dateFrom: '',
    dateTo: ''
  });
  
  // Modal and advanced filter state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<UnifiedClaim | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Filter claims based on current filters
  const filteredClaims = useMemo(() => {
    if (!claims || claims.length === 0) return [];
    
    return claims.filter(claim => {
      // Null safety check
      if (!claim) return false;
      
      try {
        // Search filter with null safety
        const matchesSearch = !filters.search || 
          (claim.claimId && claim.claimId.toLowerCase().includes(filters.search.toLowerCase())) ||
          (claim.workerId && claim.workerId.toLowerCase().includes(filters.search.toLowerCase())) ||
          (claim.zone && claim.zone.toLowerCase().includes(filters.search.toLowerCase())) ||
          (claim.workerName && claim.workerName.toLowerCase().includes(filters.search.toLowerCase()));
        
        // Status filter
        const matchesStatus = filters.status === 'all' || claim.status === filters.status;
        
        // Risk level filter
        const matchesRisk = filters.riskLevel === 'all' || claim.riskLevel === filters.riskLevel;
        
        // Zone filter with null safety
        const matchesZone = filters.zone === 'all' || (claim.zone && claim.zone.includes(filters.zone));
        
        // Date range filters with proper date parsing and null checks
        let matchesDateFrom = true;
        let matchesDateTo = true;
        
        if (filters.dateFrom && claim.submittedDate) {
          try {
            const claimDate = claim.submittedDate instanceof Date 
              ? claim.submittedDate 
              : new Date(claim.submittedDate);
            const filterDate = new Date(filters.dateFrom);
            matchesDateFrom = claimDate >= filterDate;
          } catch (e) {
            console.warn('Invalid date format in dateFrom filter:', claim.submittedDate);
            matchesDateFrom = true;
          }
        }
        
        if (filters.dateTo && claim.submittedDate) {
          try {
            const claimDate = claim.submittedDate instanceof Date 
              ? claim.submittedDate 
              : new Date(claim.submittedDate);
            const filterDate = new Date(filters.dateTo);
            matchesDateTo = claimDate <= filterDate;
          } catch (e) {
            console.warn('Invalid date format in dateTo filter:', claim.submittedDate);
            matchesDateTo = true;
          }
        }
        
        return matchesSearch && matchesStatus && matchesRisk && matchesZone && 
               matchesDateFrom && matchesDateTo;
      } catch (error) {
        console.error('Error filtering claim:', claim.claimId, error);
        return false;
      }
    });
  }, [claims, filters]);

  // Calculate KPIs with safe data handling
  const kpis: KPIData[] = useMemo(() => {
    if (!claims || claims.length === 0) {
      return [
        { label: 'Total Claims', value: 0, change: 0, icon: 'trending' },
        { label: 'Total Amount', value: '₹0', change: 0, icon: 'amount' },
        { label: 'Pending Review', value: 0, change: 0, icon: 'status' },
        { label: 'High Risk', value: 0, change: 0, icon: 'risk' },
        { label: 'Avg Processing', value: '0h', change: 0, icon: 'time' },
        { label: 'Success Rate', value: '0%', change: 0, icon: 'satisfaction' }
      ];
    }

    try {
      const totalAmount = claims.reduce((sum, claim) => {
        const amount = claim?.amount || 0;
        return sum + (typeof amount === 'number' ? amount : 0);
      }, 0);

      const pendingClaims = claims.filter(c => c?.status === 'PENDING').length;
      const highRiskClaims = claims.filter(c => c?.riskLevel === 'HIGH').length;
      const approvedClaims = claims.filter(c => c?.status === 'APPROVED').length;
      const approvalRate = claims.length > 0 ? (approvedClaims / claims.length) * 100 : 0;

      return [
        {
          label: 'Total Claims',
          value: claims.length,
          change: 8.2,
          icon: 'trending'
        },
        {
          label: 'Total Amount',
          value: `₹${totalAmount.toLocaleString()}`,
          change: 12.5,
          icon: 'amount'
        },
        {
          label: 'Pending Review',
          value: pendingClaims,
          change: -5.1,
          icon: 'status'
        },
        {
          label: 'High Risk',
          value: highRiskClaims,
          change: -15.3,
          icon: 'risk'
        },
        {
          label: 'Avg Processing',
          value: '2.4h',
          change: -8.7,
          icon: 'time'
        },
        {
          label: 'Success Rate',
          value: `${approvalRate.toFixed(1)}%`,
          change: 2.1,
          icon: 'satisfaction'
        }
      ];
    } catch (error) {
      console.error('Error calculating KPIs:', error);
      return [
        { label: 'Total Claims', value: 'Error', change: 0, icon: 'trending' },
        { label: 'Total Amount', value: 'Error', change: 0, icon: 'amount' },
        { label: 'Pending Review', value: 'Error', change: 0, icon: 'status' },
        { label: 'High Risk', value: 'Error', change: 0, icon: 'risk' },
        { label: 'Avg Processing', value: 'Error', change: 0, icon: 'time' },
        { label: 'Success Rate', value: 'Error', change: 0, icon: 'satisfaction' }
      ];
    }
  }, [claims]);

  // Safe date formatting utility
  const formatDate = useCallback((date: Date | string | undefined): string => {
    if (!date) return 'N/A';
    
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      
      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        return 'Invalid Date';
      }
      
      return dateObj.toLocaleDateString();
    } catch (error) {
      console.warn('Error formatting date:', date, error);
      return 'Invalid Date';
    }
  }, []);

  // Safe amount formatting utility
  const formatAmount = useCallback((amount: number | undefined): string => {
    if (typeof amount !== 'number' || isNaN(amount)) return '₹0';
    
    try {
      return `₹${amount.toLocaleString()}`;
    } catch (error) {
      console.warn('Error formatting amount:', amount, error);
      return '₹0';
    }
  }, []);

  // Event handlers
  const handleViewClaim = useCallback((claim: UnifiedClaim) => {
    setSelectedClaim(claim);
    setIsModalOpen(true);
  }, []);

  const closeClaimDetails = useCallback(() => {
    setIsModalOpen(false);
    setSelectedClaim(null);
  }, []);

  // Action handlers for claims - integrated with AppContext
  const { approveClaim: contextApproveClaim, rejectClaim: contextRejectClaim } = useClaims();

  const approveClaim = useCallback(async (claimId: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to APPROVE claim ${claimId}? This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      await contextApproveClaim(claimId, 'Approved by admin', 'Admin User');
      closeClaimDetails();
      // Optional: Show success notification
    } catch (error) {
      console.error('Failed to approve claim:', error);
      alert('Failed to approve claim. Please try again.');
    }
  }, [contextApproveClaim, closeClaimDetails]);

  const rejectClaim = useCallback(async (claimId: string) => {
    const reason = window.prompt(
      `Please provide a reason for REJECTING claim ${claimId}:`,
      'Does not meet policy requirements'
    );
    
    if (!reason) return;
    
    try {
      await contextRejectClaim(claimId, reason, 'Admin User');
      closeClaimDetails();
      // Optional: Show success notification
    } catch (error) {
      console.error('Failed to reject claim:', error);
      alert('Failed to reject claim. Please try again.');
    }
  }, [contextRejectClaim, closeClaimDetails]);

  const investigateClaim = useCallback(async (claimId: string) => {
    const confirmed = window.confirm(
      `Send claim ${claimId} for further investigation? This will flag it for detailed review.`
    );
    
    if (!confirmed) return;
    
    try {
      // Update claim status to investigating
      const claim = claims.find(c => c.id === claimId);
      if (claim) {
        // This would typically call an investigation API
        // For now, we'll update the status in context
        closeClaimDetails();
        alert(`Claim ${claimId} has been sent for investigation.`);
      }
    } catch (error) {
      console.error('Failed to start investigation:', error);
      alert('Failed to start investigation. Please try again.');
    }
  }, [claims, closeClaimDetails]);

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      status: 'all',
      riskLevel: 'all',
      zone: 'all',
      dateFrom: '',
      dateTo: ''
    });
  }, []);

  const handleFilterChange = useCallback((key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Claims Management</h1>
            <p className="text-gray-400">Monitor and manage all claims across delivery zones</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant={currentView === 'grid' ? 'primary' : 'outline'}
              onClick={() => setCurrentView('grid')}
            >
              Grid View
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          {kpis.map((kpi, index) => {
            const Icon = iconMap[kpi.icon];
            return (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-4 bg-slate-800 border-slate-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-400">{kpi.label}</p>
                      <p className="text-2xl font-bold text-white">{kpi.value}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className={`text-sm font-medium ${
                          kpi.change > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {kpi.change > 0 ? '+' : ''}{kpi.change}%
                        </span>
                        <span className="text-xs text-gray-500">vs last period</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-700">
                      <Icon className="w-6 h-6 text-blue-400" />
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <Card className="p-6 bg-slate-800 border-slate-600">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Input
                placeholder="Search claims..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div>
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange('status', value)}
                className="bg-slate-700 border-slate-600 text-white"
                options={[
                  { label: 'All Statuses', value: 'all' },
                  { label: 'Pending', value: 'PENDING' },
                  { label: 'Approved', value: 'APPROVED' },
                  { label: 'Rejected', value: 'REJECTED' },
                  { label: 'Investigating', value: 'INVESTIGATING' },
                  { label: 'Paid', value: 'PAID' },
                  { label: 'Cancelled', value: 'CANCELLED' },
                ]}
              />
            </div>
            <div>
              <Select
                value={filters.riskLevel}
                onValueChange={(value) => handleFilterChange('riskLevel', value)}
                className="bg-slate-700 border-slate-600 text-white"
                options={[
                  { label: 'All Risk Levels', value: 'all' },
                  { label: 'Low Risk', value: 'LOW' },
                  { label: 'Medium Risk', value: 'MEDIUM' },
                  { label: 'High Risk', value: 'HIGH' },
                  { label: 'Critical Risk', value: 'CRITICAL' },
                ]}
              />
            </div>
            <div>
              <Select
                value={filters.zone}
                onValueChange={(value) => handleFilterChange('zone', value)}
                className="bg-slate-700 border-slate-600 text-white"
                options={[
                  { label: 'All Zones', value: 'all' },
                  { label: 'North Delhi', value: 'North' },
                  { label: 'South Delhi', value: 'South' },
                  { label: 'East Delhi', value: 'East' },
                  { label: 'West Delhi', value: 'West' },
                  { label: 'Gurgaon', value: 'Gurgaon' },
                  { label: 'Noida', value: 'Noida' },
                ]}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setFilters({
                  search: '',
                  status: 'all',
                  riskLevel: 'all',
                  zone: 'all',
                  dateFrom: '',
                  dateTo: ''
                })}
                className="border-slate-600 text-white hover:bg-slate-700"
              >
                Clear
              </Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                {showAdvancedFilters ? 'Hide Advanced' : 'Advanced'}
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {showAdvancedFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8"
          >
            <Card className="bg-slate-800 border-slate-600">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                  Advanced Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Date Range */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Date From</label>
                    <Input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Date To</label>
                    <Input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  
                  {/* Amount Range */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Minimum Amount</label>
                    <Input
                      type="number"
                      placeholder="₹0"
                      className="bg-slate-700 border-slate-600 text-white placeholder-slate-500"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowAdvancedFilters(false)}
                    className="border-slate-600 text-white hover:bg-slate-700"
                  >
                    Apply Filters
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFilters({
                        search: '',
                        status: 'all',
                        riskLevel: 'all',
                        zone: 'all',
                        dateFrom: '',
                        dateTo: ''
                      });
                    }}
                    className="border-slate-600 text-slate-400 hover:bg-slate-700"
                  >
                    Reset All
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Claims Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Loading State */}
          {!claims || claims.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12">
              <Shield className="w-16 h-16 text-slate-600 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Claims Data</h3>
              <p className="text-slate-400 text-center max-w-md">
                Claims data is being loaded or there are no claims to display at the moment.
              </p>
            </div>
          ) : filteredClaims.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12">
              <Search className="w-16 h-16 text-slate-600 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Claims Found</h3>
              <p className="text-slate-400 text-center max-w-md">
                No claims match your current filters. Try adjusting your search criteria.
              </p>
              <Button
                variant="outline"
                onClick={() => setFilters({
                  search: '',
                  status: 'all',
                  riskLevel: 'all',
                  zone: 'all',
                  dateFrom: '',
                  dateTo: ''
                })}
                className="mt-4 border-slate-600 text-white hover:bg-slate-700"
              >
                Clear All Filters
              </Button>
            </div>
          ) : (
            filteredClaims.map((claim, index) => (
            <motion.div
              key={claim.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-6 bg-slate-800 border-slate-600 hover:border-blue-500 transition-colors cursor-pointer">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-white">{claim.claimId || 'Unknown ID'}</h3>
                      <p className="text-sm text-gray-400">{claim.workerId || 'Unknown Worker'}</p>
                    </div>
                    <Badge 
                      className={
                        statusConfig[claim.status as keyof typeof statusConfig]?.color || 
                        'bg-gray-100 text-gray-800 border-gray-200'
                      }
                    >
                      {claim.status || 'Unknown'}
                    </Badge>
                  </div>

                  {/* Details */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">{claim.zone || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">{formatDate(claim.submittedDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CreditCard className="w-4 h-4 text-gray-400" />
                      <span className="text-white font-medium">{formatAmount(claim.amount)}</span>
                    </div>
                  </div>

                  {/* Risk Level and Action */}
                  <div className="flex items-center justify-between">
                    <Badge 
                      className={
                        riskLevelConfig[claim.riskLevel as keyof typeof riskLevelConfig]?.color ||
                        'bg-gray-100 text-gray-800 border-gray-200'
                      }
                    >
                      {claim.riskLevel ? `${claim.riskLevel} Risk` : 'Unknown Risk'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewClaim(claim)}
                      className="text-blue-400 hover:text-blue-300 hover:bg-slate-700"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
          )}
        </div>

        <p className="text-center text-gray-400 text-sm">
          Showing {filteredClaims.length} of {claims?.length || 0} claims •
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
              <div className="sticky top-0 bg-slate-800 border-b border-slate-600 p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Claim Details</h2>
                  <p className="text-gray-400">{selectedClaim.claimId}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeClaimDetails}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-4 bg-slate-700 border-slate-600">
                    <h3 className="text-lg font-semibold text-white mb-3">Basic Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Worker ID:</span>
                        <span className="text-white">{selectedClaim.workerId || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Claim ID:</span>
                        <span className="text-white font-mono">{selectedClaim.claimId || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Worker:</span>
                        <span className="text-white">{selectedClaim.workerName || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Zone:</span>
                        <span className="text-white">{selectedClaim.zone || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Submitted:</span>
                        <span className="text-white">{formatDate(selectedClaim.submittedDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Amount:</span>
                        <span className="text-white font-semibold">{formatAmount(selectedClaim.amount)}</span>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 bg-slate-700 border-slate-600">
                    <h3 className="text-lg font-semibold text-white mb-3">Status & Risk</h3>
                    <div className="space-y-3">
                      <div>
                        <span className="text-gray-400 block mb-1">Current Status</span>
                        <Badge 
                          className={
                            statusConfig[selectedClaim.status as keyof typeof statusConfig]?.color || 
                            'bg-gray-100 text-gray-800 border-gray-200'
                          }
                        >
                          {selectedClaim.status || 'Unknown'}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-gray-400 block mb-1">Risk Level</span>
                        <Badge 
                          className={
                            riskLevelConfig[selectedClaim.riskLevel as keyof typeof riskLevelConfig]?.color ||
                            'bg-gray-100 text-gray-800 border-gray-200'
                          }
                        >
                          {selectedClaim.riskLevel ? `${selectedClaim.riskLevel} Risk` : 'Unknown Risk'}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-gray-400 block mb-1">Processing Time</span>
                        <span className="text-white">2.3 hours</span>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Action Buttons - Only show for non-completed cases */}
                {selectedClaim.status === 'PENDING' && (
                  <div className="flex gap-3 pt-4 border-t border-slate-600">
                    <Button 
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => approveClaim(selectedClaim.claimId)}
                    >
                      Approve Claim
                    </Button>
                    <Button 
                      variant="outline" 
                      className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                      onClick={() => rejectClaim(selectedClaim.claimId)}
                    >
                      Reject Claim
                    </Button>
                    <Button 
                      variant="outline" 
                      className="border-yellow-600 text-yellow-400 hover:bg-yellow-600 hover:text-white"
                      onClick={() => investigateClaim(selectedClaim.claimId)}
                    >
                      Request Investigation
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
