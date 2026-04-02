'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

// Types
interface DemoEvent {
  id: string;
  type: 'POLICY' | 'TRIGGER' | 'CLAIM' | 'FRAUD_BLOCK' | 'PAYOUT';
  title: string;
  subtitle: string;
  icon?: string;
  timestamp: Date;
  amount?: number;
}

interface DemoStep {
  id: string;
  title: string;
  status: 'pending' | 'active' | 'done';
  description: string;
}

interface DemoScenario {
  id: string;
  name: string;
  icon: string;
  description: string;
  steps: DemoStep[];
  events: DemoEvent[];
  duration: number; // seconds
}

interface LiveMetrics {
  activePolicies: number;
  claimsInitiated: number;
  autoApproved: number;
  fraudBlocked: number;
  totalPaidOut: number;
  avgPayoutTime: number; // seconds
}

// Demo Scenarios
const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'full-journey',
    name: 'Full Journey',
    icon: '🌧',
    description: 'Watch a worker get protected end-to-end',
    duration: 60,
    steps: [
      { id: '1', title: 'Worker enrolls', status: 'pending', description: 'Ravi signs up for coverage' },
      { id: '2', title: 'Policy activated', status: 'pending', description: 'Weekly premium collected' },
      { id: '3', title: 'Rain detected', status: 'pending', description: 'Weather API confirms heavy rain' },
      { id: '4', title: 'Zone triggered', status: 'pending', description: 'Coverage zone activated' },
      { id: '5', title: 'Claim initiated', status: 'pending', description: 'Auto-claim for affected workers' },
      { id: '6', title: 'Fraud check', status: 'pending', description: 'ML model validates legitimacy' },
      { id: '7', title: 'Amount calculated', status: 'pending', description: 'Payout based on hours covered' },
      { id: '8', title: 'Payment sent', status: 'pending', description: 'UPI transfer to worker' },
      { id: '9', title: 'Confirmation', status: 'pending', description: 'Worker receives notification' },
      { id: '10', title: 'Complete', status: 'pending', description: 'Journey completed successfully' }
    ],
    events: [
      {
        id: 'e1',
        type: 'POLICY',
        title: 'Policy activated for Ravi M.',
        subtitle: '₹67 premium · Andheri East',
        timestamp: new Date(),
      },
      {
        id: 'e2', 
        type: 'TRIGGER',
        title: 'Heavy rain confirmed',
        subtitle: 'Zone 3 · 94% confidence',
        icon: '🌧',
        timestamp: new Date(),
      },
      {
        id: 'e3',
        type: 'CLAIM',
        title: 'Claim auto-initiated',
        subtitle: '₹420 estimated payout',
        amount: 420,
        timestamp: new Date(),
      },
      {
        id: 'e4',
        type: 'PAYOUT',
        title: '₹420 paid successfully',
        subtitle: '8m 14s from trigger to payout',
        amount: 420,
        timestamp: new Date(),
      }
    ]
  },
  {
    id: 'fraud-attempt',
    name: 'Fraud Attempt',
    icon: '🚨',
    description: 'See how our ML detects and blocks fraud',
    duration: 30,
    steps: [
      { id: '1', title: 'Suspicious claim', status: 'pending', description: 'Worker submits claim' },
      { id: '2', title: 'Location check', status: 'pending', description: 'GPS validation begins' },
      { id: '3', title: 'Impossible travel', status: 'pending', description: 'ML detects location anomaly' },
      { id: '4', title: 'Fraud scored', status: 'pending', description: 'Risk score: 0.94/1.0' },
      { id: '5', title: 'Claim blocked', status: 'pending', description: 'Automatic fraud prevention' },
      { id: '6', title: 'Investigation', status: 'pending', description: 'Flagged for human review' }
    ],
    events: [
      {
        id: 'f1',
        type: 'CLAIM',
        title: 'Claim submitted',
        subtitle: 'Worker ID: WRK-4893 · ₹450',
        amount: 450,
        timestamp: new Date(),
      },
      {
        id: 'f2',
        type: 'FRAUD_BLOCK',
        title: 'FRAUD BLOCKED',
        subtitle: 'Impossible travel detected',
        icon: '🚨',
        timestamp: new Date(),
      }
    ]
  },
  {
    id: 'surge-mode',
    name: 'Surge Mode',
    icon: '📈',
    description: 'Mass claim processing during weather event',
    duration: 45,
    steps: [
      { id: '1', title: 'Storm warning', status: 'pending', description: 'Severe weather alert' },
      { id: '2', title: 'Zone activation', status: 'pending', description: 'Multiple zones triggered' },
      { id: '3', title: 'Mass claims', status: 'pending', description: '1,247 claims initiated' },
      { id: '4', title: 'Auto-processing', status: 'pending', description: 'ML handles bulk approvals' },
      { id: '5', title: 'Fraud monitoring', status: 'pending', description: 'Enhanced detection active' },
      { id: '6', title: 'Bulk payouts', status: 'pending', description: 'Payment processing' },
      { id: '7', title: 'System stable', status: 'pending', description: 'All systems nominal' }
    ],
    events: [
      {
        id: 's1',
        type: 'TRIGGER',
        title: 'Cyclone Tauktae detected',
        subtitle: 'Multiple zones · High severity',
        icon: '🌪',
        timestamp: new Date(),
      },
      {
        id: 's2',
        type: 'CLAIM',
        title: '1,247 claims initiated',
        subtitle: 'Bulk processing started',
        timestamp: new Date(),
      },
      {
        id: 's3',
        type: 'FRAUD_BLOCK',
        title: '23 fraudulent claims blocked',
        subtitle: 'Enhanced detection active',
        icon: '🛡',
        timestamp: new Date(),
      },
      {
        id: 's4',
        type: 'PAYOUT',
        title: '₹4,28,340 paid out',
        subtitle: '1,224 successful payouts',
        amount: 428340,
        timestamp: new Date(),
      }
    ]
  }
];

