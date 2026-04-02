const fs = require('fs');
const path = require('path');

const demoDir = path.join(__dirname, 'apps', 'admin-web', 'src', 'app', 'demo');

try {
  fs.mkdirSync(demoDir, { recursive: true });
  console.log('Demo directory created successfully at:', demoDir);
  
  // Create the page.tsx file content
  const demoPageContent = `'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

// Types
interface DemoScenario {
  id: string;
  icon: string;
  name: string;
  description: string;
}

interface DemoStep {
  id: number;
  title: string;
  status: 'pending' | 'active' | 'done';
}

interface LiveEvent {
  id: string;
  type: 'POLICY' | 'TRIGGER' | 'CLAIM' | 'FRAUD_BLOCK' | 'PAYOUT';
  message: string;
  timestamp: Date;
  amount?: number;
  confidence?: number;
  zone?: string;
}

interface KPIMetric {
  key: string;
  label: string;
  value: number;
  color: string;
  format: 'number' | 'currency' | 'time';
  sparkline: number[];
}

// Mock data
const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'full-journey',
    icon: '🌧',
    name: 'Full Journey',
    description: 'Watch a worker get protected end-to-end'
  },
  {
    id: 'fraud-attempt',
    icon: '🚨',
    name: 'Fraud Attempt',
    description: 'See fraud detection in action'
  },
  {
    id: 'surge-mode',
    icon: '📈',
    name: 'Surge Mode',
    description: 'High-volume claims processing'
  }
];

const DEMO_STEPS: DemoStep[] = [
  { id: 1, title: 'Weather Alert Received', status: 'done' },
  { id: 2, title: 'Zone Analysis Started', status: 'done' },
  { id: 3, title: 'Workers Notified', status: 'done' },
  { id: 4, title: 'Claims Monitoring', status: 'active' },
  { id: 5, title: 'Auto-Verification', status: 'pending' },
  { id: 6, title: 'Fraud Detection', status: 'pending' },
  { id: 7, title: 'Payment Processing', status: 'pending' },
  { id: 8, title: 'Completion Notification', status: 'pending' }
];

// Animation variants
const panelVariants = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0 },
  hiddenRight: { opacity: 0, x: 50 },
  hiddenCenter: { opacity: 0, y: 30 }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -20, scale: 0.95 }
};

// Utility functions
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return \`\${mins}m \${secs.toString().padStart(2, '0')}s\`;
};

// Counter animation hook
const useCountUp = (target: number, duration: number = 1000) => {
  const [count, setCount] = useState(0);
  const startTime = useRef<number>();
  const animationFrame = useRef<number>();

  const animate = useCallback((timestamp: number) => {
    if (!startTime.current) startTime.current = timestamp;
    const progress = Math.min((timestamp - startTime.current) / duration, 1);
    
    const easeOutQuart = 1 - Math.pow(1 - progress, 4);
    setCount(Math.floor(target * easeOutQuart));
    
    if (progress < 1) {
      animationFrame.current = requestAnimationFrame(animate);
    }
  }, [target, duration]);

  useEffect(() => {
    startTime.current = undefined;
    animationFrame.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [target, animate]);

  return count;
};

// Components
const ScenarioButton = ({ 
  scenario, 
  isActive, 
  onClick 
}: { 
  scenario: DemoScenario; 
  isActive: boolean; 
  onClick: () => void; 
}) => (
  <motion.button
    className={\`w-full p-4 rounded-lg border-2 transition-all duration-300 text-left \${
      isActive
        ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/25'
        : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800/70'
    }\`}
    onClick={onClick}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    <div className="flex items-start space-x-3">
      <span className="text-2xl">{scenario.icon}</span>
      <div>
        <h3 className={\`font-display font-semibold \${isActive ? 'text-indigo-300' : 'text-white'}\`}>
          {scenario.name}
        </h3>
        <p className="text-sm text-gray-400 mt-1">
          {scenario.description}
        </p>
      </div>
    </div>
  </motion.button>
);

const StepItem = ({ step }: { step: DemoStep }) => (
  <div className="flex items-center space-x-3 py-2">
    <div className={\`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold \${
      step.status === 'done' ? 'bg-green-500 text-white' :
      step.status === 'active' ? 'bg-amber-500 text-black animate-pulse' :
      'bg-gray-600 text-gray-400'
    }\`}>
      {step.status === 'done' ? '✓' : step.id}
    </div>
    <span className={\`text-sm \${
      step.status === 'active' ? 'text-amber-300 font-medium' :
      step.status === 'done' ? 'text-gray-400' :
      'text-gray-500'
    }\`}>
      {step.title}
    </span>
  </div>
);

const EventCard = ({ event }: { event: LiveEvent }) => {
  const getEventStyle = (type: LiveEvent['type']) => {
    switch (type) {
      case 'POLICY':
        return 'border-indigo-500 bg-indigo-500/10 text-indigo-200';
      case 'TRIGGER':
        return 'border-amber-500 bg-amber-500/10 text-amber-200';
      case 'CLAIM':
        return 'border-blue-500 bg-blue-500/10 text-blue-200';
      case 'FRAUD_BLOCK':
        return 'border-red-500 bg-red-500/10 text-red-200 animate-pulse';
      case 'PAYOUT':
        return 'border-green-500 bg-green-500/10 text-green-200';
      default:
        return 'border-gray-500 bg-gray-500/10 text-gray-200';
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={\`p-3 rounded-lg border-l-4 \${getEventStyle(event.type)} mb-2 last:mb-0\`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <Badge variant="secondary" className="text-xs">
              {event.type}
            </Badge>
            <span className="text-xs text-gray-400">
              {event.timestamp.toLocaleTimeString()}
            </span>
          </div>
          <p className="text-sm font-medium">{event.message}</p>
        </div>
        {event.amount && (
          <span className="text-sm font-bold">
            {formatCurrency(event.amount)}
          </span>
        )}
      </div>
    </motion.div>
  );
};

const KPICard = ({ metric }: { metric: KPIMetric }) => {
  const animatedValue = useCountUp(metric.value, 1500);
  
  return (
    <Card className="p-4 bg-gray-800/50 border-gray-700">
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          {metric.label}
        </h4>
        <div className={\`text-2xl font-bold font-mono text-\${metric.color}-400\`}>
          {metric.format === 'currency' ? formatCurrency(animatedValue) :
           metric.format === 'time' ? formatTime(animatedValue) :
           animatedValue.toLocaleString()}
        </div>
        <div className="h-8 flex items-end space-x-1">
          {metric.sparkline.map((value, index) => (
            <div
              key={index}
              className={\`w-2 bg-\${metric.color}-400 rounded-t opacity-60\`}
              style={{ height: \`\${(value / Math.max(...metric.sparkline)) * 100}%\` }}
            />
          ))}
        </div>
      </div>
    </Card>
  );
};

export default function DemoPage() {
  const [activeScenario, setActiveScenario] = useState<string>('full-journey');
  const [speed, setSpeed] = useState<number>(1);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [kpis, setKpis] = useState<KPIMetric[]>([
    {
      key: 'active_policies',
      label: 'Active Policies',
      value: 21340,
      color: 'indigo',
      format: 'number',
      sparkline: [18000, 19500, 20100, 20800, 21340]
    },
    {
      key: 'claims_initiated',
      label: 'Claims Initiated',
      value: 287,
      color: 'blue',
      format: 'number',
      sparkline: [245, 258, 267, 274, 287]
    },
    {
      key: 'auto_approved',
      label: 'Auto-Approved',
      value: 264,
      color: 'green',
      format: 'number',
      sparkline: [220, 235, 248, 256, 264]
    },
    {
      key: 'fraud_blocked',
      label: 'Fraud Blocked',
      value: 12,
      color: 'red',
      format: 'number',
      sparkline: [8, 9, 10, 11, 12]
    },
    {
      key: 'total_paid',
      label: 'Total Paid Out',
      value: 142800,
      color: 'amber',
      format: 'currency',
      sparkline: [98000, 115000, 128000, 136000, 142800]
    },
    {
      key: 'avg_time',
      label: 'Trigger → Payout',
      value: 494,
      color: 'green',
      format: 'time',
      sparkline: [520, 510, 505, 498, 494]
    }
  ]);

  // Simulate live events
  useEffect(() => {
    if (!isRunning) return;

    const eventGenerators = [
      () => ({
        id: Date.now().toString(),
        type: 'POLICY' as const,
        message: \`Policy activated for Worker \${Math.floor(Math.random() * 1000)} · \${formatCurrency(Math.floor(Math.random() * 200) + 50)}\`,
        timestamp: new Date()
      }),
      () => ({
        id: Date.now().toString(),
        type: 'TRIGGER' as const,
        message: \`Heavy rain detected · Zone \${Math.floor(Math.random() * 10) + 1} · \${Math.floor(Math.random() * 20) + 80}% confidence\`,
        timestamp: new Date(),
        confidence: Math.floor(Math.random() * 20) + 80,
        zone: \`Zone \${Math.floor(Math.random() * 10) + 1}\`
      }),
      () => ({
        id: Date.now().toString(),
        type: 'CLAIM' as const,
        message: \`Claim auto-initiated · \${formatCurrency(Math.floor(Math.random() * 500) + 200)} estimated\`,
        timestamp: new Date(),
        amount: Math.floor(Math.random() * 500) + 200
      }),
      () => ({
        id: Date.now().toString(),
        type: 'FRAUD_BLOCK' as const,
        message: 'FRAUD BLOCKED · Impossible travel detected',
        timestamp: new Date()
      }),
      () => ({
        id: Date.now().toString(),
        type: 'PAYOUT' as const,
        message: \`\${formatCurrency(Math.floor(Math.random() * 500) + 200)} paid · \${formatTime(Math.floor(Math.random() * 300) + 300)} from trigger\`,
        timestamp: new Date(),
        amount: Math.floor(Math.random() * 500) + 200
      })
    ];

    const interval = setInterval(() => {
      const generator = eventGenerators[Math.floor(Math.random() * eventGenerators.length)];
      const newEvent = generator();
      
      setEvents(prev => [newEvent, ...prev.slice(0, 7)]);
      
      // Update KPIs based on event type
      setKpis(prev => prev.map(kpi => {
        let increment = 0;
        if (newEvent.type === 'CLAIM' && kpi.key === 'claims_initiated') increment = 1;
        if (newEvent.type === 'PAYOUT' && kpi.key === 'auto_approved') increment = 1;
        if (newEvent.type === 'FRAUD_BLOCK' && kpi.key === 'fraud_blocked') increment = 1;
        if (newEvent.type === 'PAYOUT' && kpi.key === 'total_paid') increment = newEvent.amount || 0;
        
        if (increment > 0) {
          return {
            ...kpi,
            value: kpi.value + increment,
            sparkline: [...kpi.sparkline.slice(1), kpi.value + increment]
          };
        }
        return kpi;
      }));
    }, 3000 / speed);

    return () => clearInterval(interval);
  }, [isRunning, speed]);

  const handleReset = () => {
    if (confirm('Reset demo to initial state?')) {
      setEvents([]);
      setKpis(kpis.map(kpi => ({
        ...kpi,
        value: kpi.sparkline[0],
        sparkline: Array(5).fill(kpi.sparkline[0])
      })));
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white overflow-hidden">
      {/* Main Layout */}
      <div className="flex h-screen">
        {/* Left Panel - Scenario Control */}
        <motion.div
          className="w-[30%] bg-gray-900/50 border-r border-gray-700 p-6 overflow-y-auto"
          variants={panelVariants}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-medium text-amber-400 uppercase tracking-widest mb-6">
                DEMO CONTROL
              </h2>
              
              {/* Scenario Buttons */}
              <div className="space-y-3 mb-6">
                {DEMO_SCENARIOS.map((scenario) => (
                  <ScenarioButton
                    key={scenario.id}
                    scenario={scenario}
                    isActive={activeScenario === scenario.id}
                    onClick={() => setActiveScenario(scenario.id)}
                  />
                ))}
              </div>

              {/* Speed Control */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-400 mb-3">PLAYBACK SPEED</h3>
                <div className="flex space-x-2">
                  {[1, 2, 5].map((speedValue) => (
                    <button
                      key={speedValue}
                      className={\`px-3 py-1 rounded-full text-sm font-medium transition-colors \${
                        speed === speedValue
                          ? 'bg-amber-500 text-black'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }\`}
                      onClick={() => setSpeed(speedValue)}
                    >
                      {speedValue}×
                    </button>
                  ))}
                </div>
              </div>

              {/* Step Timeline */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3">SCENARIO STEPS</h3>
                <div className="space-y-1">
                  {DEMO_STEPS.map((step) => (
                    <StepItem key={step.id} step={step} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Center Panel - Live Event Feed */}
        <motion.div
          className="w-[45%] p-6 overflow-y-auto"
          variants={panelVariants}
          initial="hiddenCenter"
          animate="visible"
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-display font-semibold">LIVE EVENTS</h2>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            </div>
            
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {events.map((event, index) => (
                  <motion.div
                    key={event.id}
                    style={{ 
                      opacity: 1 - (index * 0.1),
                      zIndex: events.length - index 
                    }}
                  >
                    <EventCard event={event} />
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {events.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-2">⏳</div>
                  <p>Waiting for events...</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Right Panel - Live KPIs */}
        <motion.div
          className="w-[25%] bg-gray-900/50 border-l border-gray-700 p-6 overflow-y-auto"
          variants={panelVariants}
          initial="hiddenRight"
          animate="visible"
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-widest">
              REAL-TIME METRICS
            </h2>
            
            <div className="space-y-4">
              {kpis.map((metric) => (
                <KPICard key={metric.key} metric={metric} />
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Bar */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 bg-gray-800/80 backdrop-blur-sm border-t border-gray-700 px-6 py-3"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
      >
        <div className="flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={handleReset}
            className="text-gray-400 hover:text-white"
          >
            ↺ Reset Demo
          </Button>
          
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>WebSocket: Connected</span>
            </div>
            <span>•</span>
            <span>Scenario: {isRunning ? 'Running' : 'Paused'}</span>
            <span>•</span>
            <span>Step 4 of {DEMO_STEPS.length}</span>
          </div>
          
          <Badge variant="secondary" className="bg-amber-500/20 text-amber-300 border-amber-500/30">
            DEMO ENVIRONMENT
          </Badge>
        </div>
      </motion.div>
    </div>
  );
}`;

  // Write the page.tsx file
  fs.writeFileSync(path.join(demoDir, 'page.tsx'), demoPageContent, 'utf8');
  console.log('Demo page created successfully at:', path.join(demoDir, 'page.tsx'));
  
} catch (error) {
  console.error('Error:', error.message);
}