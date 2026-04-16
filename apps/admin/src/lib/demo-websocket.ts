/**
 * Demo WebSocket Simulation
 * 
 * Simulates real-time WebSocket events for demo mode
 * Replaces actual WebSocket connections with mock event streams
 */

export interface SimulationEvent {
  id: string;
  type: 'TRIGGER_DETECTED' | 'CLAIM_SUBMITTED' | 'FRAUD_ALERT' | 'PAYOUT_COMPLETED';
  timestamp: string;
  data: any;
}

export interface DemoWebSocketOptions {
  url: string;
  onMessage: (event: SimulationEvent) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
}

export class DemoWebSocket {
  private interval: NodeJS.Timeout | null = null;
  private isConnected = false;
  private eventCounter = 0;
  private options: DemoWebSocketOptions;

  constructor(url: string, options: Partial<DemoWebSocketOptions> = {}) {
    this.options = {
      url,
      onMessage: () => {},
      onOpen: () => {},
      onClose: () => {},
      onError: () => {},
      ...options,
    };
  }

  connect(): void {
    console.log('[DEMO WS] Connecting to simulated WebSocket:', this.options.url);
    
    // Simulate connection delay
    setTimeout(() => {
      this.isConnected = true;
      this.options.onOpen?.();
      console.log('[DEMO WS] Connected to simulated WebSocket');
      
      // Start sending mock events every 10-30 seconds
      this.interval = setInterval(() => {
        this.sendMockEvent();
      }, this.getRandomInterval());
      
      // Send initial event after 2 seconds
      setTimeout(() => this.sendMockEvent(), 2000);
    }, 1000);
  }

  disconnect(): void {
    console.log('[DEMO WS] Disconnecting from simulated WebSocket');
    
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    
    this.isConnected = false;
    this.options.onClose?.();
  }

  private sendMockEvent(): void {
    if (!this.isConnected) return;

    const event = this.generateMockEvent();
    console.log('[DEMO WS] Simulated event:', event);
    
    this.options.onMessage(event);
  }

  private generateMockEvent(): SimulationEvent {
    this.eventCounter++;
    const eventTypes: SimulationEvent['type'][] = [
      'TRIGGER_DETECTED',
      'CLAIM_SUBMITTED',
      'FRAUD_ALERT',
      'PAYOUT_COMPLETED'
    ];
    
    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const timestamp = new Date().toISOString();
    const id = `demo-${Date.now()}-${this.eventCounter}`;

    switch (type) {
      case 'TRIGGER_DETECTED':
        return {
          id,
          type,
          timestamp,
          data: {
            triggerId: `TRG-${Date.now()}`,
            triggerType: Math.random() > 0.5 ? 'HEAVY_RAIN' : 'SEVERE_POLLUTION',
            location: this.getRandomLocation(),
            confidence: 0.85 + Math.random() * 0.15,
            severity: 1.0 + Math.random() * 0.5,
            affectedWorkers: Math.floor(50 + Math.random() * 200),
          }
        };

      case 'CLAIM_SUBMITTED':
        return {
          id,
          type,
          timestamp,
          data: {
            claimId: `CLM-${Date.now()}`,
            workerId: `W${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`,
            workerName: this.getRandomWorkerName(),
            amount: Math.floor(200 + Math.random() * 800),
            location: this.getRandomLocation(),
            triggerType: Math.random() > 0.5 ? 'HEAVY_RAIN' : 'SEVERE_POLLUTION',
          }
        };

      case 'FRAUD_ALERT':
        return {
          id,
          type,
          timestamp,
          data: {
            claimId: `CLM-${Date.now()}`,
            workerId: `W${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`,
            riskLevel: Math.random() > 0.7 ? 'CRITICAL' : 'MEDIUM',
            fraudScore: Math.random() > 0.7 ? 0.7 + Math.random() * 0.3 : 0.4 + Math.random() * 0.3,
            reasons: this.getRandomFraudReasons(),
          }
        };

      case 'PAYOUT_COMPLETED':
        return {
          id,
          type,
          timestamp,
          data: {
            payoutId: `PAY-${Date.now()}`,
            claimId: `CLM-${Date.now() - 1000}`,
            workerId: `W${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`,
            amount: Math.floor(200 + Math.random() * 800),
            method: 'UPI',
            status: Math.random() > 0.1 ? 'SUCCESS' : 'FAILED',
          }
        };

      default:
        throw new Error(`Unknown event type: ${type}`);
    }
  }

