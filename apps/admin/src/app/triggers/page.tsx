'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

// Types
interface Zone {
  id: string;
  name: string;
  city: string;
  activePolicies: number;
  currentConditions: {
    weather: 'clear' | 'rain' | 'heat' | 'storm';
    aqi: number;
    restrictions: boolean;
  };
  status: 'clear' | 'monitoring' | 'triggered';
  confidence?: number;
  lastUpdated: Date;
}

interface TriggerEvent {
  id: string;
  type: 'rain' | 'heat' | 'aqi' | 'restriction';
  zone: string;
  started: Date;
  ended?: Date;
  confidence: number;
  severityFactor: number;
  claimsInitiated: number;
  status: 'MONITORING' | 'CONFIRMED' | 'EXPIRED';
  source: string;
  sourceData?: any;
}

interface DataSource {
  name: string;
  status: 'online' | 'degraded' | 'offline';
  lastUpdated: Date;
  latency: number;
  uptimeToday: number;
  fallbackMode: boolean;
}

// Mock Data
const MOCK_ZONES: Zone[] = [
  {
    id: 'andheri-east',
    name: 'Andheri East',
    city: 'Mumbai',
    activePolicies: 342,
    currentConditions: {
      weather: 'rain',
      aqi: 156,
      restrictions: false,
    },
    status: 'triggered',
    confidence: 94,
    lastUpdated: new Date(Date.now() - 2 * 60 * 1000),
  },
  {
    id: 'gurgaon-sec29',
    name: 'Sector 29',
    city: 'Gurgaon',
    activePolicies: 189,
    currentConditions: {
      weather: 'heat',
      aqi: 89,
      restrictions: false,
    },
    status: 'monitoring',
    confidence: 67,
    lastUpdated: new Date(Date.now() - 5 * 60 * 1000),
  },
  {
    id: 'koramangala',
    name: 'Koramangala',
    city: 'Bengaluru',
    activePolicies: 278,
    currentConditions: {
      weather: 'clear',
      aqi: 234,
      restrictions: false,
    },
    status: 'triggered',
    confidence: 89,
    lastUpdated: new Date(Date.now() - 1 * 60 * 1000),
  },
  {
    id: 'cp-delhi',
    name: 'Connaught Place',
    city: 'New Delhi',
    activePolicies: 156,
    currentConditions: {
      weather: 'clear',
      aqi: 67,
      restrictions: true,
    },
    status: 'clear',
    lastUpdated: new Date(Date.now() - 3 * 60 * 1000),
  },
  {
    id: 'bandra-west',
    name: 'Bandra West',
    city: 'Mumbai',
    activePolicies: 298,
    currentConditions: {
      weather: 'clear',
      aqi: 112,
      restrictions: false,
    },
    status: 'clear',
    lastUpdated: new Date(Date.now() - 4 * 60 * 1000),
  },
  {
    id: 'indiranagar',
    name: 'Indiranagar',
    city: 'Bengaluru',
    activePolicies: 203,
    currentConditions: {
      weather: 'clear',
      aqi: 98,
      restrictions: false,
    },
    status: 'clear',
    lastUpdated: new Date(Date.now() - 6 * 60 * 1000),
  },
];

const MOCK_ACTIVE_TRIGGERS: TriggerEvent[] = [
  {
    id: 'trig-001',
    type: 'rain',
    zone: 'Andheri East',
    started: new Date(Date.now() - 45 * 60 * 1000),
    confidence: 94,
    severityFactor: 1.4,
    claimsInitiated: 23,
    status: 'CONFIRMED',
    source: 'OpenWeather API',
    sourceData: { rainfall: '18.2mm/hr', duration: '45min' },
  },
  {
    id: 'trig-002',
    type: 'aqi',
    zone: 'Koramangala',
    started: new Date(Date.now() - 25 * 60 * 1000),
    confidence: 89,
    severityFactor: 1.2,
    claimsInitiated: 12,
    status: 'MONITORING',
    source: 'OpenAQ API',
    sourceData: { pm25: 234, pm10: 298 },
  },
  {
    id: 'trig-003',
    type: 'heat',
    zone: 'Gurgaon Sector 29',
    started: new Date(Date.now() - 15 * 60 * 1000),
    confidence: 67,
    severityFactor: 1.1,
    claimsInitiated: 0,
    status: 'MONITORING',
    source: 'OpenWeather API',
    sourceData: { temperature: 44.5, heatIndex: 48.2 },
  },
];

