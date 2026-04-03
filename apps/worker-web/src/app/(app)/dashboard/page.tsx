'use client';

import { motion } from 'framer-motion';
import { Card, Badge, Button } from '@/components/ui';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { useDashboard, useActiveAlert } from '@/lib/queries';

// Loading component
function DashboardLoading() {
  return (
    <div className="min-h-screen bg-surface-base p-4 space-y-6 animate-pulse">
      <div className="h-32 bg-surface-card rounded-xl"></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-24 bg-surface-card rounded-xl"></div>
        <div className="h-24 bg-surface-card rounded-xl"></div>
      </div>
      <div className="h-48 bg-surface-card rounded-xl"></div>
    </div>
  );
}

// Error component
function DashboardError({ error }: { error: Error }) {
  return (
    <div className="min-h-screen bg-surface-base p-4 flex items-center justify-center">
      <Card className="p-6 max-w-md text-center">
        <h2 className="text-lg font-semibold text-red-600 mb-2">
          Unable to load dashboard
        </h2>
        <p className="text-text-muted mb-4">
          Please check your connection and try again.
        </p>
        <Button onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Card>
    </div>
  );
}

// Mock data - would come from API in production
const WORKER_DATA = {
  name: 'Ravi',
  protectionStatus: 'ACTIVE' as const, // ACTIVE | EXPIRING | LAPSED
  coverageEndsDate: 'Friday, 6 Apr',
  protectedAmount: 1500,
  weeklyAverage: 4200,
  hoursCovered: 42,
  activeSince: 'Monday',
  triggerAlerts: 0,
  hasActiveTrigger: true,
  triggerEvent: {
    type: 'rain',
    location: 'Andheri East',
    message: 'Heavy rain detected in Andheri East — you may be eligible for a payout',
  },
  lastPayout: {
    amount: 850,
    date: '12 Mar',
    eventType: 'Heavy Rain',
    status: 'COMPLETED',
  },
  coverageHistory: [
    { week: 'W1', amount: 1200 },
    { week: 'W2', amount: 1400 },
    { week: 'W3', amount: 1300 },
    { week: 'W4', amount: 1500 },
  ],
};

const QUICK_ACTIONS = [
  { id: 'renew', label: 'Renew Plan', icon: '🔄' },
  { id: 'policy', label: 'View Policy', icon: '📄' },
  { id: 'support', label: 'Contact Support', icon: '💬' },
];

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'claims', label: 'Claims', icon: '📋' },
  { id: 'payouts', label: 'Payouts', icon: '💰' },
  { id: 'profile', label: 'Profile', icon: '👤' },
];