  private getRandomInterval(): number {
    // Random interval between 10-30 seconds
    return 10000 + Math.random() * 20000;
  }

  private getRandomLocation(): string {
    const locations = [
      'Andheri East, Mumbai',
      'Bandra, Mumbai',
      'Powai, Mumbai',
      'Koramangala, Bengaluru',
      'Indiranagar, Bengaluru',
      'Whitefield, Bengaluru',
      'Connaught Place, Delhi',
      'Karol Bagh, Delhi',
      'Lajpat Nagar, Delhi',
    ];
    return locations[Math.floor(Math.random() * locations.length)];
  }

  private getRandomWorkerName(): string {
    const names = [
      'Ravi Kumar',
      'Priya Singh',
      'Arjun Patel',
      'Sneha Sharma',
      'Vikash Yadav',
      'Anita Reddy',
      'Rohit Gupta',
      'Kavya Nair',
      'Suresh Mehta',
      'Pooja Jain',
    ];
    return names[Math.floor(Math.random() * names.length)];
  }

  private getRandomFraudReasons(): string[] {
    const reasons = [
      'Multiple claims in short time',
      'Unusual location pattern',
      'Impossible travel detected',
      'Device fingerprint mismatch',
      'Beneficiary reuse pattern',
      'Velocity check failed',
      'Historical behavior anomaly',
    ];
    
    const numReasons = 1 + Math.floor(Math.random() * 3);
    const shuffled = [...reasons].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, numReasons);
  }

  // Getters for compatibility with real WebSocket API
  get readyState(): number {
    return this.isConnected ? 1 : 0; // OPEN = 1
  }

  get url(): string {
    return this.options.url;
  }
}

/**
 * Factory function to create WebSocket connection
 * In demo mode: returns DemoWebSocket
 * In production: returns real WebSocket
 */
export function createWebSocket(
  url: string,
  options: Partial<DemoWebSocketOptions> = {}
): DemoWebSocket | WebSocket {
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  if (isDemoMode) {
    console.log('[DEMO WS] Creating simulated WebSocket connection');
    return new DemoWebSocket(url, options);
  }

  // Production: return real WebSocket
  console.log('[REAL WS] Creating real WebSocket connection');
  const ws = new WebSocket(url);
  
  ws.onopen = options.onOpen || (() => {});
  ws.onclose = options.onClose || (() => {});
  ws.onerror = (event) => {
    options.onError?.(new Error('WebSocket error'));
  };
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      options.onMessage?.(data);
    } catch (error) {
      console.error('[REAL WS] Failed to parse message:', error);
    }
  };

  return ws;
}

/**
 * Hook for real-time simulation events in React components
 */
export function useDemoWebSocket(url: string) {
  const [events, setEvents] = React.useState<SimulationEvent[]>([]);
  const [isConnected, setIsConnected] = React.useState(false);
  const [ws, setWs] = React.useState<DemoWebSocket | null>(null);

  React.useEffect(() => {
    const websocket = new DemoWebSocket(url, {
      onMessage: (event: SimulationEvent) => {
        setEvents(prev => [event, ...prev.slice(0, 49)]); // Keep last 50 events
      },
      onOpen: () => {
        setIsConnected(true);
      },
      onClose: () => {
        setIsConnected(false);
      },
      onError: (error) => {
        console.error('[DEMO WS] Error:', error);
        setIsConnected(false);
      },
    });

    websocket.connect();
    setWs(websocket);

    return () => {
      websocket.disconnect();
    };
  }, [url]);

  return {
    events,
    isConnected,
    disconnect: () => ws?.disconnect(),
  };
}