// Animated Counter Component
const AnimatedCounter = ({ 
  value, 
  duration = 1000, 
  prefix = '', 
  suffix = '',
  className = '' 
}: { 
  value: number; 
  duration?: number; 
  prefix?: string; 
  suffix?: string;
  className?: string;
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [prevValue, setPrevValue] = useState(0);

  useEffect(() => {
    if (value === prevValue) return;
    
    const startValue = prevValue;
    const endValue = value;
    const startTime = Date.now();
    
    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const current = Math.floor(startValue + (endValue - startValue) * easeOut);
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setPrevValue(value);
      }
    };
    
    animate();
  }, [value, duration, prevValue]);

  return (
    <span className={className}>
      {prefix}{displayValue.toLocaleString('en-IN')}{suffix}
    </span>
  );
};

// Sparkline Component
const Sparkline = ({ data, color = '#10B981' }: { data: number[], color?: string }) => {
  const chartData = data.map((value, index) => ({ value, index }));
  
  return (
    <div className="h-8 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={1.5}
            dot={false}
            animationDuration={300}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default function LiveDemoVisualization() {
  const [selectedScenario, setSelectedScenario] = useState<string>('full-journey');
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [currentStep, setCurrentStep] = useState(0);
  const [events, setEvents] = useState<DemoEvent[]>([]);
  const [metrics, setMetrics] = useState<LiveMetrics>({
    activePolicies: 12847,
    claimsInitiated: 342,
    autoApproved: 298,
    fraudBlocked: 7,
    totalPaidOut: 1248350,
    avgPayoutTime: 504 // 8m 24s
  });
  
  // Sparkline data for each metric
  const [sparklineData, setSparklineData] = useState({
    policies: [12800, 12820, 12835, 12840, 12847],
    claims: [320, 325, 330, 338, 342],
    approved: [280, 285, 290, 295, 298],
    blocked: [5, 5, 6, 6, 7],
    payout: [1200000, 1210000, 1225000, 1240000, 1248350]
  });

  const intervalRef = useRef<NodeJS.Timeout>();
  const stepTimeoutRef = useRef<NodeJS.Timeout>();

  const scenario = DEMO_SCENARIOS.find(s => s.id === selectedScenario)!;

  const addEvent = useCallback((event: DemoEvent) => {
    setEvents(prev => [{ ...event, id: `${event.id}-${Date.now()}` }, ...prev.slice(0, 7)]);
  }, []);

  const updateMetrics = useCallback((event: DemoEvent) => {
    setMetrics(prev => {
      const newMetrics = { ...prev };
      
      switch (event.type) {
        case 'POLICY':
          newMetrics.activePolicies += 1;
          break;
        case 'CLAIM':
          newMetrics.claimsInitiated += scenario.id === 'surge-mode' ? 1247 : 1;
          break;
        case 'PAYOUT':
          newMetrics.autoApproved += scenario.id === 'surge-mode' ? 1224 : 1;
          if (event.amount) {
            newMetrics.totalPaidOut += event.amount;
          }
          break;
        case 'FRAUD_BLOCK':
          newMetrics.fraudBlocked += scenario.id === 'surge-mode' ? 23 : 1;
          break;
      }
      
      return newMetrics;
    });

    // Update sparkline data
    setSparklineData(prev => ({
      policies: [...prev.policies.slice(1), metrics.activePolicies],
      claims: [...prev.claims.slice(1), metrics.claimsInitiated],
      approved: [...prev.approved.slice(1), metrics.autoApproved],
      blocked: [...prev.blocked.slice(1), metrics.fraudBlocked],
      payout: [...prev.payout.slice(1), metrics.totalPaidOut]
    }));
  }, [metrics, scenario.id]);

  const runScenario = useCallback(() => {
    if (isRunning) return;
    
    setIsRunning(true);
    setCurrentStep(0);
    setEvents([]);
    
    const stepDuration = (scenario.duration * 1000) / scenario.steps.length / speed;
    let stepIndex = 0;
    
    const executeStep = () => {
      if (stepIndex < scenario.steps.length) {
        setCurrentStep(stepIndex + 1);
        
        // Add corresponding event if exists
        if (scenario.events[stepIndex]) {
          const event = {
            ...scenario.events[stepIndex],
            timestamp: new Date()
          };
          addEvent(event);
          updateMetrics(event);
        }
        
        stepIndex++;
        stepTimeoutRef.current = setTimeout(executeStep, stepDuration);
      } else {
        setIsRunning(false);
      }
    };
    
    executeStep();
  }, [isRunning, scenario, speed, addEvent, updateMetrics]);

  const resetDemo = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (stepTimeoutRef.current) clearTimeout(stepTimeoutRef.current);
    
    setIsRunning(false);
    setCurrentStep(0);
    setEvents([]);
    setMetrics({
      activePolicies: 12847,
      claimsInitiated: 342,
      autoApproved: 298,
      fraudBlocked: 7,
      totalPaidOut: 1248350,
      avgPayoutTime: 504
    });
  };

  const getEventCardStyle = (type: DemoEvent['type']) => {
    switch (type) {
      case 'POLICY':
        return 'bg-gradient-to-r from-indigo-600 to-indigo-700 border-indigo-500';
      case 'TRIGGER':
        return 'bg-gradient-to-r from-amber-600 to-amber-700 border-amber-500';
      case 'CLAIM':
        return 'bg-gradient-to-r from-blue-600 to-blue-700 border-blue-500';
      case 'FRAUD_BLOCK':
        return 'bg-gradient-to-r from-red-600 to-red-700 border-red-500 animate-pulse';
      case 'PAYOUT':
        return 'bg-gradient-to-r from-green-600 to-green-700 border-green-500';
      default:
        return 'bg-gray-600';
    }
  };

  const formatPayoutTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Page load animations
  const pageVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.5 }
  };

  const leftPanelVariants = {
    initial: { x: -300, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    transition: { duration: 0.8, delay: 0.2 }
  };

  const centerPanelVariants = {
    initial: { y: 50, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { duration: 0.8, delay: 0.4 }
  };

  const rightPanelVariants = {
    initial: { x: 300, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    transition: { duration: 0.8, delay: 0.6 }
  };

  return (
    <motion.div 
      className="min-h-screen bg-slate-900 text-white overflow-hidden"
      style={{ backgroundColor: '#0A0F1E' }}
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      <div className="flex h-screen">
        {/* Left Panel - Scenario Control */}
        <motion.div 
          className="w-[30%] p-6 border-r border-gray-700"
          variants={leftPanelVariants}
          initial="initial"
          animate="animate"
        >
          <h2 className="text-sm font-medium tracking-wider text-amber-400 mb-6 uppercase">
            Demo Control
          </h2>
          
          {/* Scenario Buttons */}
          <div className="space-y-4 mb-8">
            {DEMO_SCENARIOS.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => {
                  setSelectedScenario(scenario.id);
                  resetDemo();
                }}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all duration-300 ${
                  selectedScenario === scenario.id 
                    ? 'border-indigo-500 bg-indigo-900/30 shadow-lg shadow-indigo-500/20' 
                    : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{scenario.icon}</span>
                  <span className="font-semibold text-lg">{scenario.name}</span>
                </div>
                <p className="text-gray-400 text-sm">{scenario.description}</p>
              </button>
            ))}
          </div>

          {/* Speed Control */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Speed</h3>
            <div className="flex rounded-lg border border-gray-600 p-1 bg-gray-800/50">
              {[1, 2, 5].map((speedValue) => (
                <button
                  key={speedValue}
                  onClick={() => setSpeed(speedValue)}
                  className={`flex-1 py-2 px-3 text-sm rounded transition-colors ${
                    speed === speedValue 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  {speedValue}×
                </button>
              ))}
            </div>
          </div>

          {/* Step Timeline */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3">Steps</h3>
            <div className="space-y-2">
              {scenario.steps.map((step, index) => {
                const isActive = index + 1 === currentStep;
                const isDone = index + 1 < currentStep;
                
                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-3 p-2 rounded transition-all ${
                      isActive ? 'text-amber-400' : isDone ? 'text-green-400' : 'text-gray-500'
                    }`}
                  >
                    <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs">
                      {isDone ? (
                        <span className="text-green-400">✓</span>
                      ) : isActive ? (
                        <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{step.title}</div>
                      <div className="text-xs text-gray-400">{step.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Run/Reset Button */}
          <div className="mt-8">
            <Button
              onClick={isRunning ? resetDemo : runScenario}
              disabled={isRunning}
              className={`w-full py-3 ${
                isRunning 
                  ? 'bg-gray-700 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {isRunning ? 'Running...' : 'Start Demo'}
            </Button>
          </div>
        </motion.div>

        {/* Center Panel - Live Event Feed */}
        <motion.div 
          className="w-[45%] p-6"
          variants={centerPanelVariants}
          initial="initial"
          animate="animate"
        >
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-xl font-semibold">Live Events</h2>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </div>

          <div className="space-y-3 h-[calc(100vh-140px)] overflow-hidden">
            <AnimatePresence>
              {events.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ y: 50, opacity: 0, scale: 0.95 }}
                  animate={{ y: 0, opacity: 1 - (index * 0.1), scale: 1 }}
                  exit={{ y: -50, opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, type: "spring" }}
                  className={`p-4 rounded-lg border-2 ${getEventCardStyle(event.type)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {event.icon && (
                        <span className="text-xl mt-0.5">{event.icon}</span>
                      )}
                      <div>
                        <h3 className="font-semibold text-white">{event.title}</h3>
                        <p className="text-gray-100 opacity-90">{event.subtitle}</p>
                        <p className="text-xs text-gray-200 opacity-70 mt-1">
                          {event.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    {event.type === 'PAYOUT' && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-green-300"
                      >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {events.length === 0 && (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <div className="text-center">
                  <div className="text-4xl mb-2">⚡</div>
                  <p>Waiting for events...</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Right Panel - Live KPIs */}
        <motion.div 
          className="w-[25%] p-6 border-l border-gray-700"
          variants={rightPanelVariants}
          initial="initial"
          animate="animate"
        >
          <h2 className="text-sm font-medium tracking-wider text-gray-300 mb-6 uppercase">
            Real-Time Metrics
          </h2>

          <div className="space-y-6">
            {/* Active Policies */}
            <div className="bg-gray-800/50 p-4 rounded-lg border border-indigo-500/30">
              <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Active Policies</div>
              <div className="text-2xl font-bold text-indigo-400 mb-2">
                <AnimatedCounter value={metrics.activePolicies} />
              </div>
              <Sparkline data={sparklineData.policies} color="#6366F1" />
            </div>

            {/* Claims Initiated */}
            <div className="bg-gray-800/50 p-4 rounded-lg border border-blue-500/30">
              <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Claims Initiated</div>
              <div className="text-2xl font-bold text-blue-400 mb-2">
                <AnimatedCounter value={metrics.claimsInitiated} />
              </div>
              <Sparkline data={sparklineData.claims} color="#3B82F6" />
            </div>

            {/* Auto-Approved */}
            <div className="bg-gray-800/50 p-4 rounded-lg border border-green-500/30">
              <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Auto-Approved</div>
              <div className="text-2xl font-bold text-green-400 mb-2">
                <AnimatedCounter value={metrics.autoApproved} />
              </div>
              <Sparkline data={sparklineData.approved} color="#10B981" />
            </div>

            {/* Fraud Blocked */}
            <motion.div 
              className={`bg-gray-800/50 p-4 rounded-lg border border-red-500/30 transition-all ${
                metrics.fraudBlocked > 7 ? 'animate-pulse bg-red-900/20' : ''
              }`}
              animate={metrics.fraudBlocked > 7 ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Fraud Blocked</div>
              <div className="text-2xl font-bold text-red-400 mb-2">
                <AnimatedCounter value={metrics.fraudBlocked} />
              </div>
              <Sparkline data={sparklineData.blocked} color="#EF4444" />
            </div>

            {/* Total Paid Out */}
            <div className="bg-gray-800/50 p-4 rounded-lg border border-amber-500/30">
              <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Total Paid Out</div>
              <div className="text-xl font-bold text-amber-400 mb-2">
                <AnimatedCounter value={metrics.totalPaidOut} prefix="₹" />
              </div>
              <Sparkline data={sparklineData.payout} color="#F59E0B" />
            </div>

            {/* Avg Payout Time */}
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-500/30">
              <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Trigger → Payout</div>
              <div className={`text-xl font-bold mb-2 ${
                metrics.avgPayoutTime <= 600 ? 'text-green-400' : 'text-yellow-400'
              }`}>
                {formatPayoutTime(metrics.avgPayoutTime)}
              </div>
              <div className="text-xs text-gray-400">
                Target: &lt;10 minutes
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Bar */}
      <motion.div 
        className="fixed bottom-0 left-0 right-0 bg-gray-800/90 backdrop-blur-sm border-t border-gray-700 px-6 py-4"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <div className="flex items-center justify-between">
          <button
            onClick={resetDemo}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            <span>↺</span>
            <span>Reset Demo</span>
          </button>
          
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>WebSocket: Connected</span>
            </div>
            <span>•</span>
            <span>Scenario: {isRunning ? 'Running' : 'Ready'}</span>
            <span>•</span>
            <span>Step {currentStep} of {scenario.steps.length}</span>
          </div>

          <div className="px-3 py-1 bg-amber-600 text-amber-100 rounded-full text-xs font-medium uppercase tracking-wider">
            Demo Environment
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}