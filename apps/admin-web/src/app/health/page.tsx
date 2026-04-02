'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'critical';
  uptime: number;
  responseTime: number;
  errorRate: number;
  lastChecked: string;
}

interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkInbound: number;
  networkOutbound: number;
  activeConnections: number;
  requestsPerSecond: number;
  avgResponseTime: number;
}

interface HistoricalData {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
  requests: number;
  errors: number;
}

export default function HealthPage() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);

  const [services, setServices] = useState<ServiceHealth[]>([
    {
      name: 'API Server',
      status: 'healthy',
      uptime: 99.98,
      responseTime: 125,
      errorRate: 0.02,
      lastChecked: new Date().toISOString(),
    },
    {
      name: 'Database',
      status: 'healthy',
      uptime: 99.95,
      responseTime: 45,
      errorRate: 0.05,
      lastChecked: new Date().toISOString(),
    },
    {
      name: 'Cache Server',
      status: 'healthy',
      uptime: 99.99,
      responseTime: 5,
      errorRate: 0.01,
      lastChecked: new Date().toISOString(),
    },
    {
      name: 'Message Queue',
      status: 'degraded',
      uptime: 98.50,
      responseTime: 250,
      errorRate: 1.50,
      lastChecked: new Date().toISOString(),
    },
    {
      name: 'Search Engine',
      status: 'healthy',
      uptime: 99.92,
      responseTime: 85,
      errorRate: 0.08,
      lastChecked: new Date().toISOString(),
    },
    {
      name: 'Storage Service',
      status: 'healthy',
      uptime: 99.99,
      responseTime: 150,
      errorRate: 0.01,
      lastChecked: new Date().toISOString(),
    },
  ]);

  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpuUsage: 34,
    memoryUsage: 62,
    diskUsage: 45,
    networkInbound: 2541,
    networkOutbound: 1847,
    activeConnections: 342,
    requestsPerSecond: 1205,
    avgResponseTime: 127,
  });

  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([
    { timestamp: '00:00', cpu: 28, memory: 58, disk: 42, requests: 950, errors: 2 },
    { timestamp: '01:00', cpu: 32, memory: 61, disk: 43, requests: 1100, errors: 3 },
    { timestamp: '02:00', cpu: 25, memory: 55, disk: 40, requests: 800, errors: 1 },
    { timestamp: '03:00', cpu: 38, memory: 65, disk: 46, requests: 1350, errors: 5 },
    { timestamp: '04:00', cpu: 42, memory: 70, disk: 48, requests: 1550, errors: 8 },
    { timestamp: '05:00', cpu: 34, memory: 62, disk: 45, requests: 1205, errors: 4 },
    { timestamp: '06:00', cpu: 40, memory: 68, disk: 47, requests: 1450, errors: 6 },
  ]);

  // Simulate auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Simulate updating metrics with slight variations
      setMetrics(prev => ({
        ...prev,
        cpuUsage: Math.max(10, Math.min(90, prev.cpuUsage + (Math.random() - 0.5) * 10)),
        memoryUsage: Math.max(40, Math.min(85, prev.memoryUsage + (Math.random() - 0.5) * 5)),
        diskUsage: prev.diskUsage,
        networkInbound: prev.networkInbound + Math.random() * 500,
        networkOutbound: prev.networkOutbound + Math.random() * 300,
        requestsPerSecond: Math.max(500, prev.requestsPerSecond + (Math.random() - 0.5) * 400),
        avgResponseTime: Math.max(50, Math.min(500, prev.avgResponseTime + (Math.random() - 0.5) * 50)),
      }));

      // Update last checked time for services
      setServices(prev =>
        prev.map(service => ({
          ...service,
          lastChecked: new Date().toISOString(),
        }))
      );

      // Add new historical data point
      setHistoricalData(prev => {
        const newPoint: HistoricalData = {
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          cpu: Math.max(10, Math.min(90, metrics.cpuUsage + (Math.random() - 0.5) * 10)),
          memory: Math.max(40, Math.min(85, metrics.memoryUsage + (Math.random() - 0.5) * 5)),
          disk: metrics.diskUsage,
          requests: Math.max(500, metrics.requestsPerSecond + (Math.random() - 0.5) * 400),
          errors: Math.floor(Math.random() * 10),
        };
        return [...prev.slice(-6), newPoint];
      });
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, metrics]);

  const handleRefresh = () => {
    setServices(prev =>
      prev.map(service => ({
        ...service,
        lastChecked: new Date().toISOString(),
      }))
    );
  };

  const getStatusBadgeVariant = (status: ServiceHealth['status']): 'accent' | 'warning' | 'danger' => {
    switch (status) {
      case 'healthy':
        return 'accent';
      case 'degraded':
        return 'warning';
      case 'critical':
        return 'danger';
    }
  };

  const getStatusLabel = (status: ServiceHealth['status']): string => {
    switch (status) {
      case 'healthy':
        return 'Healthy';
      case 'degraded':
        return 'Degraded';
      case 'critical':
        return 'Critical';
    }
  };

  const getMetricColor = (value: number, min: number = 0, max: number = 100): string => {
    if (value >= 80) return '#E53535';
    if (value >= 60) return '#F5A623';
    return '#00C896';
  };

  const healthyCount = services.filter(s => s.status === 'healthy').length;
  const degradedCount = services.filter(s => s.status === 'degraded').length;
  const criticalCount = services.filter(s => s.status === 'critical').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-between items-start"
      >
        <div>
          <h1 className="text-3xl font-display font-bold text-text-primary">
            System Health
          </h1>
          <p className="text-text-secondary mt-2">
            Real-time monitoring dashboard for system performance and service status
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-surface-subtle rounded-lg">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 rounded accent-brand-primary"
            />
            <span className="text-sm text-text-primary">Auto-refresh</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
          >
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Overall Status Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <Card className="bg-gradient-to-br from-brand-accent/10 to-transparent border-l-4 border-brand-accent">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-text-secondary">Healthy Services</p>
                <p className="text-3xl font-bold text-brand-accent mt-2">{healthyCount}/{services.length}</p>
              </div>
              <span className="text-2xl">OK</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-brand-warning/10 to-transparent border-l-4 border-brand-warning">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-text-secondary">Degraded Services</p>
                <p className="text-3xl font-bold text-brand-warning mt-2">{degradedCount}/{services.length}</p>
              </div>
              <span className="text-2xl">WARNING</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-brand-danger/10 to-transparent border-l-4 border-brand-danger">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-text-secondary">Critical Services</p>
                <p className="text-3xl font-bold text-brand-danger mt-2">{criticalCount}/{services.length}</p>
              </div>
              <span className="text-2xl">CRITICAL</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Current Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Current System Metrics</CardTitle>
            <CardDescription>Real-time resource utilization and performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  label: 'CPU Usage',
                  value: metrics.cpuUsage,
                  unit: '%',
                  icon: 'CPU',
                },
                {
                  label: 'Memory Usage',
                  value: metrics.memoryUsage,
                  unit: '%',
                  icon: 'MEM',
                },
                {
                  label: 'Disk Usage',
                  value: metrics.diskUsage,
                  unit: '%',
                  icon: 'DISK',
                },
                {
                  label: 'Network In',
                  value: metrics.networkInbound,
                  unit: 'Mbps',
                  icon: 'DOWN',
                },
              ].map((metric, idx) => (
                <div key={idx} className="p-4 bg-surface-subtle rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-xs text-text-secondary font-medium">{metric.label}</p>
                      <p className="text-2xl font-bold text-text-primary mt-1">
                        {typeof metric.value === 'number' ? metric.value.toFixed(0) : metric.value}
                        <span className="text-sm text-text-secondary ml-1">{metric.unit}</span>
                      </p>
                    </div>
                    <span className="text-xl">{metric.icon}</span>
                  </div>
                  <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, metric.value)}%`,
                        backgroundColor: getMetricColor(metric.value),
                      }}
                    />
                  </div>
                </div>
              ))}

              {[
                {
                  label: 'Network Out',
                  value: metrics.networkOutbound,
                  unit: 'Mbps',
                  icon: 'UP',
                },
                {
                  label: 'Active Connections',
                  value: metrics.activeConnections,
                  unit: '',
                  icon: 'CONN',
                },
                {
                  label: 'Requests/sec',
                  value: metrics.requestsPerSecond,
                  unit: '',
                  icon: 'REQ',
                },
                {
                  label: 'Avg Response',
                  value: metrics.avgResponseTime,
                  unit: 'ms',
                  icon: 'TIME',
                },
              ].map((metric, idx) => (
                <div key={idx} className="p-4 bg-surface-subtle rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-xs text-text-secondary font-medium">{metric.label}</p>
                      <p className="text-2xl font-bold text-text-primary mt-1">
                        {typeof metric.value === 'number' ? metric.value.toFixed(0) : metric.value}
                        <span className="text-sm text-text-secondary ml-1">{metric.unit}</span>
                      </p>
                    </div>
                    <span className="text-xl">{metric.icon}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Performance Charts */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* CPU & Memory Trend */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Resource Usage Trend</CardTitle>
            <CardDescription>Last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="timestamp" stroke="#A0AEC0" style={{ fontSize: '12px' }} />
                <YAxis stroke="#A0AEC0" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="cpu"
                  stroke="#1B4FCC"
                  dot={false}
                  strokeWidth={2}
                  name="CPU (%)"
                />
                <Line
                  type="monotone"
                  dataKey="memory"
                  stroke="#F5A623"
                  dot={false}
                  strokeWidth={2}
                  name="Memory (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Request & Error Trend */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Request & Error Rate</CardTitle>
            <CardDescription>Last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="timestamp" stroke="#A0AEC0" style={{ fontSize: '12px' }} />
                <YAxis stroke="#A0AEC0" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="requests" fill="#00C896" name="Requests/sec" radius={[8, 8, 0, 0]} />
                <Bar dataKey="errors" fill="#E53535" name="Errors" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Service Health Status */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Service Health Status</CardTitle>
            <CardDescription>Individual service metrics and availability</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {services.map((service, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * idx }}
                  className="p-4 bg-surface-subtle rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full animate-pulse" style={{
                        backgroundColor: service.status === 'healthy' ? '#00C896' : service.status === 'degraded' ? '#F5A623' : '#E53535',
                      }} />
                      <div>
                        <p className="font-medium text-text-primary">{service.name}</p>
                        <p className="text-xs text-text-secondary">
                          Last checked: {new Date(service.lastChecked).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={getStatusBadgeVariant(service.status)}
                      status={service.status === 'healthy' ? 'APPROVED' : service.status === 'degraded' ? 'PENDING' : 'CRITICAL'}
                      dot
                    >
                      {getStatusLabel(service.status)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-3">
                    <div>
                      <p className="text-xs text-text-secondary mb-1">Uptime</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-text-primary">
                          {service.uptime.toFixed(2)}%
                        </span>
                      </div>
                      <div className="w-full h-1 bg-gray-300 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-brand-accent transition-all duration-300"
                          style={{ width: `${Math.min(100, service.uptime)}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary mb-1">Response Time</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-text-primary">
                          {service.responseTime}
                        </span>
                        <span className="text-xs text-text-secondary">ms</span>
                      </div>
                      <div className="w-full h-1 bg-gray-300 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-brand-secondary transition-all duration-300"
                          style={{ width: `${Math.min(100, (service.responseTime / 500) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary mb-1">Error Rate</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-text-primary">
                          {service.errorRate.toFixed(2)}%
                        </span>
                      </div>
                      <div className="w-full h-1 bg-gray-300 rounded-full mt-1 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            service.errorRate > 1 ? 'bg-brand-danger' : 'bg-brand-accent'
                          }`}
                          style={{ width: `${Math.min(100, service.errorRate * 10)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Alerts & Incidents */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Recent Alerts & Incidents</CardTitle>
            <CardDescription>Latest system events and issues</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  time: '5 minutes ago',
                  severity: 'warning',
                  message: 'Message Queue experiencing higher latency',
                  component: 'Message Queue',
                },
                {
                  time: '42 minutes ago',
                  severity: 'info',
                  message: 'Database backup completed successfully',
                  component: 'Database',
                },
                {
                  time: '2 hours ago',
                  severity: 'info',
                  message: 'API Server redeployed with new version',
                  component: 'API Server',
                },
              ].map((alert, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border-l-4 flex justify-between items-start ${
                    alert.severity === 'warning'
                      ? 'bg-brand-warning/5 border-brand-warning'
                      : 'bg-brand-secondary/5 border-brand-secondary'
                  }`}
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">{alert.message}</p>
                    <p className="text-xs text-text-secondary mt-1">{alert.time}</p>
                  </div>
                  <Badge
                    variant={alert.severity === 'warning' ? 'warning' : 'secondary'}
                    dot={false}
                  >
                    {alert.component}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
