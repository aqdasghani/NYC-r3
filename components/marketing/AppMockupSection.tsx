"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Smartphone, TrendingUp, AlertTriangle, Check, Sparkles, Sprout, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export function AppMockupSection() {
  return (
    <section className="py-24 relative overflow-hidden bg-white">
      <div className="container mx-auto max-w-7xl px-6 relative z-10">
        <div className="grid lg:grid-cols-3 gap-12 items-center">
          
          {/* Left - Text Content */}
          <motion.div 
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-6 lg:col-span-1"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 leading-[1.1] tracking-tight">
              Better decisions. <br/>
              Stronger business. <br/>
              <span className="text-brand-green flex items-center gap-2 mt-2">
                Better planet. <Sprout className="w-10 h-10" />
              </span>
            </h2>
            
            <p className="text-slate-500 text-lg font-medium mt-2">
              GreenShop AI turns your data into actions that save money and reduce waste.
            </p>
            
            <ul className="flex flex-col gap-4 mt-4">
              {[
                "Prevent expiry & reduce waste autonomously",
                "Improve cash flow & store profitability",
                "Make data-backed business decisions",
                "Build a sustainable & responsible retail business"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                  <div className="w-5 h-5 rounded-full bg-brand-green flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
          
          {/* Middle - Mobile Mockup */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="relative flex justify-center lg:col-span-1"
          >
            {/* The Phone Frame */}
            <div className="w-[300px] h-[600px] bg-slate-900 rounded-[3rem] border-[8px] border-slate-900 p-2 shadow-2xl relative overflow-hidden ring-1 ring-slate-200">
              {/* iPhone Notch Area */}
              <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-20">
                <div className="w-28 h-6 bg-slate-900 rounded-b-2xl"></div>
              </div>
              
              {/* Phone Screen Content */}
              <div className="w-full h-full bg-slate-50 rounded-[2.5rem] overflow-hidden flex flex-col relative">
                {/* Header */}
                <div className="pt-12 pb-6 px-5 bg-brand-green">
                  <div className="text-white text-xl font-bold mb-1">GreenShop AI</div>
                  <div className="text-brand-green-light text-sm font-medium">Your Daily Briefing</div>
                </div>
                
                {/* Cards */}
                <div className="flex-1 px-4 py-4 flex flex-col gap-4 overflow-y-auto pb-6">
                  {/* WhatsApp style message */}
                  <div className="bg-white border border-slate-100 shadow-sm rounded-2xl rounded-tl-sm p-4 flex flex-col gap-2 relative">
                    <div className="text-slate-800 text-sm font-medium">
                      Hey Rahul! You have 12 items expiring in the next 3 days.
                    </div>
                    <button className="bg-brand-green text-white px-4 py-2 rounded-lg text-xs font-bold mt-2 w-fit">Review Items</button>
                  </div>
                  
                  {/* Stats snippet */}
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                      <div className="text-xs text-slate-500 font-semibold">Today's Sales</div>
                      <div className="font-bold text-slate-900 mt-1">₹42,150</div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                      <div className="text-xs text-slate-500 font-semibold">Waste Saved</div>
                      <div className="font-bold text-brand-green mt-1">₹1,240</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Decorative blurs */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] bg-brand-green/20 blur-[80px] -z-10 rounded-full" />
          </motion.div>

          {/* Right - Stacked Cards */}
          <motion.div 
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
            className="flex flex-col gap-6 lg:col-span-1"
          >
            {/* Card 1: AI Recommendation */}
            <div className="bg-white border border-slate-100 shadow-lg rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-brand-green/10 blur-2xl rounded-full" />
              <div className="text-brand-green text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 mb-3">
                <Sparkles className="w-3.5 h-3.5" /> AI Recommendation
              </div>
              <div className="text-slate-800 text-sm font-semibold mb-4 leading-relaxed">
                Discount <span className="font-bold">Amul Butter 500g</span> by 15% for faster sell-through before expiry.
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-slate-500 text-xs font-semibold">Potential Recovery</div>
                  <div className="text-brand-green font-extrabold text-lg">₹2,840</div>
                </div>
                <button className="bg-brand-green/10 text-brand-green hover:bg-brand-green hover:text-white transition-colors px-4 py-2 rounded-lg text-xs font-bold">Apply Now</button>
              </div>
            </div>

            {/* Card 2: Sales Forecast */}
            <div className="bg-white border border-slate-100 shadow-lg rounded-2xl p-6 relative overflow-hidden group">
              <div className="text-blue-500 text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 mb-3">
                <BarChart3 className="w-3.5 h-3.5" /> Sales Forecast
              </div>
              <div className="text-slate-800 text-sm font-semibold leading-relaxed">
                High demand expected for <span className="font-bold">Cold Beverages</span> next week due to rising temperatures.
              </div>
            </div>

            {/* Card 3: Impact Card (Dark) */}
            <div className="bg-slate-900 rounded-2xl p-6 relative overflow-hidden shadow-xl mt-2 border border-slate-800">
               {/* Faux soil/plant background gradient */}
               <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-brand-green/40 via-slate-900 to-slate-900 opacity-80" />
               <div className="relative z-10">
                 <div className="text-white/70 text-xs font-bold uppercase tracking-wider mb-2">Your Impact This Month</div>
                 <div className="grid grid-cols-2 gap-4 mt-6">
                    <div>
                      <div className="text-3xl font-extrabold text-white">₹7,240</div>
                      <div className="text-brand-green-light text-xs font-medium mt-1">Waste Prevented</div>
                    </div>
                    <div>
                       <div className="text-3xl font-extrabold text-white">128<span className="text-lg">kg</span></div>
                       <div className="text-brand-green-light text-xs font-medium mt-1">CO₂ Reduced</div>
                    </div>
                 </div>
               </div>
            </div>

          </motion.div>
          
        </div>
      </div>
    </section>
  );
}
