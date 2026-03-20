'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, useAnimation, useInView } from 'framer-motion';
import {
  CloudRain,
  Shield,
  CreditCard,
  CheckCircle,
  Smartphone,
  Zap,
  TrendingUp,
  Users,
  ArrowRight,
  ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const staggerChildren = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.3,
      delayChildren: 0.2
    }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4 } }
};

// Animated section component with intersection observer
function AnimatedSection({ children, variants = fadeInUp, className = "" }: {
  children: React.ReactNode;
  variants?: typeof fadeInUp;
  className?: string;
}) {
  const controls = useAnimation();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (inView) {
      controls.start('visible');
    }
  }, [controls, inView]);

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Step component with animation
interface StepProps {
  number: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  details: string[];
  gradient: string;
}

function Step({ number, icon, title, description, details, gradient }: StepProps) {
  return (
    <AnimatedSection
      variants={{
        hidden: { opacity: 0, y: 30 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.6
          }
        }
      }}
    >
      <div className="relative">
        {/* Step number floating badge */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="absolute -top-3 -left-3 z-10"
        >
          <Badge className="h-8 w-8 rounded-full bg-white border-2 border-primary shadow-lg font-bold text-primary">
            {number}
          </Badge>
        </motion.div>

        <Card className={`overflow-hidden border-0 shadow-xl bg-gradient-to-br ${gradient} text-white h-full`}>
          <CardContent className="p-6 space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center"
            >
              {icon}
            </motion.div>

            <div>
              <h3 className="text-xl font-bold mb-2">{title}</h3>
              <p className="text-white/90 mb-4">{description}</p>

              <motion.ul
                variants={staggerChildren}
                initial="hidden"
                animate="visible"
                className="space-y-2"
              >
                {details.map((detail, index) => (
                  <motion.li
                    key={index}
                    variants={scaleIn}
                    className="flex items-start gap-2 text-sm text-white/80"
                  >
                    <CheckCircle className="h-4 w-4 mt-0.5 text-green-300 flex-shrink-0" />
                    {detail}
                  </motion.li>
                ))}
              </motion.ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </AnimatedSection>
  );
}

// Floating animation component
function FloatingElement({ children, delay = 0 }: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      animate={{
        y: [-5, 5, -5],
      }}
      transition={{
        duration: 3,
        delay,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      {children}
    </motion.div>
  );
}

// Hero section
function Hero() {
  return (
    <section className="relative py-24 px-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 overflow-hidden">
      {/* Background animations */}
      <div className="absolute inset-0 overflow-hidden">
        <FloatingElement delay={0}>
          <CloudRain className="absolute top-20 left-10 h-8 w-8 text-blue-300/30" />
        </FloatingElement>
        <FloatingElement delay={1}>
          <Shield className="absolute top-32 right-20 h-12 w-12 text-indigo-300/30" />
        </FloatingElement>
        <FloatingElement delay={2}>
          <Zap className="absolute bottom-32 left-20 h-6 w-6 text-purple-300/30" />
        </FloatingElement>
      </div>

      <div className="max-w-4xl mx-auto text-center relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, delay: 1 }}
            >
              <Shield className="h-12 w-12 text-indigo-600" />
            </motion.div>
            <span className="text-2xl font-bold text-slate-900">Suraksha Weekly</span>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-4xl md:text-6xl font-bold text-slate-900 mb-6"
        >
          How Suraksha Weekly{' '}
          <motion.span
            initial={{ color: "#1e293b" }}
            animate={{ color: "#3b82f6" }}
            transition={{ duration: 1, delay: 1.5 }}
            className="text-indigo-600"
          >
            Works
          </motion.span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed"
        >
          AI-powered parametric insurance that automatically protects your income when disruptions hit.
          No claim forms, no waiting periods, no paperwork.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Button asChild size="lg" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-lg px-8 py-4 rounded-full shadow-xl">
            <Link href="/auth">
              Get Protected Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}

// How it works steps
function HowItWorksSteps() {
  const steps = [
    {
      number: 1,
      icon: <Smartphone className="h-6 w-6" />,
      title: "Sign Up & Get Verified",
      description: "Quick OTP-based onboarding for Zomato and Swiggy delivery partners",
      details: [
        "Verify your phone number instantly",
        "Connect your delivery platform profile",
        "Share your work zones and schedule",
        "AI calculates your personal risk profile"
      ],
      gradient: "from-blue-500 to-cyan-600"
    },
    {
      number: 2,
      icon: <Shield className="h-6 w-6" />,
      title: "Choose Your Shield",
      description: "AI-powered weekly premiums based on your actual risk exposure",
      details: [
        "Basic: Rain & pollution protection starting ₹149/week",
        "Standard: + Heat & restrictions coverage",
        "Pro: + Platform outage protection",
        "Dynamic pricing adjusts to your zone's real risk"
      ],
      gradient: "from-indigo-500 to-purple-600"
    },
    {
      number: 3,
      icon: <CloudRain className="h-6 w-6" />,
      title: "AI Monitors Disruptions",
      description: "Real-time trigger detection from verified weather and platform data",
      details: [
        "Heavy rain ≥5mm/hr in your active zone",
        "Extreme heat ≥42°C during work hours",
        "Severe pollution AQI ≥300",
        "Platform outages ≥60 minutes"
      ],
      gradient: "from-purple-500 to-pink-600"
    },
    {
      number: 4,
      icon: <CreditCard className="h-6 w-6" />,
      title: "Instant Auto-Payouts",
      description: "Money hits your account automatically when triggers fire",
      details: [
        "No claim forms or paperwork required",
        "Payouts calculated by hours lost × your declared rate",
        "Direct bank transfer within 30 minutes",
        "Multiple triggers stack up to your coverage cap"
      ],
      gradient: "from-green-500 to-emerald-600"
    }
  ];

  return (
    <section className="py-24 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <AnimatedSection className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            How It Works
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Four simple steps to protect your livelihood against weather disruptions,
            platform outages, and environmental hazards.
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {steps.map((step) => (
            <Step
              key={step.number}
              {...step}
            />
          ))}
        </div>

        {/* Process flow animation */}
        <AnimatedSection
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: {
              opacity: 1,
              y: 0,
              transition: {
                duration: 1
              }
            }
          }}
          className="mt-16 text-center"
        >
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500 max-w-lg mx-auto">
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Sign up
            </motion.div>
            <ArrowRight className="h-4 w-4" />
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            >
              Get insured
            </motion.div>
            <ArrowRight className="h-4 w-4" />
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: 1 }}
            >
              AI monitors
            </motion.div>
            <ArrowRight className="h-4 w-4" />
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}
            >
              Auto payout
            </motion.div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

