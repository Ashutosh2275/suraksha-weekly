'use client';

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

const DEMO_STEPS = {
  'full-journey': [
    { id: 1, title: 'Weather Alert Received', status: 'done' as const },
    { id: 2, title: 'Zone Analysis Started', status: 'done' as const },
    { id: 3, title: 'Workers Notified', status: 'done' as const },
    { id: 4, title: 'Claims Monitoring', status: 'active' as const },
    { id: 5, title: 'Auto-Verification', status: 'pending' as const },
    { id: 6, title: 'Fraud Detection', status: 'pending' as const },
    { id: 7, title: 'Payment Processing', status: 'pending' as const },
    { id: 8, title: 'Completion Notification', status: 'pending' as const }
  ],
  'fraud-attempt': [
    { id: 1, title: 'Suspicious Claim Received', status: 'done' as const },
    { id: 2, title: 'ML Model Analysis', status: 'done' as const },
    { id: 3, title: 'Risk Score Calculation', status: 'done' as const },
    { id: 4, title: 'Pattern Recognition', status: 'active' as const },
    { id: 5, title: 'Device Fingerprinting', status: 'pending' as const },
    { id: 6, title: 'Fraud Flag Triggered', status: 'pending' as const },
    { id: 7, title: 'Manual Review Queue', status: 'pending' as const },
    { id: 8, title: 'Claim Rejection', status: 'pending' as const }
  ],
  'surge-mode': [
    { id: 1, title: 'Mass Event Detected', status: 'done' as const },
    { id: 2, title: 'Auto-Scale Triggered', status: 'done' as const },
    { id: 3, title: 'Bulk Processing Started', status: 'done' as const },
    { id: 4, title: 'Claims Batch Processing', status: 'active' as const },
    { id: 5, title: 'Parallel Verification', status: 'pending' as const },
    { id: 6, title: 'Bulk Fraud Screening', status: 'pending' as const },
    { id: 7, title: 'Mass Payout Execution', status: 'pending' as const },
    { id: 8, title: 'Volume Report Generated', status: 'pending' as const }
  ]
};

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
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
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
    className={`w-full p-4 rounded-lg border-2 transition-all duration-300 text-left ${
      isActive
        ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/25'
        : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800/70'
    }`}
    onClick={onClick}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    <div className="flex items-start space-x-3">
      <span className="text-2xl">{scenario.icon}</span>
      <div>
        <h3 className={`font-display font-semibold ${isActive ? 'text-indigo-300' : 'text-white'}`}>
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
    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
      step.status === 'done' ? 'bg-green-500 text-white' :
      step.status === 'active' ? 'bg-amber-500 text-black animate-pulse' :
      'bg-gray-600 text-gray-400'
    }`}>
      {step.status === 'done' ? '✓' : step.id}
    </div>
    <span className={`text-sm ${
      step.status === 'active' ? 'text-amber-300 font-medium' :
      step.status === 'done' ? 'text-gray-400' :
      'text-gray-500'
    }`}>
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
      className={`p-3 rounded-lg border-l-4 ${getEventStyle(event.type)} mb-2 last:mb-0`}
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
        <div className={`text-2xl font-bold font-mono text-${metric.color}-400`}>
          {metric.format === 'currency' ? formatCurrency(animatedValue) :
           metric.format === 'time' ? formatTime(animatedValue) :
           animatedValue.toLocaleString()}
        </div>
        <div className="h-8 flex items-end space-x-1">
          {metric.sparkline.map((value, index) => (
            <div
              key={index}
              className={`w-2 bg-${metric.color}-400 rounded-t opacity-60`}
              style={{ height: `${(value / Math.max(...metric.sparkline)) * 100}%` }}
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
  const [currentSteps, setCurrentSteps] = useState<DemoStep[]>(DEMO_STEPS['full-journey']);
  const [stepProgress, setStepProgress] = useState<number>(4); // Current active step index
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
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

  // Update steps when scenario changes
  useEffect(() => {
    const baseSteps = DEMO_STEPS[activeScenario as keyof typeof DEMO_STEPS] || DEMO_STEPS['full-journey'];
    setStepProgress(4); // Reset to step 4 for all scenarios
    setIsCompleted(false); // Reset completion status
    setCurrentSteps(baseSteps.map((step, index) => ({
      ...step,
      status: index < 3 ? 'done' : index === 3 ? 'active' : 'pending'
    })));
    // Clear events when switching scenarios for clean slate
    setEvents([]);
  }, [activeScenario]);

  // Simulate live events
  useEffect(() => {
    if (!isRunning) return;

    // Scenario-specific event generators
    const getEventGenerators = (scenario: string) => {
      switch (scenario) {
        case 'fraud-attempt':
          return [
            () => ({
              id: Date.now().toString(),
              type: 'FRAUD_BLOCK' as const,
              message: `FRAUD BLOCKED · Impossible travel detected`,
              timestamp: new Date()
            }),
            () => ({
              id: Date.now().toString(),
              type: 'FRAUD_BLOCK' as const,
              message: `FRAUD BLOCKED · Duplicate claim from same device`,
              timestamp: new Date()
            }),
            () => ({
              id: Date.now().toString(),
              type: 'FRAUD_BLOCK' as const,
              message: `FRAUD BLOCKED · Suspicious location pattern`,
              timestamp: new Date()
            }),
            () => ({
              id: Date.now().toString(),
              type: 'CLAIM' as const,
              message: `High-risk claim detected · Score 0.${Math.floor(Math.random() * 3) + 7}${Math.floor(Math.random() * 10)}`,
              timestamp: new Date(),
              amount: Math.floor(Math.random() * 300) + 100
            }),
            () => ({
              id: Date.now().toString(),
              type: 'TRIGGER' as const,
              message: `Manual review triggered · Fraud score 0.89`,
              timestamp: new Date(),
              confidence: 89,
              zone: `Zone ${Math.floor(Math.random() * 5) + 1}`
            })
          ];
        
        case 'surge-mode':
          return [
            () => ({
              id: Date.now().toString(),
              type: 'CLAIM' as const,
              message: `Surge processing · Batch ${Math.floor(Math.random() * 50) + 10} claims`,
              timestamp: new Date(),
              amount: Math.floor(Math.random() * 200) + 150
            }),
            () => ({
              id: Date.now().toString(),
              type: 'PAYOUT' as const,
              message: `Bulk payout · ${formatCurrency(Math.floor(Math.random() * 1000) + 500)} to ${Math.floor(Math.random() * 20) + 10} workers`,
              timestamp: new Date(),
              amount: Math.floor(Math.random() * 1000) + 500
            }),
            () => ({
              id: Date.now().toString(),
              type: 'TRIGGER' as const,
              message: `Mass event · Heat wave affecting ${Math.floor(Math.random() * 5) + 3} zones`,
              timestamp: new Date(),
              confidence: Math.floor(Math.random() * 15) + 85,
              zone: `Zones 1-${Math.floor(Math.random() * 5) + 3}`
            }),
            () => ({
              id: Date.now().toString(),
              type: 'POLICY' as const,
              message: `Auto-activation surge · ${Math.floor(Math.random() * 500) + 100} policies activated`,
              timestamp: new Date()
            }),
            () => ({
              id: Date.now().toString(),
              type: 'PAYOUT' as const,
              message: `${formatCurrency(Math.floor(Math.random() * 400) + 200)} paid · ${formatTime(Math.floor(Math.random() * 180) + 60)} processing`,
              timestamp: new Date(),
              amount: Math.floor(Math.random() * 400) + 200
            })
          ];
        
        default: // full-journey
          return [
            () => ({
              id: Date.now().toString(),
              type: 'POLICY' as const,
              message: `Policy activated for Worker ${Math.floor(Math.random() * 1000)} · ${formatCurrency(Math.floor(Math.random() * 200) + 50)}`,
              timestamp: new Date()
            }),
            () => ({
              id: Date.now().toString(),
              type: 'TRIGGER' as const,
              message: `Heavy rain detected · Zone ${Math.floor(Math.random() * 10) + 1} · ${Math.floor(Math.random() * 20) + 80}% confidence`,
              timestamp: new Date(),
              confidence: Math.floor(Math.random() * 20) + 80,
              zone: `Zone ${Math.floor(Math.random() * 10) + 1}`
            }),
            () => ({
              id: Date.now().toString(),
              type: 'CLAIM' as const,
              message: `Claim auto-initiated · ${formatCurrency(Math.floor(Math.random() * 500) + 200)} estimated`,
              timestamp: new Date(),
              amount: Math.floor(Math.random() * 500) + 200
            }),
            () => ({
              id: Date.now().toString(),
              type: 'PAYOUT' as const,
              message: `${formatCurrency(Math.floor(Math.random() * 500) + 200)} paid · ${formatTime(Math.floor(Math.random() * 300) + 300)} from trigger`,
              timestamp: new Date(),
              amount: Math.floor(Math.random() * 500) + 200
            })
          ];
      }
    };

    const eventGenerators = getEventGenerators(activeScenario);
    
    // Scenario-specific timing and frequency
    const getEventInterval = (scenario: string) => {
      switch (scenario) {
        case 'fraud-attempt': return 2000; // More frequent for dramatic effect
        case 'surge-mode': return 1500; // High frequency for volume demo
        default: return 3000; // Normal pace
      }
    };

    const interval = setInterval(() => {
      const generator = eventGenerators[Math.floor(Math.random() * eventGenerators.length)];
      const newEvent = generator();
      
      setEvents(prev => [newEvent, ...prev.slice(0, 7)]);
      
      // Event-based step progression - different triggers for different scenarios
      let shouldAdvanceStep = false;
      
      if (activeScenario === 'fraud-attempt') {
        // Advance on fraud detection events
        shouldAdvanceStep = (newEvent.type === 'FRAUD_BLOCK' && Math.random() < 0.8) || 
                           (newEvent.type === 'CLAIM' && Math.random() < 0.4);
      } else if (activeScenario === 'surge-mode') {
        // Advance on volume processing events  
        shouldAdvanceStep = (newEvent.type === 'PAYOUT' && Math.random() < 0.6) ||
                           (newEvent.type === 'CLAIM' && Math.random() < 0.5);
      } else {
        // Full journey - advance on any significant event
        shouldAdvanceStep = Math.random() < 0.35;
      }
      
      if (shouldAdvanceStep && !isCompleted && stepProgress < 8) {
        setStepProgress(prev => {
          const nextStep = prev + 1;
          if (nextStep <= 8) {
            setCurrentSteps(prevSteps => 
              prevSteps.map((step, index) => ({
                ...step,
                status: index < nextStep - 1 ? 'done' : 
                       index === nextStep - 1 ? 'active' : 'pending'
              }))
            );
            
            // Check completion
            if (nextStep === 8) {
              setIsCompleted(true);
              setTimeout(() => {
                const completionEvent: LiveEvent = {
                  id: Date.now().toString(),
                  type: activeScenario === 'fraud-attempt' ? 'FRAUD_BLOCK' : 'PAYOUT',
                  message: activeScenario === 'fraud-attempt' 
                    ? '🎯 SCENARIO COMPLETE · Fraud detection workflow finished'
                    : activeScenario === 'surge-mode'
                    ? '🚀 SCENARIO COMPLETE · Volume processing finished'
                    : '✅ SCENARIO COMPLETE · Worker protection journey finished',
                  timestamp: new Date()
                };
                setEvents(prevEvents => [completionEvent, ...prevEvents.slice(0, 6)]);
              }, 500);
            }
            
            return nextStep;
          }
          return prev;
        });
      }
      
      // Scenario-specific KPI updates
      setKpis(prev => prev.map(kpi => {
        let increment = 0;
        
        // Base increments
        if (newEvent.type === 'CLAIM' && kpi.key === 'claims_initiated') increment = 1;
        if (newEvent.type === 'PAYOUT' && kpi.key === 'auto_approved') increment = 1;
        if (newEvent.type === 'FRAUD_BLOCK' && kpi.key === 'fraud_blocked') increment = 1;
        if (newEvent.type === 'PAYOUT' && kpi.key === 'total_paid') increment = newEvent.amount || 0;
        
        // Scenario-specific multipliers
        if (activeScenario === 'surge-mode') {
          if (kpi.key === 'claims_initiated' && newEvent.type === 'CLAIM') increment = Math.floor(Math.random() * 10) + 5;
          if (kpi.key === 'auto_approved' && newEvent.type === 'PAYOUT') increment = Math.floor(Math.random() * 8) + 3;
          if (kpi.key === 'total_paid' && newEvent.type === 'PAYOUT') increment = (newEvent.amount || 0) * (Math.floor(Math.random() * 3) + 2);
        }
        
        if (activeScenario === 'fraud-attempt') {
          if (kpi.key === 'fraud_blocked' && newEvent.type === 'FRAUD_BLOCK') increment = 1;
          // Slow down other metrics during fraud scenario
          if (kpi.key === 'auto_approved' && newEvent.type === 'PAYOUT') increment = Math.random() > 0.7 ? 1 : 0;
        }
        
        if (increment > 0) {
          return {
            ...kpi,
            value: kpi.value + increment,
            sparkline: [...kpi.sparkline.slice(1), kpi.value + increment]
          };
        }
        return kpi;
      }));
    }, getEventInterval(activeScenario) / speed);

    return () => clearInterval(interval);
  }, [isRunning, speed, activeScenario]);

  const handleReset = () => {
    if (confirm('Reset demo to initial state?')) {
      setEvents([]);
      setStepProgress(4);
      setIsCompleted(false);
      const baseSteps = DEMO_STEPS[activeScenario as keyof typeof DEMO_STEPS] || DEMO_STEPS['full-journey'];
      setCurrentSteps(baseSteps.map((step, index) => ({
        ...step,
        status: index < 3 ? 'done' : index === 3 ? 'active' : 'pending'
      })));
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
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        speed === speedValue
                          ? 'bg-amber-500 text-black'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                      onClick={() => setSpeed(speedValue)}
                    >
                      {speedValue}×
                    </button>
                  ))}
                </div>
              </div>

              {/* Playback Control */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-400 mb-3">PLAYBACK CONTROL</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setIsRunning(!isRunning)}
                    className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isRunning 
                        ? 'bg-red-600 hover:bg-red-700 text-white' 
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {isRunning ? '⏸ Pause Demo' : '▶ Resume Demo'}
                  </button>
                  <Button
                    variant="ghost"
                    onClick={handleReset}
                    className="w-full text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500"
                  >
                    ↺ Reset Demo
                  </Button>
                </div>
              </div>

              {/* Step Timeline */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3">SCENARIO STEPS</h3>
                <div className="space-y-1">
                  {currentSteps.map((step) => (
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
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <h2 className="text-lg font-display font-semibold">LIVE EVENTS</h2>
                <div className={`w-2 h-2 rounded-full ${isCompleted ? 'bg-green-400' : isRunning ? 'bg-green-400 animate-pulse' : 'bg-amber-400'}`}></div>
                <div className="text-xs text-gray-400">
                  Step {stepProgress} of {currentSteps.length}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {isCompleted && (
                  <div className="text-sm text-green-400 font-medium">
                    ✅ SCENARIO COMPLETED
                  </div>
                )}
                <div className="text-xs text-gray-500 uppercase tracking-wide">
                  {activeScenario.replace('-', ' ')}
                </div>
              </div>
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
    </div>
  );
}