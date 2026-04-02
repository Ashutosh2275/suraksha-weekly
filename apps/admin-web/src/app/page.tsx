'use client';

import { Card } from '@/components/ui/Card';

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-text-primary mb-2">
          Dashboard
        </h1>
        <p className="text-text-secondary">
          Operations control center for Suraksha Weekly micro-insurance platform.
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary mb-1">Active Policies</p>
              <p className="text-2xl font-display font-bold text-text-primary">2,847</p>
            </div>
            <div className="w-12 h-12 bg-brand-primary/10 rounded-lg flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3L4 7v5c0 6 3.6 11.5 8 12.5 4.4-1 8-6.5 8-12.5V7l-8-4z"
                  stroke="#1B4FCC"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600">+12%</span>
            <span className="text-text-muted ml-2">vs last week</span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary mb-1">Claims Pending</p>
              <p className="text-2xl font-display font-bold text-text-primary">12</p>
            </div>
            <div className="w-12 h-12 bg-brand-secondary/10 rounded-lg flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="6" width="16" height="12" rx="2" stroke="#F5A623" strokeWidth="2" />
                <path d="M8 9h8M8 12h6" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-brand-secondary">-3</span>
            <span className="text-text-muted ml-2">since yesterday</span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary mb-1">Payouts Today</p>
              <p className="text-2xl font-display font-bold text-text-primary">₹67,340</p>
            </div>
            <div className="w-12 h-12 bg-brand-accent/10 rounded-lg flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"
                  stroke="#00C896"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600">+8%</span>
            <span className="text-text-muted ml-2">vs avg day</span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary mb-1">Active Triggers</p>
              <p className="text-2xl font-display font-bold text-text-primary">3</p>
            </div>
            <div className="w-12 h-12 bg-brand-danger/10 rounded-lg flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="8" stroke="#E53535" strokeWidth="2" />
                <circle cx="12" cy="12" r="3" stroke="#E53535" strokeWidth="2" />
                <path d="M12 4v2M12 18v2M4 12h2M18 12h2" stroke="#E53535" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-brand-danger">Heavy rain</span>
            <span className="text-text-muted ml-2">in 2 zones</span>
          </div>
        </Card>
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6 hover:shadow-elevated transition-shadow cursor-pointer">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-brand-primary/10 rounded-lg flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="4" y="5" width="12" height="10" rx="1" stroke="#1B4FCC" strokeWidth="1.5" />
                <path d="M7 8h6M7 11h4" stroke="#1B4FCC" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h3 className="font-display font-semibold text-text-primary mb-1">Review Queue</h3>
              <p className="text-sm text-text-secondary mb-3">
                12 claims waiting for manual review
              </p>
              <div className="flex items-center text-sm text-brand-primary">
                <span>Review pending →</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-elevated transition-shadow cursor-pointer">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-brand-secondary/10 rounded-lg flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="7" stroke="#F5A623" strokeWidth="1.5" />
                <circle cx="10" cy="10" r="4" stroke="#F5A623" strokeWidth="1.5" />
                <path d="M10 3v2M10 15v2M3 10h2M15 10h2" stroke="#F5A623" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h3 className="font-display font-semibold text-text-primary mb-1">Trigger Monitor</h3>
              <p className="text-sm text-text-secondary mb-3">
                3 active weather events detected
              </p>
              <div className="flex items-center text-sm text-brand-secondary">
                <span>Monitor triggers →</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-elevated transition-shadow cursor-pointer">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-brand-danger/10 rounded-lg flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M10 3L4 6v5c0 3.75 2.6 7.25 6 8 3.4-.75 6-4.25 6-8V6l-6-3z"
                  stroke="#E53535"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path d="M7 10l2 2 4-4" stroke="#E53535" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h3 className="font-display font-semibold text-text-primary mb-1">Fraud Center</h3>
              <p className="text-sm text-text-secondary mb-3">
                Monitor suspicious activity patterns
              </p>
              <div className="flex items-center text-sm text-brand-danger">
                <span>View fraud alerts →</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* System Status */}
      <Card className="p-6">
        <h3 className="font-display font-semibold text-text-primary mb-4">System Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div>
              <p className="text-sm font-medium text-text-primary">API Services</p>
              <p className="text-xs text-text-secondary">All systems operational</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div>
              <p className="text-sm font-medium text-text-primary">Weather Data</p>
              <p className="text-xs text-text-secondary">Real-time sync active</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-brand-secondary rounded-full"></div>
            <div>
              <p className="text-sm font-medium text-text-primary">ML Models</p>
              <p className="text-xs text-text-secondary">Retraining in progress</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
