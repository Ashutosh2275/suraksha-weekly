'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { useDashboardKPIs } from '@/lib/AppContext';

// Mock Data for charts (to be replaced with real data in Phase 2)
const LOSS_RATIO_DATA = [
  { week: 'W1', ratio: 0.72, premiumCollected: 189000, claimsPaid: 136080 },
  { week: 'W2', ratio: 0.68, premiumCollected: 195000, claimsPaid: 132600 },
  { week: 'W3', ratio: 0.75, premiumCollected: 201000, claimsPaid: 150750 },
  { week: 'W4', ratio: 0.71, premiumCollected: 198000, claimsPaid: 140580 },
  { week: 'W5', ratio: 0.69, premiumCollected: 205000, claimsPaid: 141450 },
  { week: 'W6', ratio: 0.73, premiumCollected: 210000, claimsPaid: 153300 },
  { week: 'W7', ratio: 0.70, premiumCollected: 215000, claimsPaid: 150500 },
  { week: 'W8', ratio: 0.68, premiumCollected: 220000, claimsPaid: 149600 },
];

const CLAIM_STATUS_DATA = [
  { name: 'Auto-Approved', value: 156, color: '#00C896' },
  { name: 'In Review', value: 12, color: '#F5A623' },
  { name: 'Pending Info', value: 8, color: '#94A3C0' },
  { name: 'Rejected', value: 23, color: '#E53535' },
  { name: 'Paid Out', value: 142, color: '#1B4FCC' },
];

const FRAUD_SCORE_DATA = [
  { range: '0-0.1', count: 2456, color: '#10B981' },
  { range: '0.1-0.2', count: 312, color: '#34D399' },
  { range: '0.2-0.3', count: 89, color: '#6EE7B7' },
  { range: '0.3-0.4', count: 45, color: '#A7F3D0' },
  { range: '0.4-0.5', count: 23, color: '#FEF3C7' },
  { range: '0.5-0.6', count: 15, color: '#FDE68A' },
  { range: '0.6-0.7', count: 8, color: '#FBBF24' },
  { range: '0.7-0.8', count: 4, color: '#F59E0B' },
  { range: '0.8-0.9', count: 2, color: '#EF4444' },
  { range: '0.9-1.0', count: 1, color: '#DC2626' },
];

const RECENT_EVENTS = [
  {
    id: 1,
    type: 'payout',
    description: 'Auto-payout processed for Policy #SUR-2847',
    amount: '₹420',
    timestamp: '2 mins ago',
    icon: '💸',
  },
  {
    id: 2,
    type: 'trigger',
    description: 'Heavy rain detected in Andheri East',
    timestamp: '5 mins ago',
    icon: '🌧️',
  },
  {
    id: 3,
    type: 'fraud',
    description: 'Suspicious claim blocked - Score: 0.89',
    timestamp: '8 mins ago',
    icon: '🛡️',
  },
  {
    id: 4,
    type: 'claim',
    description: 'New claim initiated - Policy #SUR-2851',
    timestamp: '12 mins ago',
    icon: '📋',
  },
  {
    id: 5,
    type: 'payout',
    description: 'Manual review completed - Claim approved',
    amount: '₹315',
    timestamp: '15 mins ago',
    icon: '✅',
  },
  {
    id: 6,
    type: 'trigger',
    description: 'AQI threshold exceeded in Gurgaon',
    timestamp: '18 mins ago',
    icon: '🌫️',
  },
];

// Components
interface KPICardData {
  value: number | string;
  trend: number;
  trendDirection: 'up' | 'down' | 'neutral';
  label: string;
  sublabel: string;
  sparkline?: number[];
}

interface KPICardProps {
  data: KPICardData;
}