const MOCK_DATA_SOURCES: DataSource[] = [
  {
    name: 'OpenWeather API',
    status: 'online',
    lastUpdated: new Date(Date.now() - 2 * 60 * 1000),
    latency: 145,
    uptimeToday: 99.8,
    fallbackMode: false,
  },
  {
    name: 'OpenAQ API',
    status: 'online',
    lastUpdated: new Date(Date.now() - 3 * 60 * 1000),
    latency: 280,
    uptimeToday: 97.2,
    fallbackMode: false,
  },
  {
    name: 'Local Restriction Feed',
    status: 'degraded',
    lastUpdated: new Date(Date.now() - 8 * 60 * 1000),
    latency: 1250,
    uptimeToday: 94.5,
    fallbackMode: true,
  },
];

const MOCK_TRIGGER_HISTORY = [
  {
    id: 'hist-001',
    type: 'rain',
    zone: 'Bandra West',
    started: new Date(Date.now() - 3 * 60 * 60 * 1000),
    ended: new Date(Date.now() - 2 * 60 * 60 * 1000),
    confidence: 96,
    claimsInitiated: 34,
    payoutsProcessed: 28,
  },
  {
    id: 'hist-002',
    type: 'aqi',
    zone: 'Connaught Place',
    started: new Date(Date.now() - 4 * 60 * 60 * 1000),
    ended: new Date(Date.now() - 1 * 60 * 60 * 1000),
    confidence: 91,
    claimsInitiated: 18,
    payoutsProcessed: 15,
  },
  {
    id: 'hist-003',
    type: 'heat',
    zone: 'Koramangala',
    started: new Date(Date.now() - 6 * 60 * 60 * 1000),
    ended: new Date(Date.now() - 4 * 60 * 60 * 1000),
    confidence: 88,
    claimsInitiated: 42,
    payoutsProcessed: 39,
  },
];

