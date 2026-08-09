"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Smartphone, TrendingUp, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export function AppMockupSection() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto max-w-6xl px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left - Mobile Mockup */}
          <motion.div 
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex justify-center lg:justify-end"
          >
            {/* The Phone Frame */}
            <div className="w-[320px] h-[650px] bg-black rounded-[3rem] border-[8px] border-slate-800 p-4 shadow-float relative overflow-hidden ring-1 ring-white/10">
              {/* iPhone Notch Area */}
              <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-20">
                <div className="w-32 h-6 bg-slate-800 rounded-b-3xl"></div>
              </div>
              
              {/* Phone Screen Content */}
              <div className="w-full h-full bg-bg-app rounded-[2rem] overflow-hidden flex flex-col relative">
                {/* Header */}
                <div className="pt-10 pb-6 px-6 bg-gradient-to-b from-brand-green/20 to-transparent">
                  <div className="text-text-primary text-xl font-bold mb-1">Good Morning, Rahul 👋</div>
                  <div className="text-brand-green-light text-sm">Here's your AI Briefing</div>
                </div>
                
                {/* Cards */}
                <div className="flex-1 px-4 flex flex-col gap-4 overflow-y-auto pb-6">
                  {/* Priority Alert */}
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-text-primary font-bold text-sm">Priority Actions</div>
                        <div className="text-rose-400 text-xs">5 items need attention</div>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                  
                  {/* AI Recommendation */}
                  <div className="bg-bg-surface border border-border-default shadow-sm rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-brand-green/20 blur-2xl rounded-full" />
                    <div className="text-brand-green-light text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
                      AI Recommendation
                    </div>
                    <div className="text-text-primary text-sm">Discount <strong>Amul Butter 500g</strong> by 15% for faster sell-through.</div>
                    <div className="flex justify-between items-center mt-2">
                      <div>
                        <div className="text-slate-400 text-xs">Potential Recovery</div>
                        <div className="text-brand-green-light font-bold">₹2,840</div>
                      </div>
                      <button className="bg-brand-green/20 text-brand-green-light px-4 py-2 rounded-lg text-xs font-bold border border-brand-green/30">Apply</button>
                    </div>
                  </div>
                  
                  {/* Waste Prevented */}
                  <div className="bg-bg-surface border border-border-default shadow-sm rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-brand-green/20 border border-brand-green/30 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-6 h-6 text-brand-green-light" />
                    </div>
                    <div>
                      <div className="text-slate-400 text-xs">Waste Prevented Today</div>
                      <div className="text-text-primary font-bold text-lg">₹1,240</div>
                      <div className="text-brand-green-light text-[10px]">Great job! 🌱</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Decorative blurs */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[500px] bg-brand-green/20 blur-[100px] -z-10 rounded-full" />
          </motion.div>
          
          {/* Right - Text Content */}
          <motion.div 
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="flex flex-col gap-6"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-text-primary leading-tight">
              Smarter decisions. <br/>
              Stronger business. <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-green to-emerald-300">Better planet. 🌱</span>
            </h2>
            
            <p className="text-slate-400 text-lg font-light">
              GreenShop AI turns your raw data into immediate, actionable insights that save money and reduce waste, right from your pocket.
            </p>
            
            <ul className="flex flex-col gap-4 mt-4">
              {[
                "Prevent expiry & reduce waste autonomously",
                "Improve cash flow & store profitability",
                "Make data-backed business decisions",
                "Build a sustainable & responsible retail business"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-300">
                  <div className="w-5 h-5 rounded-full bg-brand-green/20 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-brand-green-light" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
            
            <div className="mt-8 flex items-center gap-6">
               <Link 
                href="/trial" 
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-black font-bold hover:bg-slate-200 transition-all active:scale-95"
              >
                Start Free Trial <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="#demo" className="text-brand-green-light font-medium hover:text-text-primary transition-colors flex items-center gap-2 group">
                <div className="w-10 h-10 rounded-full bg-brand-green/10 flex items-center justify-center border border-brand-green/30 group-hover:bg-brand-green/20 transition-colors">
                  <Smartphone className="w-4 h-4" />
                </div>
                See How It Works
              </Link>
            </div>
          </motion.div>
          
        </div>
      </div>
    </section>
  );
}
