"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { ScanLine, BrainCircuit, ShoppingCart, Store, Leaf, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: <ScanLine className="w-6 h-6 text-brand-green-light" />,
    title: "Smart Scanning & OCR",
    description: "Scan barcodes or invoices. AI extracts products, batch & expiry in seconds.",
    span: "col-span-1 md:col-span-2 lg:col-span-4"
  },
  {
    icon: <BrainCircuit className="w-6 h-6 text-brand-green-light" />,
    title: "AI Intelligence",
    description: "Predict demand and detect expiry risks automatically.",
    span: "col-span-1 md:col-span-1 lg:col-span-2"
  },
  {
    icon: <ShoppingCart className="w-6 h-6 text-brand-green-light" />,
    title: "Action Engine",
    description: "Discount, transfer, reorder or return - AI suggests the best action.",
    span: "col-span-1 md:col-span-1 lg:col-span-2"
  },
  {
    icon: <Store className="w-6 h-6 text-brand-green-light" />,
    title: "Multi-Store Management",
    description: "Manage multiple stores, transfer stock & compare performance across locations.",
    span: "col-span-1 md:col-span-2 lg:col-span-4"
  },
  {
    icon: <Leaf className="w-6 h-6 text-brand-green-light" />,
    title: "Sustainability Tracking",
    description: "Track waste prevented and resources saved.",
    span: "col-span-1 md:col-span-1 lg:col-span-3"
  },
  {
    icon: <MessageSquare className="w-6 h-6 text-brand-green-light" />,
    title: "WhatsApp Assistant",
    description: "Get daily updates, alerts and recommendations directly on WhatsApp.",
    span: "col-span-1 md:col-span-1 lg:col-span-3"
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
    <section className="py-24 relative overflow-hidden">
      {/* Background radial gradient for subtle lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-green/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="container mx-auto max-w-6xl px-6 relative z-10">
        <div className="text-center mb-20 max-w-3xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-slate-300 text-sm font-medium mb-6"
          >
            Capabilities
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-text-primary mb-6 tracking-tight"
          >
            Everything you need for a <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-green to-emerald-300">future-ready store</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 text-lg font-light"
          >
            Powerful features that simplify operations, eliminate waste, and maximize profit margins automatically.
          </motion.p>
        </div>

        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6"
        >
          {features.map((feat, idx) => (
            <motion.div 
              key={idx} 
              variants={item}
              className={cn(
                "glass-panel-hover p-8 rounded-3xl flex flex-col group relative overflow-hidden",
                feat.span,
                "border-t-white/10 border-l-white/10"
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-brand-green/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-6 border border-slate-200 group-hover:scale-110 group-hover:bg-brand-green/10 group-hover:border-brand-green/30 transition-all duration-300">
                {feat.icon}
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-3 tracking-tight">{feat.title}</h3>
              <p className="text-slate-400 leading-relaxed font-light">
                {feat.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