// Stats section
function StatsSection() {
  const stats = [
    { number: "30s", label: "Average Payout Time", icon: <Zap className="h-6 w-6" /> },
    { number: "₹2,50,000+", label: "Claims Paid This Month", icon: <CreditCard className="h-6 w-6" /> },
    { number: "15,000+", label: "Protected Delivery Partners", icon: <Users className="h-6 w-6" /> },
    { number: "97%", label: "Claims Auto-Approved", icon: <TrendingUp className="h-6 w-6" /> }
  ];

  return (
    <section className="py-20 px-4 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-6xl mx-auto">
        <AnimatedSection className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Trusted by Thousands
          </h2>
          <p className="text-xl text-slate-600">
            Real results from delivery partners across India
          </p>
        </AnimatedSection>

        <motion.div
          variants={staggerChildren}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              variants={scaleIn}
              className="text-center"
            >
              <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                  {stat.icon}
                </div>
                <motion.div
                  initial={{ scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  className="text-2xl font-bold text-slate-900 mb-2"
                >
                  {stat.number}
                </motion.div>
                <div className="text-slate-600 text-sm">{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// CTA section
function CTASection() {
  return (
    <section className="py-24 px-4 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 text-white relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 70% 20%, white 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      <AnimatedSection className="max-w-4xl mx-auto text-center relative">
        <h2 className="text-3xl md:text-5xl font-bold mb-6">
          Ready to Protect Your Income?
        </h2>
        <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
          Join thousands of delivery partners who sleep better knowing their livelihood is protected.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Button asChild size="lg" className="bg-white text-indigo-600 hover:bg-gray-100 text-lg px-8 py-4 rounded-full shadow-xl">
            <Link href="/auth">
              Start Your Protection
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-white text-white hover:bg-white/10 text-lg px-8 py-4 rounded-full">
            <Link href="/">
              <ChevronLeft className="mr-2 h-5 w-5" />
              Back to Home
            </Link>
          </Button>
        </motion.div>
      </AnimatedSection>
    </section>
  );
}

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen">
      <Hero />
      <HowItWorksSteps />
      <StatsSection />
      <CTASection />
    </main>
  );
}