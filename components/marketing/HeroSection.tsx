"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CheckCircle2, Calendar, Activity, Bell, ChevronRight, BarChart3, Sparkles, Check, Home, Package, ShoppingCart, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const features = [
  "Expiry Intelligence",
  "AI Recommendations",
  "Waste Prevention",
  "Multi-Store Management"
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
  const [activeTab, setActiveTab] = useState('Dashboard');

  return (
    <section className="relative pt-32 pb-32 overflow-hidden bg-white">
      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Content */}
          <motion.div 
            initial="initial"
            animate="animate"
            variants={stagger}
            className="flex flex-col gap-8 max-w-2xl"
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-green/10 text-brand-green font-semibold text-sm w-fit">
              <Sparkles className="w-4 h-4" />
              AI-Powered Retail Intelligence
            </motion.div>
            
            <motion.h1 variants={fadeUp} className="text-5xl lg:text-[4rem] font-bold tracking-tight text-text-primary leading-[1.1]">
              Run a Smarter, <br/> Greener Shop <br/>
              <span className="text-brand-green inline-flex items-center gap-3">
                with AI
                <Activity className="w-10 h-10 rotate-12" />
              </span>
            </motion.h1>
            
            <motion.p variants={fadeUp} className="text-xl text-text-secondary leading-relaxed max-w-lg font-medium">
              Track inventory, prevent expiry, get AI recommendations and reduce waste. Save money. Grow sustainably.
            </motion.p>
            
            <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
              {features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3 text-text-primary font-semibold">
                  <div className="w-5 h-5 rounded-full bg-brand-green flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </motion.div>
            
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link 
                href="/signup" 
                className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-brand-green text-white font-bold hover:bg-brand-green-dark transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95"
              >
                <span className="relative flex items-center gap-2">Start Free Trial <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></span>
              </Link>
              <Link 
                href="/demo" 
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-slate-200 bg-white text-text-primary font-bold hover:border-slate-300 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
              >
                Book a Demo <Calendar className="w-5 h-5 text-slate-400" />
              </Link>
            </motion.div>

            <motion.div variants={fadeUp} className="flex items-center gap-6 text-sm text-text-secondary font-medium">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-brand-green" /> No credit card required
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-brand-green" /> Setup in 2 minutes
              </div>
            </motion.div>
          </motion.div>
          
          {/* Right Content - Dribbble Style Finance Dashboard Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40, rotateY: -10 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="relative hidden lg:block h-[700px] w-full perspective-[2000px]"
          >
            <div className="absolute top-0 right-[-10%] w-[110%] h-[90%] bg-white rounded-3xl flex overflow-hidden shadow-2xl border border-slate-200">
              
              {/* Sidebar (Dark Mode) */}
              <div className="w-[240px] bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-6 shrink-0 z-10 relative">
                <div className="flex items-center gap-3 font-bold text-lg mb-4 text-white">
                  <div className="w-8 h-8 rounded-lg bg-brand-green flex items-center justify-center shadow-glow">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  Green Quant AI
                </div>
                
                <div className="flex flex-col gap-2">
                  {[
                    {name: 'Dashboard', icon: Home, href: '/dashboard'},
                    {name: 'Inventory', icon: Package, href: '/dashboard/inventory'}, 
                    {name: 'Sales', icon: ShoppingCart, href: '/dashboard/sales'}, 
                    {name: 'Settings', icon: Settings, href: '/settings'}
                  ].map((item, idx) => (
                    <Link 
                      href={item.href}
                      key={idx} 
                      onMouseEnter={() => setActiveTab(item.name)}
                      className={cn(
                        "px-4 py-3 rounded-xl font-semibold flex items-center gap-3 transition-colors cursor-pointer",
                        activeTab === item.name 
                          ? "bg-brand-green/20 text-brand-green" 
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <item.icon className="w-4 h-4" /> {item.name}
                    </Link>
                  ))}
                </div>
              </div>
              
              {/* Main Area (White Mode) */}
              <div className="flex-1 p-8 flex flex-col gap-6 overflow-hidden bg-slate-50 relative">
                {/* Header */}
                <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100 transition-all hover:shadow-md cursor-pointer">
                  <h2 className="text-xl font-bold text-slate-800">{activeTab} Overview</h2>
                  <div className="flex gap-4">
                    <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold flex items-center gap-2 text-slate-600 hover:bg-slate-100 transition-colors">
                      May 28, 2026 <ChevronRight className="w-4 h-4 rotate-90" />
                    </div>
                  </div>
                </div>
                
                {/* Stats Bento Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { title: "Total Revenue", value: "₹4,82,340", trend: "+12.5% vs last month", isPositive: true },
                    { title: "Expiry Risk Value", value: "₹18,420", trend: "-5.2% vs last month", isPositive: true },
                  ].map((stat, i) => (
                    <Link href={i === 0 ? "/dashboard/sales" : "/dashboard/inventory"} key={i} className="bg-white p-5 rounded-2xl flex flex-col gap-2 relative overflow-hidden group shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all cursor-pointer hover:-translate-y-0.5">
                      <div className="text-sm text-slate-500 font-semibold">{stat.title}</div>
                      <div className="text-2xl xl:text-3xl font-extrabold text-slate-900 tracking-tight truncate">{stat.value}</div>
                      <div className={cn("text-xs font-bold mt-2", stat.isPositive ? "text-brand-green" : "text-rose-500")}>
                        {stat.trend}
                      </div>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight className="w-5 h-5 text-slate-300" />
                      </div>
                    </Link>
                  ))}
                </div>
                
                {/* Chart Area */}
                <Link href="/dashboard" className="block bg-white p-6 rounded-2xl flex-1 relative overflow-hidden shadow-sm border border-slate-100 group hover:shadow-md transition-all cursor-pointer">
                   <div className="font-bold text-slate-800 mb-6 text-lg group-hover:text-brand-green transition-colors">Revenue & Waste Saved</div>
                   <svg className="w-full h-full min-h-[180px]" preserveAspectRatio="none" viewBox="0 0 400 100">
                    <motion.path 
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 2, ease: "easeInOut", delay: 1 }}
                      d="M0,90 L20,85 L40,60 L60,80 L80,30 L100,75 L120,40 L160,85 L200,10 L220,80 L260,10 L280,85 L320,10 L340,75 L360,20 L400,10" 
                      fill="none" 
                      stroke="#10b981" 
                      strokeWidth="2.5" 
                      strokeLinejoin="round"
                    />
                    <path d="M0,90 L20,85 L40,60 L60,80 L80,30 L100,75 L120,40 L160,85 L200,10 L220,80 L260,10 L280,85 L320,10 L340,75 L360,20 L400,10 L400,100 L0,100 Z" fill="url(#gradient-hero)" opacity="0.1" />
                    <defs>
                      <linearGradient id="gradient-hero" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="transparent" />
                      </linearGradient>
                    </defs>
                  </svg>
                </Link>
              </div>
            </div>
            
            {/* Floating Element */}
            <Link href="/dashboard/inventory">
              <motion.div 
                animate={{ y: [-10, 10, -10] }}
                transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                className="absolute -left-12 top-24 bg-white p-4 rounded-2xl z-20 flex items-center gap-4 shadow-xl border border-slate-100 cursor-pointer hover:scale-105 transition-transform"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-800 text-sm">Action Needed</div>
                  <div className="text-xs text-slate-500 font-medium">12 items expiring soon</div>
                </div>
              </motion.div>
            </Link>
            
          </motion.div>
        </div>
      </div>
    </section>
  );
}

