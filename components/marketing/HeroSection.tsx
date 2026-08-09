"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Calendar, Activity, Bell, ChevronRight, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const features = [
  "Expiry Intelligence",
  "AI Recommendations",
  "Waste Prevention",
  "Multi-Store"
];

const stagger = {
  animate: {
    transition: { staggerChildren: 0.1 }
  }
};

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const } }
};

export function HeroSection() {
  return (
    <section className="relative pt-32 pb-32 overflow-hidden">
      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Content */}
          <motion.div 
            initial="initial"
            animate="animate"
            variants={stagger}
            className="flex flex-col gap-8 max-w-2xl"
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-brand-green-light text-sm font-medium w-fit border-brand-green/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-green"></span>
              </span>
              AI Powered, Zero Waste, More Profit.
            </motion.div>
            
            <motion.h1 variants={fadeUp} className="text-5xl lg:text-7xl font-bold tracking-tight text-text-primary leading-[1.1]">
              Run a Smarter, <br/> Greener Shop <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-green to-emerald-300">with GreenShop AI</span>
            </motion.h1>
            
            <motion.p variants={fadeUp} className="text-xl text-slate-400 leading-relaxed max-w-lg font-light">
              AI-powered inventory, expiry & sales intelligence that helps you prevent waste, save money and grow sustainably.
            </motion.p>
            
            <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4 max-w-md">
              {features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3 text-slate-300 font-medium">
                  <div className="w-5 h-5 rounded-full bg-brand-green/20 flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-green-light" />
                  </div>
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </motion.div>
            
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link 
                href="/trial" 
                className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-brand-green text-black font-bold hover:bg-brand-green-light transition-all shadow-glow hover:translate-y-0.5 active:scale-95 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative flex items-center gap-2">Start Free Trial <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></span>
              </Link>
              <Link 
                href="/demo" 
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl glass-panel text-text-primary font-semibold hover:border-brand-green/50 hover:bg-slate-100 transition-all active:scale-95"
              >
                Book a Demo <Calendar className="w-5 h-5 text-slate-400" />
              </Link>
            </motion.div>
          </motion.div>
          
          {/* Right Content - Dribbble Style Finance Dashboard Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40, rotateY: -10 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="relative hidden lg:block h-[700px] w-full perspective-[2000px]"
          >
            <div className="absolute top-0 right-[-10%] w-[110%] h-full glass-panel rounded-3xl flex overflow-hidden border-t-slate-200/50 border-l-slate-200/50">
              
              {/* Sidebar */}
              <div className="w-[240px] bg-black/40 border-r border-border p-6 flex flex-col gap-6 shrink-0 z-10 relative backdrop-blur-3xl">
                <div className="flex items-center gap-3 font-bold text-lg mb-4 text-text-primary">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-green to-emerald-600 flex items-center justify-center shadow-glow">
                    <Activity className="w-5 h-5 text-black" />
                  </div>
                  GreenShop AI
                </div>
                
                <div className="flex flex-col gap-2">
                  <div className="px-4 py-3 rounded-xl bg-brand-green/10 text-brand-green-light font-medium flex items-center gap-3 border border-brand-green/20">
                    <BarChart3 className="w-4 h-4" /> Dashboard
                  </div>
                  {['Products', 'Inventory', 'Sales', 'Purchases'].map((item) => (
                    <div key={item} className="px-4 py-3 rounded-xl text-slate-400 font-medium flex items-center gap-3 hover:text-text-primary hover:bg-white/5 transition-colors cursor-pointer">
                      <div className="w-4 h-4 rounded border border-current opacity-50" /> {item}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Main Area */}
              <div className="flex-1 p-8 flex flex-col gap-6 overflow-hidden relative">
                {/* Header */}
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-text-primary">Overview</h2>
                  <div className="flex gap-4">
                    <div className="px-4 py-2 glass-panel rounded-xl text-sm font-medium flex items-center gap-2 text-slate-300">
                      May 28, 2026 <ChevronRight className="w-4 h-4 rotate-90" />
                    </div>
                  </div>
                </div>
                
                {/* Stats Bento Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { title: "Total Value", value: "₹4,82,340", trend: "+12.5%", isPositive: true },
                    { title: "At Risk (Expiry)", value: "₹18,420", trend: "37 items", isPositive: false },
                  ].map((stat, i) => (
                    <div key={i} className="glass-panel p-5 rounded-2xl flex flex-col gap-2 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-brand-green/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="text-xs text-slate-400 font-medium">{stat.title}</div>
                      <div className="text-3xl font-bold text-text-primary">{stat.value}</div>
                      <div className={cn("text-xs font-semibold mt-2", stat.isPositive ? "text-brand-green-light" : "text-rose-400")}>
                        {stat.trend}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Chart Area */}
                <div className="glass-panel p-6 rounded-2xl flex-1 relative overflow-hidden group">
                   <div className="absolute inset-0 bg-gradient-to-br from-brand-green/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                   <div className="font-bold text-text-primary mb-6">Sales Trend</div>
                   <svg className="w-full h-full min-h-[200px]" preserveAspectRatio="none" viewBox="0 0 400 100">
                    <motion.path 
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 2, ease: "easeInOut", delay: 1 }}
                      d="M0,80 Q20,75 40,80 T80,70 T120,75 T160,50 T200,60 T240,40 T280,45 T320,20 T360,25 T400,10" 
                      fill="none" 
                      stroke="#34D399" 
                      strokeWidth="3" 
                      style={{ filter: "drop-shadow(0px 4px 6px rgba(16,185,129,0.3))" }}
                    />
                    <path d="M0,80 Q20,75 40,80 T80,70 T120,75 T160,50 T200,60 T240,40 T280,45 T320,20 T360,25 T400,10 L400,100 L0,100 Z" fill="url(#gradient)" opacity="0.1" />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#34D399" />
                        <stop offset="100%" stopColor="transparent" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Floating Glass Element */}
            <motion.div 
              animate={{ y: [-10, 10, -10] }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
              className="absolute -left-16 top-32 glass-panel p-4 rounded-2xl z-20 flex items-center gap-4 border-t-white/30 border-l-white/30"
            >
              <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400 border border-rose-500/30">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-text-primary text-sm">Alert: 5 items</div>
                <div className="text-xs text-slate-400">Expiring in 2 days</div>
              </div>
            </motion.div>
            
          </motion.div>
        </div>
      </div>
    </section>
  );
}