export default function TriggerMonitoring() {
  const [zones, setZones] = useState(MOCK_ZONES);
  const [activeTriggers, setActiveTriggers] = useState(MOCK_ACTIVE_TRIGGERS);
  const [dataSources, setDataSources] = useState(MOCK_DATA_SOURCES);
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedTriggerType, setSelectedTriggerType] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmZoneName, setConfirmZoneName] = useState('');
  const [expandedHistoryRow, setExpandedHistoryRow] = useState<string | null>(null);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Randomly update zone conditions
      setZones(prev => prev.map(zone => ({
        ...zone,
        lastUpdated: zone.status === 'triggered' ? new Date() : zone.lastUpdated,
        confidence: zone.status === 'triggered' 
          ? Math.max(85, Math.min(98, zone.confidence! + (Math.random() - 0.5) * 4))
          : zone.confidence,
      })));

      // Update data source timestamps
      setDataSources(prev => prev.map(source => ({
        ...source,
        lastUpdated: source.status === 'online' ? new Date() : source.lastUpdated,
        latency: source.latency + Math.floor((Math.random() - 0.5) * 50),
      })));
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const getZoneStatusColor = (status: string) => {
    switch (status) {
      case 'clear': return 'bg-green-500';
      case 'monitoring': return 'bg-orange-500';
      case 'triggered': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getWeatherIcon = (weather: string) => {
    switch (weather) {
      case 'clear': return '☀️';
      case 'rain': return '🌧️';
      case 'heat': return '🌡️';
      case 'storm': return '⛈️';
      default: return '🌤️';
    }
  };

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'rain': return '🌧️';
      case 'heat': return '🌡️';
      case 'aqi': return '🌫️';
      case 'restriction': return '🔒';
      default: return '📍';
    }
  };

  const getDataSourceStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'degraded': return 'bg-orange-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDuration = (start: Date, end?: Date) => {
    const endTime = end || new Date();
    const minutes = Math.floor((endTime.getTime() - start.getTime()) / (1000 * 60));
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const handleManualTrigger = () => {
    if (!selectedZone || !selectedTriggerType) return;
    
    const zone = zones.find(z => z.id === selectedZone);
    if (!zone) return;

    if (confirmZoneName.toLowerCase() !== zone.name.toLowerCase()) {
      alert('Zone name does not match. Please type the exact zone name to confirm.');
      return;
    }

    // Simulate manual trigger activation
    console.log(`Manual trigger activated: ${selectedTriggerType} in ${zone.name}`);
    setShowConfirmModal(false);
    setConfirmZoneName('');
    setSelectedZone('');
    setSelectedTriggerType('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-text-primary mb-2">
          Trigger Monitoring
        </h1>
        <p className="text-text-secondary">
          Live environmental trigger detection and policy activation control
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column - Zone Status & Active Triggers */}
        <div className="lg:col-span-3 space-y-6">
          {/* Zone Status Grid */}
          <div>
            <h2 className="text-xl font-display font-semibold text-text-primary mb-4">
              Zone Status Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {zones.map((zone) => (
                <motion.div
                  key={zone.id}
                  className={`relative ${
                    zone.status === 'triggered' 
                      ? 'animate-pulse' 
                      : ''
                  }`}
                >
                  <Card className={`p-4 transition-all ${
                    zone.status === 'triggered'
                      ? 'border-red-500 border-2 shadow-lg shadow-red-100'
                      : zone.status === 'monitoring'
                      ? 'border-orange-300 border-2'
                      : 'border-gray-200'
                  }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-display font-semibold text-text-primary">
                          {zone.name}
                        </h3>
                        <p className="text-sm text-text-secondary">{zone.city}</p>
                        <p className="text-xs text-text-muted">{zone.activePolicies} active policies</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getZoneStatusColor(zone.status)} ${
                          zone.status === 'triggered' ? 'animate-pulse' : ''
                        }`}></div>
                        {zone.confidence && (
                          <span className="text-xs font-medium text-text-primary">
                            {zone.confidence}%
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <span className="text-lg">{getWeatherIcon(zone.currentConditions.weather)}</span>
                        <span className="text-text-secondary">Weather</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <span className="text-lg">🌫️</span>
                        <span className={`text-xs font-medium ${
                          zone.currentConditions.aqi > 200 ? 'text-red-600' :
                          zone.currentConditions.aqi > 100 ? 'text-orange-600' : 'text-green-600'
                        }`}>
                          {zone.currentConditions.aqi}
                        </span>
                      </div>

                      {zone.currentConditions.restrictions && (
                        <div className="flex items-center gap-1">
                          <span className="text-lg">🔒</span>
                          <span className="text-xs text-orange-600">Restricted</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-2 text-xs text-text-muted">
                      Updated {Math.floor((Date.now() - zone.lastUpdated.getTime()) / (1000 * 60))}m ago
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Active Trigger Feed */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-display font-semibold text-text-primary">
                Live Trigger Events
              </h2>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            
            <div className="space-y-4">
              <AnimatePresence>
                {activeTriggers.map((trigger) => (
                  <motion.div
                    key={trigger.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="text-3xl">{getTriggerIcon(trigger.type)}</div>
                        
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-display font-semibold text-text-primary capitalize">
                                {trigger.type} Event · {trigger.zone}
                              </h3>
                              <p className="text-sm text-text-secondary">
                                Started {formatDuration(trigger.started)} ago · {trigger.confidence}% confident
                              </p>
                            </div>
                            <Badge variant={
                              trigger.status === 'CONFIRMED' ? 'success' :
                              trigger.status === 'MONITORING' ? 'warning' : 'secondary'
                            }>
                              {trigger.status}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Severity:</span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                trigger.severityFactor >= 1.3 ? 'bg-red-100 text-red-800' :
                                trigger.severityFactor >= 1.1 ? 'bg-orange-100 text-orange-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {trigger.severityFactor}×
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="font-medium">Claims:</span>
                              <span className="text-text-primary font-semibold">
                                {trigger.claimsInitiated} auto-initiated
                              </span>
                            </div>

                            <div className="text-text-muted">
                              Source: {trigger.source}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>

              {activeTriggers.length === 0 && (
                <Card className="p-8 text-center">
                  <div className="text-4xl mb-2">🌤️</div>
                  <p className="text-text-secondary">No active triggers</p>
                  <p className="text-sm text-text-muted">All zones are operating normally</p>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Controls & Data Sources */}
        <div className="lg:col-span-2 space-y-6">
          {/* Data Source Health */}
          <Card className="p-4">
            <h3 className="font-display font-semibold text-text-primary mb-4">
              Data Source Health
            </h3>
            
            <div className="space-y-4">
              {dataSources.map((source) => (
                <div key={source.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getDataSourceStatusColor(source.status)}`}></div>
                      <span className="text-sm font-medium text-text-primary">{source.name}</span>
                    </div>
                    <span className="text-xs text-text-muted">
                      {Math.floor((Date.now() - source.lastUpdated.getTime()) / (1000 * 60))}m ago
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-text-secondary">
                    <span>Latency: {source.latency}ms</span>
                    <span>Uptime: {source.uptimeToday}%</span>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div 
                      className={`h-1 rounded-full ${
                        source.uptimeToday >= 99 ? 'bg-green-500' :
                        source.uptimeToday >= 95 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${source.uptimeToday}%` }}
                    ></div>
                  </div>

                  {source.fallbackMode && (
                    <div className="text-xs text-orange-600 flex items-center gap-1">
                      <span>⚠️</span>
                      <span>Fallback mode active</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Manual Controls */}
          <Card className="p-4">
            <h3 className="font-display font-semibold text-text-primary mb-4">
              Manual Controls
            </h3>
            <div className="text-xs text-orange-600 mb-4 flex items-center gap-1">
              <span>⚠️</span>
              <span>RISK_ADMIN access required</span>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Zone
                </label>
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  <option value="">Select zone</option>
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name}, {zone.city}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Trigger Type
                </label>
                <select
                  value={selectedTriggerType}
                  onChange={(e) => setSelectedTriggerType(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  <option value="">Select trigger</option>
                  <option value="restriction">Local Restriction</option>
                  <option value="rain">Rain Override</option>
                  <option value="heat">Heat Override</option>
                  <option value="aqi">AQI Override</option>
                </select>
              </div>

              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={!selectedZone || !selectedTriggerType}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Activate Manual Trigger
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* Trigger History Table */}
      <Card className="p-4">
        <h3 className="text-xl font-display font-semibold text-text-primary mb-4">
          Trigger History
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 font-medium text-text-secondary">Type</th>
                <th className="text-left py-2 font-medium text-text-secondary">Zone</th>
                <th className="text-left py-2 font-medium text-text-secondary">Started</th>
                <th className="text-left py-2 font-medium text-text-secondary">Duration</th>
                <th className="text-left py-2 font-medium text-text-secondary">Confidence</th>
                <th className="text-left py-2 font-medium text-text-secondary">Claims</th>
                <th className="text-left py-2 font-medium text-text-secondary">Payouts</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_TRIGGER_HISTORY.map((event) => (
                <tr
                  key={event.id}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setExpandedHistoryRow(expandedHistoryRow === event.id ? null : event.id)}
                >
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getTriggerIcon(event.type)}</span>
                      <span className="capitalize font-medium">{event.type}</span>
                    </div>
                  </td>
                  <td className="py-3 text-text-primary">{event.zone}</td>
                  <td className="py-3 text-text-secondary">
                    {event.started.toLocaleDateString()} {event.started.toLocaleTimeString()}
                  </td>
                  <td className="py-3 text-text-secondary">
                    {event.ended ? formatDuration(event.started, event.ended) : 'Ongoing'}
                  </td>
                  <td className="py-3">
                    <span className="font-medium">{event.confidence}%</span>
                  </td>
                  <td className="py-3 font-semibold text-text-primary">{event.claimsInitiated}</td>
                  <td className="py-3 font-semibold text-green-600">{event.payoutsProcessed}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <AnimatePresence>
            {expandedHistoryRow && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-4 bg-gray-100 rounded"
              >
                <h4 className="font-medium text-text-primary mb-2">Source Data</h4>
                <pre className="text-xs bg-gray-800 text-green-400 p-3 rounded overflow-x-auto">
                  {JSON.stringify({
                    triggerData: { temperature: 44.5, rainfall: 18.2, aqi: 234 },
                    timestamp: new Date().toISOString(),
                    source: "OpenWeather API v2.5",
                    confidence: 0.94
                  }, null, 2)}
                </pre>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowConfirmModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-display font-semibold text-text-primary mb-4">
                Confirm Manual Trigger Activation
              </h3>
              
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded">
                <p className="text-sm text-orange-800">
                  This will auto-initiate claims for{' '}
                  <strong>{zones.find(z => z.id === selectedZone)?.activePolicies}</strong>{' '}
                  active policies in {zones.find(z => z.id === selectedZone)?.name}.
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Type the zone name to confirm:
                </label>
                <input
                  type="text"
                  value={confirmZoneName}
                  onChange={(e) => setConfirmZoneName(e.target.value)}
                  placeholder={zones.find(z => z.id === selectedZone)?.name}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-text-secondary rounded hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleManualTrigger}
                  disabled={confirmZoneName.toLowerCase() !== zones.find(z => z.id === selectedZone)?.name.toLowerCase()}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Activate
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
