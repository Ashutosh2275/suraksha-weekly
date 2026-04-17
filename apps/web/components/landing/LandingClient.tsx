'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { ArrowRight, Shield, Zap, CheckCircle, ChevronUp } from 'lucide-react';

const STATS = [
  { label: 'Protected Workers', target: 10000, suffix: '+' },
  { label: 'Pilot Cities', target: 6 },
  { label: 'Avg. Payout Time', target: 8, suffix: 'm' },
  { label: 'Fraud Intercepts', target: 97, suffix: '%' }
];

const HOW_IT_WORKS = [
  {
    title: 'Detect Trigger',
    description: 'Weather, heat, and AQI signals are continuously monitored by zone-level smart rules.',
    icon: Zap,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20'
  },
  {
    title: 'Run AI Checks',
    description: 'The claim is validating for policy status, fraud risk, and eligibility in seconds.',
    icon: Shield,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/20'
  },
  {
    title: 'Auto Payout',
    description: 'Eligible workers receive payouts instantly with complete decision trace audits.',
    icon: CheckCircle,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20'
  }
];

export default function LandingClient() {
  const statsRef = useRef(null);
  const [statsStarted, setStatsStarted] = useState(false);
  const [counts, setCounts] = useState(STATS.map(() => 0));
  const [showTop, setShowTop] = useState(false);

  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  const navItems = useMemo(() => [
    { href: '#hero', label: 'Overview' },
    { href: '#how-it-works', label: 'How It Works' },
    { href: '#stats', label: 'Impact' },
    { href: '#judges', label: 'For Judges' }
  ], []);

  useEffect(() => {
    const section = statsRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!statsStarted) return;
    let frameId = 0;
    const durationMs = 2000;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setCounts(STATS.map((stat) => Math.round(stat.target * eased)));
      if (progress < 1) frameId = requestAnimationFrame(step);
    };
    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [statsStarted]);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#030712] text-slate-50 selection:bg-cyan-500/30 selection:text-cyan-200">
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#030712]/80 backdrop-blur-xl transition-all duration-500">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm font-black tracking-[0.2em] text-white/90 uppercase">Suraksha Weekly</p>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-medium tracking-wide text-slate-400 sm:flex">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="hover:text-cyan-400 transition-colors uppercase text-xs tracking-widest">{item.label}</a>
            ))}
          </nav>
        </div>
      </header>

      <section id="hero" className="relative min-h-screen flex items-center justify-center border-b border-white/5 pt-20">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div style={{ y: heroY, opacity: heroOpacity }} className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-indigo-600/15 blur-[120px]" />
          <motion.div style={{ y: heroY, opacity: heroOpacity }} className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-cyan-600/15 blur-[120px]" />
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
        </div>
        
        <div className="mx-auto max-w-5xl px-6 py-20 relative z-10 w-full">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center text-center gap-8"
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-5 py-2 backdrop-blur-md"
            >
              <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-cyan-300">
                Guidewire DEVTrails Soar Phase · 2026
              </p>
            </motion.div>
            
            <h1 className="max-w-4xl text-5xl font-extrabold tracking-tighter text-white sm:text-7xl leading-[1.1] font-display">
              AI Income Protection That <br className="hidden sm:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-500">
                Proves Itself in 20 Seconds
              </span>
            </h1>
            
            <p className="max-w-2xl text-lg sm:text-xl text-slate-400 font-medium leading-relaxed">
              Suraksha Weekly instantly protects gig workers from income loss caused by severe weather or heatwaves. Transparent, automated, and built for scale.
            </p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid w-full grid-cols-1 gap-4 sm:flex sm:justify-center mt-4"
            >
              <Link href="/auth" className="sm:w-auto w-full">
                <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-base bg-white text-[#030712] hover:bg-slate-200 transition-all font-bold rounded-2xl group flex items-center gap-2 shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)]">
                  Start Worker Journey <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <a href="https://worker.suraksha-weekly.vercel.app" target="_blank" rel="noreferrer" className="sm:w-auto w-full">
                <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-base border-white/10 bg-white/5 backdrop-blur-md text-white hover:bg-white/10 transition-all font-semibold rounded-2xl">
                  Live Live App
                </Button>
              </a>
              <a href="https://admin.suraksha-weekly.vercel.app" target="_blank" rel="noreferrer" className="sm:w-auto w-full">
                <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-base border-transparent bg-transparent text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-all font-semibold rounded-2xl">
                  Admin Console
                </Button>
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section id="how-it-works" className="py-24 sm:py-32 relative border-b border-white/5 bg-[#030712]">
        <div className="mx-auto max-w-6xl px-6 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-6">How Our Engine <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Works</span></h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto font-medium">From continuous monitoring to instant payout without a single human intervention.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-[44px] left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-amber-500/20 via-cyan-500/20 to-emerald-500/20 rounded-full" />
            {HOW_IT_WORKS.map((step, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: idx * 0.2, duration: 0.6 }}
                className="relative"
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center border bg-[#030712] relative z-10 ${step.bg} shadow-xl backdrop-blur-xl mb-6 transition-transform hover:scale-110 duration-500`}>
                    <step.icon className={`w-8 h-8 ${step.color}`} />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">{step.title}</h3>
                  <p className="text-slate-400 text-[15px] leading-relaxed max-w-[280px] font-medium">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="stats" ref={statsRef} className="py-24 sm:py-32 relative border-b border-white/5 bg-[#030712] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/10 to-transparent pointer-events-none" />
        <div className="mx-auto max-w-6xl px-6 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {STATS.map((stat, idx) => (
              <div key={idx} className="flex flex-col items-center text-center border-l first:border-none border-white/5 pl-8 first:pl-0">
                <div className="text-4xl sm:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-cyan-300 to-indigo-400 mb-3 tracking-tighter">
                  {counts[idx]}{stat.suffix}
                </div>
                <div className="text-sm sm:text-base font-bold text-slate-400 uppercase tracking-widest">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="judges" className="py-24 sm:py-32 relative bg-[#030712]">
        <div className="mx-auto max-w-6xl px-6 relative z-10">
          <div className="rounded-[40px] border border-white/10 bg-white/[0.03] p-8 sm:p-16 backdrop-blur-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-12 tracking-tight">Reviewer Notes</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { title: 'Zero Friction UX', desc: 'Watch how quickly workers can activate coverage and see payouts with minimal taps and extreme clarity.' },
                { title: 'Traceable AI Decisions', desc: 'Check the Admin Console to view the transparent logs behind every automated payout decision.' },
                { title: 'Enterprise Ready', desc: 'Built on Next.js, Framer Motion, and a heavily optimized stack capable of tracking millions of gig events.' }
              ].map((idx, i) => (
                <div key={i} className="space-y-4">
                  <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400 font-bold text-lg">0{i+1}</div>
                  <h3 className="text-xl font-bold text-white">{idx.title}</h3>
                  <p className="text-slate-400 font-medium leading-relaxed">{idx.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#030712] py-8 text-center text-slate-500 text-sm font-medium tracking-wide">
        <p>© 2026 Suraksha Weekly · Built for Guidewire DEVTrails</p>
      </footer>

      <AnimatePresence>
        {showTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-8 right-8 z-50 rounded-full bg-white/10 p-4 font-bold text-white shadow-2xl backdrop-blur-md border border-white/20 transition-all hover:bg-white/20 hover:scale-110 active:scale-95"
            aria-label="Scroll to top"
          >
            <ChevronUp className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>
    </main>
  );
}
