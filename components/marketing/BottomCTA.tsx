"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

export function BottomCTA() {
  return (
    <section className="py-32 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-brand-green-dark/20 pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[10%] w-[80%] h-[50%] bg-brand-green/20 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="container mx-auto px-6 max-w-4xl relative z-10 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="glass-panel p-12 md:p-20 rounded-[3rem] border-t-white/20 relative overflow-hidden"
        >
          {/* Subtle noise texture or lines could go here */}
          
          <div className="w-16 h-16 rounded-full bg-brand-green/20 text-brand-green-light flex items-center justify-center mx-auto mb-8 border border-brand-green/30">
            <Sparkles className="w-8 h-8" />
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-text-primary mb-6">
            Ready to transform your store?
          </h2>
          
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto font-light">
            Join thousands of smart retailers who are saving more and wasting less with GreenShop AI.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/trial" 
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-brand-green text-black font-bold hover:bg-brand-green-light transition-all shadow-glow hover:translate-y-0.5 active:scale-95"
            >
              Start Free Trial <ArrowRight className="w-5 h-5" />
            </Link>
            <Link 
              href="/demo" 
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-bg-surface border border-border-default text-text-primary font-semibold hover:bg-slate-100 shadow-sm transition-all active:scale-95"
            >
              Book a Demo
            </Link>
          </div>
          
          <div className="flex items-center justify-center gap-6 mt-8 text-sm text-slate-400 font-medium">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-green-light" />
              No credit card required
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-green-light" />
              Personalized demo
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
