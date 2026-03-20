'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Activity,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';

interface HealthCheckResult {
  endpoint: string;
  status: 'pending' | 'success' | 'error' | 'timeout';
  responseTime?: number;
  error?: string;
  timestamp: number;
}

interface PerformanceMetrics {
  avgResponseTime: number;
  successRate: number;
  totalChecks: number;
  failedChecks: number;
}

export function PerformanceVerification() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<HealthCheckResult[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    avgResponseTime: 0,
    successRate: 0,
    totalChecks: 0,
    failedChecks: 0
  });
  const [progress, setProgress] = useState(0);

  const healthEndpoints = [
    '/api/v1/health/e2e',
    '/internal/live',
    '/internal/ready',
    '/internal/startup'
  ];

  const performHealthCheck = async (endpoint: string): Promise<HealthCheckResult> => {
    const startTime = Date.now();

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(`${apiBase}${endpoint}`, {
        signal: controller.signal,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return {
          endpoint,
          status: 'success',
          responseTime,
          timestamp: Date.now()
        };
      } else {
        return {
          endpoint,
          status: 'error',
          responseTime,
          error: `HTTP ${response.status}`,
          timestamp: Date.now()
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          endpoint,
          status: 'timeout',
          responseTime,
          error: 'Request timeout (10s)',
          timestamp: Date.now()
        };
      }

      return {
        endpoint,
        status: 'error',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      };
    }
  };

  const runPerformanceTest = async () => {
    setIsRunning(true);
    setResults([]);
    setProgress(0);

    const testResults: HealthCheckResult[] = [];
    const totalTests = healthEndpoints.length * 3; // 3 rounds of testing

    for (let round = 0; round < 3; round++) {
      for (let i = 0; i < healthEndpoints.length; i++) {
        const endpoint = healthEndpoints[i];
        const result = await performHealthCheck(endpoint);
        testResults.push(result);
        setResults([...testResults]);

        const currentProgress = ((round * healthEndpoints.length) + i + 1) / totalTests * 100;
        setProgress(currentProgress);

        // Small delay between requests to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Calculate metrics
    const successfulResults = testResults.filter(r => r.status === 'success');
    const totalResponseTime = successfulResults.reduce((sum, r) => sum + (r.responseTime || 0), 0);

    const calculatedMetrics: PerformanceMetrics = {
      avgResponseTime: successfulResults.length > 0 ? totalResponseTime / successfulResults.length : 0,
      successRate: (successfulResults.length / testResults.length) * 100,
      totalChecks: testResults.length,
      failedChecks: testResults.length - successfulResults.length
    };

    setMetrics(calculatedMetrics);
    setIsRunning(false);
    setProgress(100);
  };

  const getStatusIcon = (status: HealthCheckResult['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'timeout':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
    }
  };

  const getStatusBadgeVariant = (status: HealthCheckResult['status']) => {
    switch (status) {
      case 'success':
        return 'default' as const;
      case 'error':
        return 'destructive' as const;
      case 'timeout':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-600" />
            Performance Verification
          </CardTitle>
          <p className="text-sm text-slate-600">
            Test API health endpoints to verify system performance and reliability.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <Button
              onClick={runPerformanceTest}
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {isRunning ? 'Running Tests...' : 'Run Performance Test'}
            </Button>

            {isRunning && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Progress value={progress} className="w-32" />
                <span>{Math.round(progress)}%</span>
              </div>
            )}
          </div>

          {/* Metrics Summary */}
          {metrics.totalChecks > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
            >
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">
                  {Math.round(metrics.avgResponseTime)}ms
                </div>
                <div className="text-xs text-slate-500">Avg Response Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round(metrics.successRate)}%
                </div>
                <div className="text-xs text-slate-500">Success Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {metrics.totalChecks}
                </div>
                <div className="text-xs text-slate-500">Total Checks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {metrics.failedChecks}
                </div>
                <div className="text-xs text-slate-500">Failed Checks</div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Results Table */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 font-medium">Endpoint</th>
                    <th className="text-center py-2 font-medium">Status</th>
                    <th className="text-center py-2 font-medium">Response Time</th>
                    <th className="text-center py-2 font-medium">Timestamp</th>
                    <th className="text-left py-2 font-medium">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => (
                    <motion.tr
                      key={index}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="py-2 font-mono text-xs">{result.endpoint}</td>
                      <td className="py-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getStatusIcon(result.status)}
                          <Badge variant={getStatusBadgeVariant(result.status)}>
                            {result.status.toUpperCase()}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-2 text-center font-mono">
                        {result.responseTime ? `${result.responseTime}ms` : '—'}
                      </td>
                      <td className="py-2 text-center text-xs text-slate-500">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2 text-xs text-red-600">
                        {result.error || '—'}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performance Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Response Time Targets</h4>
              <ul className="space-y-1 text-slate-600">
                <li>• /internal/live: &lt; 500ms</li>
                <li>• /internal/ready: &lt; 2000ms</li>
                <li>• /internal/startup: &lt; 5000ms</li>
                <li>• /health/e2e: &lt; 3000ms</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Success Rate Targets</h4>
              <ul className="space-y-1 text-slate-600">
                <li>• Production: &ge; 99.5%</li>
                <li>• Staging: &ge; 98%</li>
                <li>• Development: &ge; 95%</li>
                <li>• Timeout threshold: 10 seconds</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}