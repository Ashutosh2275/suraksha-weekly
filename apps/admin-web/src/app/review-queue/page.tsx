'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useClaims, UnifiedClaim } from '@/lib/ClaimsContext';
import { useReviewQueue } from '@/lib/ReviewQueueContext';

type FilterType = 'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM';
type SortType = 'SLA_DEADLINE' | 'FRAUD_SCORE' | 'TIME_SUBMITTED';

export default function ReviewQueue() {
  const { approveClaim, rejectClaim, getReviewQueueClaims, resetToMockData } = useClaims();
  const { pendingCount } = useReviewQueue();
  
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [sortBy, setSortBy] = useState<SortType>('SLA_DEADLINE');
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'EVIDENCE' | 'HISTORY'>('OVERVIEW');
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Get review queue claims from context
  const claims = getReviewQueueClaims();

  // Update current time every second for real-time SLA display
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const selectedClaim = claims.find(c => c.id === selectedClaimId);

  // Filter and sort claims
  const filteredClaims = claims
    .filter(claim => {
      if (filter === 'ALL') return true;
      return claim.riskLevel === filter;
    })
    .sort((a, b) => {
      // CRITICAL claims always on top
      if (a.riskLevel === 'CRITICAL' && b.riskLevel !== 'CRITICAL') return -1;
      if (b.riskLevel === 'CRITICAL' && a.riskLevel !== 'CRITICAL') return 1;
      
      switch (sortBy) {
        case 'SLA_DEADLINE':
          const aDeadline = a.slaDeadline?.getTime() || 0;
          const bDeadline = b.slaDeadline?.getTime() || 0;
          return aDeadline - bDeadline;
        case 'FRAUD_SCORE':
          return b.fraudScore - a.fraudScore;
        case 'TIME_SUBMITTED':
          return b.submittedDate.getTime() - a.submittedDate.getTime();
        default:
          return 0;
      }
    });

  const getRiskTierColor = (tier: string) => {
    switch (tier) {
      case 'CRITICAL': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'LOW': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getFraudScoreColor = (score: number) => {
    if (score >= 0.7) return 'bg-red-100 text-red-800';
    if (score >= 0.4) return 'bg-orange-100 text-orange-800';
    return 'bg-green-100 text-green-800';
  };

  const getSLATimeColor = (deadline?: Date) => {
    if (!deadline) return 'text-gray-400';
    const minutesLeft = Math.floor((deadline.getTime() - currentTime) / (1000 * 60));
    if (minutesLeft < 0) return 'text-red-600 font-bold';
    if (minutesLeft < 10) return 'text-red-600';
    if (minutesLeft < 30) return 'text-orange-600';
    return 'text-gray-600';
  };

  const formatSLATime = (deadline?: Date) => {
    if (!deadline) return 'No SLA';
    const minutesLeft = Math.floor((deadline.getTime() - currentTime) / (1000 * 60));
    if (minutesLeft < 0) return '🔔 OVERDUE';
    if (minutesLeft < 60) return `Due in ${minutesLeft}m`;
    const hoursLeft = Math.floor(minutesLeft / 60);
    return `Due in ${hoursLeft}h ${minutesLeft % 60}m`;
  };

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'rain': return '🌧️';
      case 'heat': return '🌡️';
      case 'aqi': return '🌫️';
      default: return '📍';
    }
  };

  const handleDecision = (decision: 'APPROVE' | 'REJECT') => {
    if (!selectedClaimId || !reviewerNotes.trim() || reviewerNotes.length < 20) return;
    
    const currentIndex = filteredClaims.findIndex(c => c.id === selectedClaimId);
    
    // Use Claims Context methods to update claim status
    if (decision === 'APPROVE') {
      approveClaim(selectedClaimId, reviewerNotes);
    } else {
      rejectClaim(selectedClaimId, reviewerNotes);
    }
    
    // Clear selection and notes
    setSelectedClaimId(null);
    setReviewerNotes('');
    
    // Show success toast (in real app)
    console.log(`Claim ${selectedClaimId} ${decision.toLowerCase()}ed with notes: ${reviewerNotes}`);
    
    // Auto-select next claim
    setTimeout(() => {
      const updatedClaims = getReviewQueueClaims();
      if (currentIndex < updatedClaims.length) {
        setSelectedClaimId(updatedClaims[currentIndex]?.id || updatedClaims[0]?.id || null);
      } else if (updatedClaims.length > 0) {
        setSelectedClaimId(updatedClaims[0]?.id || null);
      }
    }, 100);
  };

  // Stats
  const totalPending = claims.length;
  const atRiskCount = claims.filter(c => {
    if (!c.slaDeadline) return false;
    const minutesLeft = Math.floor((c.slaDeadline.getTime() - currentTime) / (1000 * 60));
    return minutesLeft < 30;
  }).length;

  // Reset queue function for testing
  const resetQueue = () => {
    resetToMockData();
    setSelectedClaimId(null);
    setReviewerNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-display font-bold text-text-primary mb-2">
            Review Queue
          </h1>
          <p className="text-text-secondary">
            Manual review for claims requiring human judgment · Air traffic control for insurance operations
          </p>
        </div>
        {claims.length === 0 && (
          <button
            onClick={resetQueue}
            className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors"
          >
            Reset Queue
          </button>
        )}
      </div>

      <div className="h-[calc(100vh-12rem)] flex gap-6">
        {/* Left Panel - Filters & Stats */}
        <div className="w-70 space-y-6">
          {/* Queue Stats */}
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <p className="text-4xl font-display font-bold text-text-primary">{totalPending}</p>
                <p className="text-sm text-text-secondary">pending</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">SLA Health</span>
                  <span className="text-orange-600 font-medium">{atRiskCount} at risk</span>
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${Math.min((atRiskCount / Math.max(totalPending, 1)) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </Card>

          {/* Filters */}
          <Card className="p-4">
            <h3 className="font-display font-semibold text-text-primary mb-4">Filters</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-text-secondary mb-2">Priority</p>
                <div className="flex flex-wrap gap-2">
                  {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'] as FilterType[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        filter === f
                          ? 'bg-brand-primary text-white shadow-sm'
                          : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                      }`}
                    >
                      {f}
                      {f !== 'ALL' && (
                        <span className="ml-1 text-xs">
                          ({claims.filter(c => c.riskLevel === f).length})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-text-secondary mb-2">Sort by</p>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortType)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                >
                  <option value="SLA_DEADLINE">SLA Deadline</option>
                  <option value="FRAUD_SCORE">Fraud Score</option>
                  <option value="TIME_SUBMITTED">Time Submitted</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Reviewer Stats */}
          <Card className="p-4">
            <h3 className="font-display font-semibold text-text-primary mb-3">Today's Performance</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Claims reviewed</span>
                <span className="font-semibold text-text-primary">8</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Avg review time</span>
                <span className="font-semibold text-text-primary">3m 42s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Approval rate</span>
                <span className="font-semibold text-green-600">87%</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Center Panel - Claims List */}
        <div className="flex-1">
          <Card className="h-full flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-semibold text-text-primary">
                  Claims Queue ({filteredClaims.length})
                </h2>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-text-secondary">Live</span>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <div className="sticky top-0 bg-gray-50 border-b border-gray-200 px-4 py-2 text-xs font-medium text-text-secondary">
                <div className="flex items-center">
                  <div className="w-8"></div> {/* Avatar space */}
                  <div className="w-24 ml-3">ID</div>
                  <div className="flex-1">Trigger & Zone</div>
                  <div className="w-16 text-center">Risk</div>
                  <div className="w-28 text-right">SLA</div>
                  <div className="w-20 text-right">Status</div>
                </div>
              </div>

              <AnimatePresence>
                {filteredClaims.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                        <path
                          d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">All done! 🎉</h3>
                    <p className="text-text-secondary mb-4">
                      No claims pending review. Great work clearing the queue!
                    </p>
                    <button
                      onClick={resetQueue}
                      className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors"
                    >
                      Reset Queue for Testing
                    </button>
                  </div>
                ) : (
                  filteredClaims.map((claim) => (
                  <motion.div
                    key={claim.id}
                    layout
                    initial={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100, transition: { duration: 0.2 } }}
                    className={`relative flex items-center h-12 px-4 border-b border-gray-100 cursor-pointer transition-colors ${
                      selectedClaimId === claim.id 
                        ? 'bg-indigo-50 border-l-4 border-l-indigo-500' 
                        : claim.riskLevel === 'CRITICAL' 
                        ? 'bg-red-50 border-l-4 border-l-red-500' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedClaimId(claim.id)}
                  >
                    {/* Worker Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white mr-3 ${getRiskTierColor(claim.riskLevel)}`}>
                      {claim.workerInitials}
                    </div>

                    {/* Claim ID */}
                    <div className="w-24 text-xs font-mono text-text-muted">
                      {claim.id.split('-').slice(-1)[0]}
                    </div>

                    {/* Trigger + Zone */}
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      <span className="text-lg">{getTriggerIcon(claim.triggerType || '')}</span>
                      <span className="text-sm text-text-primary truncate">{claim.zone}</span>
                    </div>

                    {/* Fraud Score */}
                    <div className="w-16 flex justify-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getFraudScoreColor(claim.fraudScore)}`}>
                        {Math.round(claim.fraudScore * 100)}%
                      </span>
                    </div>

                    {/* SLA Deadline */}
                    <div className="w-28 text-xs text-right">
                      <span className={getSLATimeColor(claim.slaDeadline)}>
                        {formatSLATime(claim.slaDeadline)}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="w-20 flex justify-end">
                      <Badge variant={claim.status === 'PENDING' ? 'warning' : 'secondary'}>
                        {claim.status}
                      </Badge>
                    </div>
                  </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </Card>
        </div>

        {/* Right Panel - Claim Detail */}
        <AnimatePresence>
          {selectedClaim && (
            <motion.div
              initial={{ opacity: 0, x: 400 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 400 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-100 flex flex-col"
            >
              <Card className="flex-1 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-text-primary font-medium">{selectedClaim.id}</span>
                      <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                          <rect x="6" y="6" width="4" height="4" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                      </button>
                    </div>
                    <Badge variant={selectedClaim.riskLevel === 'CRITICAL' ? 'danger' : selectedClaim.riskLevel === 'HIGH' ? 'warning' : 'secondary'}>
                      {selectedClaim.riskLevel}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-text-secondary">
                    <p className="font-medium">{selectedClaim.workerName}</p>
                    <p>{selectedClaim.platform} · {selectedClaim.zone}</p>
                  </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200">
                  <div className="flex">
                    {(['OVERVIEW', 'EVIDENCE', 'HISTORY'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === tab
                            ? 'border-brand-primary text-brand-primary bg-brand-primary/5'
                            : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-gray-50'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {activeTab === 'OVERVIEW' && (
                    <>
                      {/* Fraud Assessment */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-display font-semibold text-text-primary mb-4">Fraud Assessment</h4>
                        
                        <div className="flex items-center gap-6 mb-4">
                          <div className="text-center">
                            <div className={`text-4xl font-bold ${selectedClaim.fraudScore >= 0.7 ? 'text-red-600' : selectedClaim.fraudScore >= 0.4 ? 'text-orange-600' : 'text-green-600'}`}>
                              {Math.round(selectedClaim.fraudScore * 100)}%
                            </div>
                            <div className="text-sm text-text-secondary">Risk Score</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-semibold text-text-primary">{selectedClaim.mlScore?.toFixed(2) || 'N/A'}</div>
                            <div className="text-sm text-text-secondary">AI Signal</div>
                          </div>
                        </div>

                        {selectedClaim.triggeredRules && selectedClaim.triggeredRules.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-text-primary mb-3">Triggered Rules:</p>
                            <div className="space-y-2">
                              {selectedClaim.triggeredRules.map((rule) => (
                                <div key={rule.id} className={`flex items-center gap-3 p-2 rounded border-l-4 ${
                                  rule.severity === 'high' ? 'border-red-500 bg-red-50' : 
                                  rule.severity === 'medium' ? 'border-orange-500 bg-orange-50' : 
                                  'border-yellow-500 bg-yellow-50'
                                }`}>
                                  <span className="text-lg">{rule.icon}</span>
                                  <span className="text-sm text-text-primary">{rule.description}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Claim Details */}
                      <div>
                        <h4 className="font-display font-semibold text-text-primary mb-4">Claim Validation</h4>
                        
                        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                          <div className="flex items-center gap-2">
                            <span className={selectedClaim.evidence?.policyValid ? 'text-green-600' : 'text-red-600'}>
                              {selectedClaim.evidence?.policyValid ? '✓' : '✗'}
                            </span>
                            <span>Policy Valid</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={selectedClaim.evidence?.zoneOverlap ? 'text-green-600' : 'text-red-600'}>
                              {selectedClaim.evidence?.zoneOverlap ? '✓' : '✗'}
                            </span>
                            <span>Zone Match</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={selectedClaim.evidence?.waitingPeriodMet ? 'text-green-600' : 'text-red-600'}>
                              {selectedClaim.evidence?.waitingPeriodMet ? '✓' : '✗'}
                            </span>
                            <span>Waiting Period</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={selectedClaim.evidence?.gpsConsistent ? 'text-green-600' : 'text-red-600'}>
                              {selectedClaim.evidence?.gpsConsistent ? '✓' : '✗'}
                            </span>
                            <span>GPS Consistent</span>
                          </div>
                        </div>

                        <div className="bg-white border rounded-lg p-4">
                          <div className="flex justify-between items-center">
                            <span className="text-text-secondary">Calculated Payout</span>
                            <span className="text-2xl font-display font-bold text-text-primary">₹{(selectedClaim.payoutAmount || selectedClaim.amount)?.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {activeTab === 'EVIDENCE' && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-display font-semibold text-text-primary mb-4">Device History</h4>
                        <div className="space-y-2">
                          {selectedClaim.evidence?.deviceHistory?.map((device, idx) => (
                            <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded border">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">📱</span>
                                <span className="font-medium">{device.device}</span>
                              </div>
                              <span className="text-sm text-text-secondary">
                                {device.timestamp.toLocaleDateString()} {device.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-display font-semibold text-text-primary mb-4">Location Timeline</h4>
                        <div className="bg-gray-100 p-4 rounded-lg text-center text-text-secondary">
                          <div className="text-lg mb-2">📍</div>
                          <p className="text-sm">GPS consistency analysis and location timeline would be displayed here with interactive map visualization</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'HISTORY' && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-display font-semibold text-text-primary mb-4">Policy Timeline</h4>
                        
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 p-3 border-l-4 border-blue-500 bg-blue-50">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">1</div>
                            <div>
                              <p className="font-medium text-text-primary">Policy Purchased</p>
                              <p className="text-sm text-text-secondary">3 days ago</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-3 border-l-4 border-orange-500 bg-orange-50">
                            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm">2</div>
                            <div>
                              <p className="font-medium text-text-primary">Trigger Event Detected</p>
                              <p className="text-sm text-text-secondary">2 hours ago</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-3 border-l-4 border-green-500 bg-green-50">
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">3</div>
                            <div>
                              <p className="font-medium text-text-primary">Claim Auto-Generated</p>
                              <p className="text-sm text-text-secondary">
                                {Math.floor((Date.now() - selectedClaim.submittedDate.getTime()) / (1000 * 60))} minutes ago
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-3 border-l-4 border-gray-400 bg-gray-50">
                            <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-sm">4</div>
                            <div>
                              <p className="font-medium text-text-primary">Manual Review Required</p>
                              <p className="text-sm text-text-secondary">Pending your decision</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Decision Panel - Always Visible */}
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Decision Notes <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={reviewerNotes}
                        onChange={(e) => setReviewerNotes(e.target.value)}
                        placeholder="Document your review decision (minimum 20 characters required)..."
                        className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                        rows={3}
                      />
                      <div className="flex justify-between text-xs text-text-muted mt-1">
                        <span className={reviewerNotes.length < 20 ? 'text-red-500' : 'text-green-600'}>
                          {reviewerNotes.length}/20 minimum
                        </span>
                        <span>{reviewerNotes.length} characters</span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleDecision('REJECT')}
                        disabled={reviewerNotes.length < 20}
                        className="flex-1 px-4 py-3 border-2 border-red-300 text-red-700 rounded-lg font-semibold hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        REJECT CLAIM
                      </button>
                      <button
                        onClick={() => handleDecision('APPROVE')}
                        disabled={reviewerNotes.length < 20}
                        className="flex-1 px-4 py-3 bg-brand-primary text-white rounded-lg font-semibold hover:bg-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      >
                        APPROVE CLAIM
                      </button>
                    </div>

                    <p className="text-xs text-text-muted text-center">
                      Decision will be recorded and the next claim will auto-load
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
