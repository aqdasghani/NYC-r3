"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { ScanLine, Box, Zap, Store, Leaf, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: <ScanLine className="w-6 h-6 text-brand-green" />,
    title: "Smart Scanning & OCR",
    description: "Scan barcodes or invoices. AI extracts products, batch & expiry in seconds.",
  },
  {
    icon: <Box className="w-6 h-6 text-brand-green" />,
    title: "AI Inventory Intelligence",
    description: "Predict demand and detect expiry risks automatically before they happen.",
  },
  {
    icon: <Zap className="w-6 h-6 text-brand-green" />,
    title: "AI Action Engine",
    description: "Discount, transfer, reorder or return - AI suggests the best action.",
  },
  {
    icon: <Store className="w-6 h-6 text-brand-green" />,
    title: "Multi-Store Management",
    description: "Manage multiple stores, transfer stock & compare performance across locations.",
  },
  {
    icon: <Leaf className="w-6 h-6 text-brand-green" />,
    title: "Sustainability Tracking",
    description: "Track waste prevented, CO2 reduced, and overall resources saved.",
  },
  {
    icon: <MessageSquare className="w-6 h-6 text-brand-green" />,
    title: "WhatsApp Assistant",
    description: "Get daily updates, alerts and recommendations directly on WhatsApp.",
  }
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } }
};

export function FeaturesGrid() {
  return (
    <section className="py-24 relative overflow-hidden bg-white" id="features">
      
      <div className="container mx-auto max-w-7xl px-6 relative z-10">
        <div className="text-center mb-20 max-w-3xl mx-auto">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight"
          >
            Everything you need to run a <span className="text-brand-green">future-ready store</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-text-secondary text-lg font-medium"
          >
            Powerful features that simplify operations and maximize profit.
          </motion.p>
        </div>

        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feat, idx) => (
            <motion.div 
              key={idx} 
              variants={item}
              className="bg-white p-8 rounded-3xl flex flex-col group relative overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-brand-green/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="w-14 h-14 rounded-2xl bg-brand-green/10 flex items-center justify-center mb-6 border border-brand-green/20 group-hover:scale-110 group-hover:bg-brand-green/20 transition-all duration-300">
                {feat.icon}
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 mb-3 tracking-tight relative z-10">{feat.title}</h3>
              <p className="text-slate-500 leading-relaxed font-medium relative z-10">
                {feat.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
