'use client';

import { useMemo, useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { CloudRain, Sun, Activity, Zap, ShieldCheck, Wallet, Clock, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const TRIGGER_FACTORS: Record<string, number> = {
  HeavyRain: 0.8,
  ExtremeHeat: 0.6,
  SeverePollution: 0.75,
  LocalRestriction: 1.0,
  PlatformOutage: 0.9,
};

const iconMap: Record<string, LucideIcon> = {
  HeavyRain: CloudRain,
  ExtremeHeat: Sun,
  SeverePollution: Activity,
  LocalRestriction: AlertTriangle,
  PlatformOutage: Zap,
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } }
};

export default function DashboardPage() {
  const [trigger, setTrigger] = useState('HeavyRain');
  const [duration, setDuration] = useState(3);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const estimated = useMemo(() => {
    const hourlyBaseline = 120;
    const factor = TRIGGER_FACTORS[trigger] || 0.8;
    const value = Math.round(hourlyBaseline * duration * factor);
    return value >= 287 ? 287 : value;
  }, [duration, trigger]);

  const CurrentIcon = iconMap[trigger] || CloudRain;

  if (!isMounted) return null;

  return (
    <div className="w-full max-w-6xl mx-auto font-sans bg-transparent">
      {/* Page Header */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2 font-display">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Rahul</span>
          </h1>
          <p className="text-neutral-400 text-[15px] max-w-lg leading-relaxed">
            Your Suraksha Income Shield is active. Tracking local weather and platform data in real-time.
          </p>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
          className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-xl cursor-default w-max"
        >
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </div>
          <span className="text-emerald-400 font-semibold text-xs tracking-widest uppercase">Shield Active</span>
        </motion.div>
      </div>

      <motion.div initial="hidden" animate="show" variants={containerVariants} className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Coverage Status Bento */}
        <motion.div variants={itemVariants} className="md:col-span-8 group">
          <Card className="h-full border border-white/[0.04] bg-white/[0.01] backdrop-blur-2xl shadow-2xl relative overflow-hidden transition-all duration-500 hover:border-white/[0.08] hover:bg-white/[0.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            <CardHeader className="pb-2 border-b border-white/[0.04]">
              <div className="flex justify-between items-center text-sm font-medium tracking-wide">
                <span className="text-neutral-400 uppercase tracking-widest text-xs flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Maximum Coverage
                </span>
                <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-full text-xs font-semibold">Protected Zone</span>
              </div>
            </CardHeader>
            <CardContent className="pt-8 pb-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div>
                  <div className="text-6xl sm:text-[5rem] font-bold text-white tracking-tighter leading-none mb-4 font-display">₹3,000</div>
                  <div className="inline-flex items-center gap-2 text-sm text-neutral-400">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span>Pro Plan limit for the week</span>
                  </div>
                </div>

                <div className="w-full md:w-64 space-y-4">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1">Amount Used</p>
                      <p className="text-xl font-bold text-neutral-200">₹287</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1">Utilization</p>
                      <p className="text-emerald-400 font-bold">9.5%</p>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden border border-white/[0.04]">
                    <motion.div 
                      initial={{ width: 0 }} animate={{ width: '9.5%' }} transition={{ duration: 1.5, ease: 'circOut', delay: 0.3 }}
                      className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full relative"
                    >
                      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent)] animate-[shine_2s_infinite]" />
                    </motion.div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Small Data Cards */}
        <motion.div variants={itemVariants} className="md:col-span-4 flex flex-col gap-6">
          <Card className="flex-1 border border-white/[0.04] bg-white/[0.01] backdrop-blur-2xl hover:bg-white/[0.03] transition-colors p-6 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl relative">
                <div className="absolute inset-0 bg-blue-400 blur-xl opacity-20" />
                <Wallet className="w-5 h-5 text-blue-400 relative z-10" />
              </div>
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">Payouts</span>
            </div>
            <div className="text-4xl font-bold text-white tracking-tight mb-1">₹1,240</div>
            <p className="text-[13px] text-neutral-500 font-medium">Total claimed to date</p>
          </Card>
          
          <Card className="flex-1 border border-white/[0.04] bg-white/[0.01] backdrop-blur-2xl hover:bg-white/[0.03] transition-colors p-6 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl relative">
                <div className="absolute inset-0 bg-amber-400 blur-xl opacity-20" />
                <Clock className="w-5 h-5 text-amber-400 relative z-10" />
              </div>
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">Speed</span>
            </div>
            <div className="text-4xl font-bold text-white tracking-tight mb-1">12s</div>
            <p className="text-[13px] text-neutral-500 font-medium">Avg settlement time</p>
          </Card>
        </motion.div>

        {/* Simulator Area */}
        <motion.div variants={itemVariants} className="md:col-span-6">
          <Card className="h-full border border-white/[0.04] bg-white/[0.01] backdrop-blur-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.05),transparent_50%)] pointer-events-none" />
            <CardHeader className="border-b border-white/[0.04] pb-4">
              <CardTitle className="text-lg font-semibold text-neutral-200 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" /> Simulator
              </CardTitle>
              <CardDescription className="text-neutral-500">Preview parametric triggers & limits</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-8">
              
              <div className="space-y-3">
                <label className="text-[13px] font-semibold text-neutral-400 tracking-wide uppercase">Select Disruption</label>
                <Select value={trigger} onValueChange={setTrigger}>
                  <SelectTrigger className="w-full h-14 bg-neutral-900 border border-white/[0.06] rounded-xl focus:ring-1 focus:ring-emerald-500/50 hover:bg-neutral-800 transition-colors shadow-inner text-neutral-200 font-medium">
                    <div className="flex items-center gap-3 px-1">
                      <CurrentIcon className="w-5 h-5 text-cyan-400" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-900 border border-white/[0.08] text-neutral-200">
                    <SelectItem value="HeavyRain" className="py-3 px-4 focus:bg-white/[0.05] cursor-pointer cursor-default">Torrential Rain (Orange Alert)</SelectItem>
                    <SelectItem value="ExtremeHeat" className="py-3 px-4 focus:bg-white/[0.05] cursor-pointer cursor-default">Extreme Heatwave (&gt;42°C)</SelectItem>
                    <SelectItem value="SeverePollution" className="py-3 px-4 focus:bg-white/[0.05] cursor-pointer cursor-default">Severe AQI (&gt;400)</SelectItem>
                    <SelectItem value="PlatformOutage" className="py-3 px-4 focus:bg-white/[0.05] cursor-pointer cursor-default">Delivery App Outage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="text-[13px] font-semibold text-neutral-400 tracking-wide uppercase">Duration</label>
                  <span className="text-emerald-400 font-bold text-xl">{duration}h</span>
                </div>
                <div className="relative pt-2 pb-6">
                  <input
                    type="range" min={1} max={8} step={1} value={duration} onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 shadow-inner"
                  />
                  <div className="absolute w-full flex justify-between text-[10px] font-bold text-neutral-600 uppercase tracking-widest mt-3 px-1">
                    <span>1h</span><span>4h</span><span>8h+</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-6 rounded-2xl bg-neutral-950 border border-white/[0.04] flex flex-col items-center justify-center relative shadow-inner overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-emerald-500/5 pointer-events-none" />
                <span className="text-[11px] font-bold text-neutral-500 mb-2 uppercase tracking-[0.2em] relative z-10">Estimated Support</span>
                <AnimatePresence mode="popLayout">
                  <motion.div 
                    key={estimated} initial={{ scale: 0.9, opacity: 0, filter: 'blur(4px)' }} animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }} exit={{ scale: 0.9, opacity: 0, filter: 'blur(4px)' }} transition={{ type: 'spring', damping: 20 }}
                    className="text-5xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-neutral-400 relative z-10 font-display" 
                  >
                    ₹{estimated}
                  </motion.div>
                </AnimatePresence>
              </div>

            </CardContent>
          </Card>
        </motion.div>

        {/* Live Event Timeline */}
        <motion.div variants={itemVariants} className="md:col-span-6">
          <Card className="h-full border border-white/[0.04] bg-white/[0.01] backdrop-blur-2xl">
            <CardHeader className="border-b border-white/[0.04] pb-4">
              <CardTitle className="text-lg font-semibold text-neutral-200 flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" /> Event Log
              </CardTitle>
              <CardDescription className="text-neutral-500">Immutable execution trail</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 relative">
              <div className="absolute top-8 bottom-8 left-[39px] w-[1px] bg-gradient-to-b from-emerald-500/50 via-white/5 to-transparent shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
              <div className="space-y-8 relative z-10">
                {[
                  { title: '₹287 Settled via UPI', desc: 'Secure payout completed instantly', time: 'Now', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-[#0a0a0a]', border: 'border-emerald-500/30' },
                  { title: 'AI Fraud Check Passed', desc: 'Trust Score: 98/100 (LOW RISK)', time: '1m', icon: ShieldCheck, color: 'text-cyan-400', bg: 'bg-[#0a0a0a]', border: 'border-cyan-500/30' },
                  { title: 'Smart Contract Payment', desc: 'Calculated 2.4hrs x ₹120/hr base', time: '2m', icon: Zap, color: 'text-blue-400', bg: 'bg-[#0a0a0a]', border: 'border-blue-500/30' },
                  { title: 'Disruption Validated', desc: 'Heavy rain detected via IMD APIs', time: '5m', icon: CloudRain, color: 'text-indigo-400', bg: 'bg-[#0a0a0a]', border: 'border-indigo-500/30' }
                ].map((step, i) => (
                  <motion.div 
                    key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + (i * 0.1) }}
                    className="flex gap-5 relative group"
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 z-10 border ${step.border} ${step.bg} shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                      <step.icon className={`w-4 h-4 ${step.color}`} />
                    </div>
                    <div className="flex-1 pb-1 -mt-0.5">
                      <div className="flex justify-between items-center mb-1">
                        <p className="font-semibold text-neutral-200 text-[15px] group-hover:text-white transition-colors">{step.title}</p>
                        <span className="text-[10px] font-mono text-neutral-500 bg-white/[0.03] px-1.5 py-0.5 rounded uppercase">{step.time}</span>
                      </div>
                      <p className="text-[13px] text-neutral-400 font-medium">{step.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

      </motion.div>
      <style jsx global>{`
        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