export default function DashboardPage() {
  const { data: dashboardData, isLoading, error } = useDashboard();
  const { data: activeAlert } = useActiveAlert();
  
  if (isLoading) return <DashboardLoading />;
  if (error) return <DashboardError error={error as Error} />;
  if (!dashboardData) return <DashboardError error={new Error('No data available')} />;

  const { policy } = dashboardData;
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDaysUntilExpiry = () => {
    // Calculate from actual policy data
    const expiryDate = new Date(policy.expiryDate);
    const today = new Date();
    const timeDiff = expiryDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return Math.max(0, daysDiff);
  };

  const getStatusConfig = () => {
    const daysLeft = getDaysUntilExpiry();
    
    if (daysLeft <= 0) {
      return {
        color: 'bg-red-500' as const,
        textColor: 'text-red-600' as const,
        bgColor: 'bg-red-50' as const,
        label: 'LAPSED' as const,
      };
    } else if (daysLeft <= 2) {
      return {
        color: 'bg-amber-500' as const,
        textColor: 'text-amber-600' as const,
        bgColor: 'bg-amber-50' as const,
        label: 'EXPIRING' as const,
      };
    } else {
      return {
        color: 'bg-green-500' as const,
        textColor: 'text-green-600' as const,
        bgColor: 'bg-green-50' as const,
        label: 'ACTIVE' as const,
      };
    }
  };
          color: 'emerald',
          glowColor: 'rgba(0, 200, 150, 0.3)',
          text: "You're protected this week",
        };
      case 'EXPIRING':
        return {
          color: 'amber',
          glowColor: 'rgba(245, 166, 35, 0.3)',
          text: 'Coverage expiring soon',
        };
      case 'LAPSED':
        return {
          color: 'red',
          glowColor: 'rgba(229, 53, 53, 0.3)',
          text: 'Coverage has lapsed',
        };
    }
  };

  const statusConfig = getStatusConfig();
  const daysRemaining = getDaysUntilExpiry();

  return (
    <div className="min-h-screen bg-surface-base pb-20 lg:pb-8">
      {/* Header / Hero Section */}
      <div className="bg-surface-card border-b border-border-subtle">
        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Greeting */}
          <div className="mb-6">
            <h1 className="font-display text-3xl font-semibold text-text-primary mb-1">
              {getGreeting()}, {policy.workerName} 👋
            </h1>
            <p className="text-text-secondary">{getCurrentDate()}</p>
          </div>

          {/* Status Card */}
          <div className="relative overflow-hidden rounded-xl bg-surface-inverse p-8">
            {/* Grid Pattern Background */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />

            {/* Content */}
            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Left: Shield Icon */}
              <div className="flex items-center gap-4">
                <motion.div
                  animate={
                    statusConfig.label === 'ACTIVE'
                      ? {
                          filter: [
                            'drop-shadow(0 0 8px rgba(0, 200, 150, 0.6))',
                            'drop-shadow(0 0 16px rgba(0, 200, 150, 0.8))',
                            'drop-shadow(0 0 8px rgba(0, 200, 150, 0.6))',
                          ],
                        }
                      : {}
                  }
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 64 64"
                    fill="none"
                    className={`${
                      WORKER_DATA.protectionStatus === 'ACTIVE'
                        ? 'text-brand-accent'
                        : WORKER_DATA.protectionStatus === 'EXPIRING'
                        ? 'text-brand-secondary'
                        : 'text-brand-danger'
                    }`}
                  >
                    <path
                      d="M32 6L8 18v14c0 15 10.4 29 24 32 13.6-3 24-17 24-32V18L32 6z"
                      fill="currentColor"
                      fillOpacity="0.2"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M22 32l6 6 14-14"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </motion.div>

                {/* Center: Status Text */}
                <div>
                  <h2 className="font-display text-2xl lg:text-3xl font-semibold text-text-inverse mb-2">
                    {statusConfig.text}
                  </h2>
                  <p className="text-indigo-200 text-sm">
                    Coverage ends {policy.expiryDate} ·{' '}
                    <span className="font-mono">
                      ₹{policy.protectedAmount.toLocaleString('en-IN')}
                    </span>{' '}
                    protected
                  </p>
                </div>
              </div>

              {/* Right: Renew Button */}
              {daysRemaining <= 2 && (
                <motion.button
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ scale: 1.05 }}
                  className="px-6 py-3 rounded-full bg-brand-secondary text-surface-inverse font-display font-semibold shadow-lg hover:bg-brand-secondary-hover transition-colors"
                >
                  Renew
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {activeAlert && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="bg-brand-warning-light border-l-4 border-brand-warning overflow-hidden"
        >
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-2xl"
                >
                  {activeAlert.type === 'rain' && '🌧️'}
                  {activeAlert.type === 'heat' && '🔥'}
                  {activeAlert.type === 'aqi' && '💨'}
                </motion.div>
                <p className="text-text-primary font-medium">
                  {activeAlert.message}
                </p>
              </div>
              <button className="text-brand-primary font-semibold whitespace-nowrap flex items-center gap-1 hover:text-brand-primary-hover transition-colors">
                Check Status
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M6 12l4-4-4-4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Content Grid */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1 - Protected Earnings */}
          <Card variant="default" padding="lg">
            <div>
              <p className="text-sm text-text-secondary mb-2">
                Protected this week
              </p>
              <p className="font-display text-5xl font-bold text-brand-primary mb-2">
                ₹{WORKER_DATA.protectedAmount.toLocaleString('en-IN')}
              </p>
              <p className="text-sm text-text-muted mb-4">
                Based on your ₹
                {WORKER_DATA.weeklyAverage.toLocaleString('en-IN')} weekly
                average
              </p>

              {/* Coverage Ratio Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-text-secondary">
                  <span>Coverage</span>
                  <span>
                    {Math.round(
                      (WORKER_DATA.protectedAmount /
                        WORKER_DATA.weeklyAverage) *
                        100
                    )}
                    %
                  </span>
                </div>
                <div className="h-2 bg-surface-subtle rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${
                        (policy.protectedAmount /
                          policy.weeklyAverage) *
                        100
                      }%`,
                    }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="h-full bg-gradient-to-r from-brand-primary to-brand-accent"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Card 2 - This Week's Stats */}
          <Card variant="default" padding="lg">
            <div>
              <p className="text-sm font-medium text-text-secondary mb-4">
                This week's stats
              </p>

              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Hours covered</span>
                  <span className="font-display font-semibold text-text-primary">
                    {WORKER_DATA.hoursCovered} hrs
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Active since</span>
                  <span className="font-display font-semibold text-text-primary">
                    {WORKER_DATA.activeSince}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Trigger alerts</span>
                  <Badge
                    variant={
                      WORKER_DATA.triggerAlerts > 0 ? 'warning' : 'neutral'
                    }
                  >
                    {WORKER_DATA.triggerAlerts}
                  </Badge>
                </div>
              </div>

              {/* Sparkline Chart */}
              <div>
                <p className="text-xs text-text-muted mb-2">
                  4-week coverage history
                </p>
                <div className="h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={WORKER_DATA.coverageHistory}>
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="#1B4FCC"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </Card>

          {/* Card 3 - Last Payout */}
          <Card variant="default" padding="lg">
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-text-secondary">
                  Last payout
                </p>
                <button className="text-xs text-brand-primary hover:text-brand-primary-hover font-medium">
                  View all →
                </button>
              </div>

              {WORKER_DATA.lastPayout ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-display text-3xl font-bold text-brand-accent mb-1">
                        ₹{WORKER_DATA.lastPayout.amount.toLocaleString('en-IN')}
                      </p>
                      <p className="text-sm text-text-secondary">
                        {WORKER_DATA.lastPayout.date} ·{' '}
                        {WORKER_DATA.lastPayout.eventType}
                      </p>
                    </div>
                    <Badge variant="accent">
                      {WORKER_DATA.lastPayout.status}
                    </Badge>
                  </div>

                  <div className="pt-4 border-t border-border-subtle">
                    <p className="text-xs text-text-muted">
                      Paid directly to your account
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">☁️</div>
                  <p className="text-text-muted">
                    No payouts yet — we hope it stays that way!
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Card 4 - Quick Actions */}
          <Card variant="default" padding="lg">
            <div>
              <p className="text-sm font-medium text-text-secondary mb-4">
                Quick actions
              </p>

              <div className="space-y-3">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    className="w-full flex items-center justify-between p-4 rounded-lg border border-border hover:border-brand-primary hover:bg-brand-primary-light transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{action.icon}</span>
                      <span className="font-medium text-text-primary">
                        {action.label}
                      </span>
                    </div>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      className="text-text-muted group-hover:text-brand-primary transition-colors"
                    >
                      <path
                        d="M7 14l5-5-5-5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom Navigation (Mobile Only) */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface-card border-t border-border lg:hidden">
        <div className="grid grid-cols-4">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="relative flex flex-col items-center gap-1 py-3 transition-colors"
            >
              {/* Active Indicator Dot */}
              {activeTab === item.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute top-0 w-1 h-1 rounded-full bg-brand-primary"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}

              <span
                className={`text-2xl transition-opacity ${
                  activeTab === item.id ? 'opacity-100' : 'opacity-50'
                }`}
              >
                {item.icon}
              </span>
              <span
                className={`text-xs font-medium ${
                  activeTab === item.id
                    ? 'text-brand-primary'
                    : 'text-text-muted'
                }`}
              >
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
