"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Store, BarChart3, ShieldCheck, BrainCircuit, Droplet, Sparkles } from 'lucide-react';

const stats = [
  {
    icon: <Store className="w-6 h-6 text-brand-green" />,
    value: "Operations",
    label: "Physical Retail OS"
  },
  {
    icon: <BarChart3 className="w-6 h-6 text-brand-green" />,
    value: "Zero-LLM",
    label: "Math Engine Grounding"
  },
  {
    icon: <ShieldCheck className="w-6 h-6 text-brand-green" />,
    value: "FIFO & Expiry",
    label: "Batch Waste Prevention"
  },
  {
    icon: <BrainCircuit className="w-6 h-6 text-brand-green" />,
    value: "AI Action Center",
    label: "Explainable Decisions"
  },
  {
    icon: <Droplet className="w-6 h-6 text-brand-green" />,
    value: "Role Isolation",
    label: "Owner / Worker / Biller"
  }
];

export function StatsBar() {
  return (
    <section className="relative z-20 px-6 mt-[-40px] mb-24">
      <div className="container mx-auto max-w-7xl">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white rounded-3xl p-8 flex flex-col items-center gap-8 shadow-xl border border-slate-100 relative overflow-hidden"
        >
          {/* Subtle background */}
          <div className="absolute inset-0 bg-gradient-to-b from-brand-green/5 to-transparent opacity-50" />
          
          <div className="relative z-10 text-center flex flex-col items-center gap-2">
             <div className="flex items-center gap-2 text-text-secondary font-medium">
               Built specifically for intelligent physical retail operations <Sparkles className="w-4 h-4 text-brand-green" />
             </div>
          </div>

          <div className="w-full flex flex-wrap justify-around items-center gap-6 relative z-10">
            {stats.map((stat, idx) => (
              <div key={idx} className="flex flex-col items-center gap-3 group">
                <div className="w-14 h-14 rounded-full bg-brand-green/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  {stat.icon}
                </div>
                <div className="flex flex-col items-center text-center">
                  <span className="text-xl font-extrabold text-slate-900 tracking-tight">{stat.value}</span>
                  <span className="text-xs text-slate-500 font-semibold mt-1">{stat.label}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
