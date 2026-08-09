"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Store, BarChart3, TrendingUp, Cpu, Activity } from 'lucide-react';

const stats = [
  {
    icon: <Store className="w-5 h-5 text-brand-green-light" />,
    value: "2,000+",
    label: "Happy Stores"
  },
  {
    icon: <BarChart3 className="w-5 h-5 text-brand-green-light" />,
    value: "15Cr+",
    label: "Inventory Tracked"
  },
  {
    icon: <TrendingUp className="w-5 h-5 text-brand-green-light" />,
    value: "₹120Cr+",
    label: "Waste Prevented"
  },
  {
    icon: <Cpu className="w-5 h-5 text-brand-green-light" />,
    value: "8 Modules",
    label: "AI Agents"
  },
  {
    icon: <Activity className="w-5 h-5 text-brand-green-light" />,
    value: "99.9%",
    label: "Uptime"
  }
];

export function StatsBar() {
  return (
    <section className="relative z-20 px-6 mt-[-40px] mb-24">
      <div className="container mx-auto max-w-6xl">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="glass-panel rounded-3xl p-6 flex flex-wrap justify-between items-center gap-6 border-t-white/20 relative overflow-hidden"
        >
          {/* Subtle glow background inside the bar */}
          <div className="absolute inset-0 bg-gradient-to-r from-brand-green/5 via-transparent to-brand-green/5 opacity-50" />
          
          {stats.map((stat, idx) => (
            <div key={idx} className="flex items-center gap-4 relative z-10 group">
              <div className="w-12 h-12 rounded-2xl bg-brand-green/10 flex items-center justify-center border border-brand-green/20 group-hover:scale-110 transition-transform duration-300">
                {stat.icon}
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-text-primary tracking-tight">{stat.value}</span>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{stat.label}</span>
              </div>
              
              {/* Divider for all but last */}
              {idx !== stats.length - 1 && (
                <div className="hidden lg:block absolute -right-8 top-1/2 -translate-y-1/2 w-px h-10 bg-slate-200" />
              )}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