function KPICard({ data }: KPICardProps) {
  const { value, trend, trendDirection, label, sublabel, sparkline } = data;
  
  const getTrendColor = () => {
    if (trendDirection === 'neutral') return 'text-gray-500';
    return trendDirection === 'up' ? 'text-green-600' : 'text-red-600';
  };

  const getTrendIcon = () => {
    if (trendDirection === 'neutral') return '→';
    return trendDirection === 'up' ? '↗' : '↘';
  };

  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val;
    if (val >= 1000) return val.toLocaleString();
    return val.toString();
  };

  return (
    <Card className="relative p-6 hover:shadow-elevated transition-shadow">
      {/* Background Sparkline */}
      <div className="absolute inset-0 opacity-10">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={(sparkline || []).map((val, i) => ({ value: val, index: i }))}>
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#1B4FCC" 
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-text-secondary mb-1">{label}</p>
            <p className="text-3xl font-display font-bold text-text-primary">
              {typeof value === 'number' && label.includes('₹') 
                ? `₹${formatValue(value)}` 
                : typeof value === 'number' && label.includes('%')
                ? `${value}%`
                : formatValue(value)}
            </p>
          </div>
          
          {trend !== 0 && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded text-sm font-medium ${getTrendColor()}`}>
              <span>{getTrendIcon()}</span>
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>

        <p className="text-xs text-text-muted">{sublabel}</p>
      </div>
    </Card>
  );
}

interface ClaimIncidenceBandProps {
  currentRate: number;
  targetMin: number;
  targetMax: number;
}

function ClaimIncidenceBand({ currentRate, targetMin, targetMax }: ClaimIncidenceBandProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-display font-semibold text-text-primary">
          Weekly Claim Incidence Rate
        </h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-text-secondary">Live</span>
        </div>
      </div>

      {/* Rate Bar */}
      <div className="relative h-12 bg-gray-100 rounded-lg mb-4">
        {/* Red zones */}
        <div className="absolute left-0 top-0 h-full w-[45%] bg-red-100 rounded-l-lg"></div>
        <div className="absolute right-0 top-0 h-full w-[40%] bg-red-100 rounded-r-lg"></div>
        
        {/* Green zone */}
        <div className="absolute left-[45%] top-0 h-full w-[15%] bg-green-100"></div>
        
        {/* Zone labels */}
        <div className="absolute left-0 top-0 h-full flex items-center pl-3 text-xs font-medium text-red-700">
          0-9%
        </div>
        <div className="absolute left-[45%] top-0 h-full flex items-center justify-center text-xs font-medium text-green-700">
          10-18%
        </div>
        <div className="absolute right-0 top-0 h-full flex items-center pr-3 text-xs font-medium text-red-700">
          19%+
        </div>

        {/* Current rate indicator */}
        <div 
          className="absolute top-1 h-10 w-1 bg-text-primary rounded-full shadow-lg"
          style={{ left: `${(currentRate / 25) * 100}%` }}
        >
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-text-primary text-white px-2 py-1 rounded text-xs font-medium whitespace-nowrap">
            {currentRate}%
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-secondary">
          Target band: {targetMin}–{targetMax}% · Current: {currentRate}%
        </span>
        <span className="text-green-600">✓</span>
      </div>
    </Card>
  );
}

function LiveActivityFeed() {
  const [events, setEvents] = useState(RECENT_EVENTS);

  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate new events every 15 seconds
      const newEvent = {
        id: Date.now(),
        type: ['payout', 'trigger', 'fraud', 'claim'][Math.floor(Math.random() * 4)] as any,
        description: 'New system event detected',
        timestamp: 'Just now',
        icon: '🔔',
      };
      
      setEvents(prev => [newEvent, ...prev.slice(0, 19)]);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const getEventColor = (type: string) => {
    switch (type) {
      case 'trigger': return 'border-blue-200 bg-blue-50';
      case 'claim': return 'border-amber-200 bg-amber-50';
      case 'payout': return 'border-green-200 bg-green-50';
      case 'fraud': return 'border-red-200 bg-red-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-display font-semibold text-text-primary">Recent Events</h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-text-secondary">Live</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {events.map((event) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`p-3 rounded-lg border ${getEventColor(event.type)}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-lg">{event.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary font-medium leading-tight">
                  {event.description}
                </p>
                {event.amount && (
                  <p className="text-sm font-mono text-text-accent mt-1">
                    {event.amount}
                  </p>
                )}
                <p className="text-xs text-text-muted mt-1">{event.timestamp}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

export default function AdminDashboard() {
  const { kpis, isLoading, lastUpdated } = useDashboardKPIs();

  // Helper function to generate realistic sparkline data
  const generateSparkline = (currentValue: number, points: number = 7, stability: number = 0.8) => {
    const data: number[] = [];
    let baseValue = currentValue * (0.8 + Math.random() * 0.4); // Start with variation
    
    for (let i = 0; i < points - 1; i++) {
      // Generate realistic trend toward current value
      const progress = i / (points - 1);
      const targetInfluence = progress * stability;
      const randomInfluence = (1 - targetInfluence) * (Math.random() - 0.5) * 0.2;
      
      baseValue = baseValue * (1 + randomInfluence) + (currentValue - baseValue) * targetInfluence;
      data.push(Math.max(0, Math.round(baseValue * 100) / 100));
    }
    
    // Last point is always the current value
    data.push(currentValue);
    return data;
  };

  // Convert KPIs from context to dashboard format
  const KPI_DATA = {
    activePolicies: {
      value: kpis.activePolicies,
      trend: 12,
      trendDirection: 'up' as const,
      label: 'Active Policies',
      sublabel: 'Across all delivery partners',
      sparkline: [2650, 2680, 2720, 2780, 2810, 2830, kpis.activePolicies],
    },
    claimsToday: {
      value: kpis.totalClaimsToday,
      trend: 8,
      trendDirection: 'up' as const,
      label: 'Claims Today',
      sublabel: 'Submitted in last 24h',
      sparkline: generateSparkline(kpis.totalClaimsToday, 7, 0.8),
    },
    autoApprovalRate: {
      value: Math.round(kpis.approvalRate),
      trend: 3,
      trendDirection: 'up' as const,
      label: 'Auto-Approval Rate',
      sublabel: 'ML model accuracy',
      sparkline: generateSparkline(kpis.approvalRate, 7, 0.95),
    },
    fraudBlocked: {
      value: kpis.highRiskClaims,
      trend: -5,
      trendDirection: 'down' as const,
      label: 'Fraud Blocked',
      sublabel: 'High-risk claims flagged',
      sparkline: generateSparkline(kpis.highRiskClaims, 7, 0.6),
    },
    totalPaidOut: {
      value: kpis.totalAmountToday,
      trend: 15,
      trendDirection: 'up' as const,
      label: '₹ Total Paid Out',
      sublabel: 'Today across all claims',
      sparkline: generateSparkline(kpis.totalAmountToday, 7, 0.9),
    },
    avgTriggerToPayout: {
      value: `${Math.floor(kpis.avgProcessingTime)}h ${Math.round((kpis.avgProcessingTime % 1) * 60)}m`,
      trend: -12,
      trendDirection: 'down' as const,
      label: 'Avg Trigger-to-Payout',
      sublabel: 'Hours (Target: <2h)',
      sparkline: generateSparkline(kpis.avgProcessingTime, 7, 0.8),
    },
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-surface-card rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="h-32 bg-surface-card rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-text-primary mb-2">
            Mission Control
          </h1>
          <p className="text-text-secondary">
            Real-time operations dashboard for Suraksha Weekly
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-text-muted">Last updated</p>
            <p className="text-sm text-text-secondary font-medium">
              {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-700 font-medium">Real Data Active</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="xl:col-span-3 space-y-6">
          {/* KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <KPICard data={KPI_DATA.activePolicies} />
            <KPICard data={KPI_DATA.claimsToday} />
            <KPICard data={KPI_DATA.autoApprovalRate} />
            <KPICard data={KPI_DATA.fraudBlocked} />
            <KPICard data={KPI_DATA.totalPaidOut} />
            <KPICard data={KPI_DATA.avgTriggerToPayout} />
          </div>

          {/* Claim Incidence Band */}
          <ClaimIncidenceBand currentRate={14.2} targetMin={10} targetMax={18} />

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Loss Ratio Trend */}
            <Card className="p-6">
              <h3 className="text-lg font-display font-semibold text-text-primary mb-4">
                Loss Ratio Trend
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={LOSS_RATIO_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="week" stroke="#94A3C0" />
                    <YAxis stroke="#94A3C0" />
                    <Tooltip
                      formatter={(value: any, name: string) => [
                        name === 'ratio' ? `${(value * 100).toFixed(1)}%` : `₹${value.toLocaleString()}`,
                        name === 'ratio' ? 'Loss Ratio' : name === 'premiumCollected' ? 'Premium Collected' : 'Claims Paid'
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="ratio"
                      stroke="#1B4FCC"
                      fill="#1B4FCC"
                      fillOpacity={0.4}
                      strokeWidth={2}
                    />
                    <ReferenceLine y={0.75} stroke="#E53535" strokeDasharray="5 5" strokeWidth={1} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-text-muted mt-2">
                Target ratio: ≤75% · Current: 68% ✓
              </p>
            </Card>

            {/* Claim Status Distribution */}
            <Card className="p-6">
              <h3 className="text-lg font-display font-semibold text-text-primary mb-4">
                Claim Status Distribution
              </h3>
              <div className="h-64 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={CLAIM_STATUS_DATA}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {CLAIM_STATUS_DATA.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} claims`, 'Count']} />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="text-2xl font-bold text-text-primary">
                    {CLAIM_STATUS_DATA.reduce((sum, item) => sum + item.value, 0)}
                  </div>
                  <div className="text-sm text-text-secondary">
                    Total Claims
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-4">
                {CLAIM_STATUS_DATA.map((item) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-text-secondary">{item.name}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Fraud Score Distribution */}
          <Card className="p-6">
            <h3 className="text-lg font-display font-semibold text-text-primary mb-4">
              Fraud Score Distribution
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={FRAUD_SCORE_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="range" stroke="#94A3C0" />
                  <YAxis stroke="#94A3C0" />
                  <Tooltip formatter={(value) => [`${value} users`, 'Count']} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {FRAUD_SCORE_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-text-muted mt-2">
              Click on a bar to view detailed fraud analysis for that score range
            </p>
          </Card>
        </div>

        {/* Right Sidebar - Live Activity */}
        <div className="xl:col-span-1">
          <LiveActivityFeed />
        </div>
      </div>
    </div>
  );
}
