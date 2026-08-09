"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';

export function BottomCTA() {
  return (
    <section className="py-24 relative overflow-hidden bg-white">
      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-[#0B2A1E] rounded-[2.5rem] p-12 md:p-20 relative overflow-hidden flex flex-col md:flex-row items-center justify-between shadow-2xl"
        >
          {/* Background graphical elements / plant representation */}
          <div className="absolute top-0 right-0 w-full h-full pointer-events-none overflow-hidden rounded-[2.5rem]">
             <div className="absolute top-[-50%] right-[-20%] w-[80%] h-[150%] bg-brand-green/20 blur-[120px] rounded-full rotate-45" />
             <div className="absolute bottom-[-50%] left-[-20%] w-[60%] h-[120%] bg-emerald-500/10 blur-[100px] rounded-full rotate-45" />
          </div>
          
          <div className="relative z-10 max-w-xl md:mr-12 mb-10 md:mb-0">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Ready to transform your store?
            </h2>
            <p className="text-lg text-emerald-50/70 mb-10 font-medium leading-relaxed">
              Join thousands of smart retailers who are saving more and wasting less with GreenShop AI.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="/signup" 
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-brand-green text-white font-bold hover:bg-brand-green-dark transition-all shadow-lg hover:-translate-y-0.5 active:scale-95"
              >
                Start Free Trial <ArrowRight className="w-5 h-5" />
              </Link>
              <Link 
                href="/demo" 
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-white/20 text-white font-bold hover:bg-white/10 transition-all active:scale-95"
              >
                Book a Demo
              </Link>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 mt-8 text-sm text-emerald-100/60 font-medium">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-brand-green/20 flex items-center justify-center">
                   <Check className="w-2.5 h-2.5 text-brand-green" />
                </div>
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-4 h-4 rounded-full bg-brand-green/20 flex items-center justify-center">
                   <Check className="w-2.5 h-2.5 text-brand-green" />
                </div>
                Personalized demo for your business
              </div>
            </div>
          </div>
          
          {/* Abstract graphic representing the plant/dashboard on the right */}
          <div className="relative z-10 hidden md:block w-full max-w-sm">
             <div className="w-full aspect-[4/3] rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden group">
               <div className="absolute inset-0 bg-gradient-to-br from-brand-green/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
               <div className="w-12 h-12 rounded-full bg-brand-green/20 mb-4" />
               <div className="w-3/4 h-4 rounded bg-white/20 mb-2" />
               <div className="w-1/2 h-4 rounded bg-white/10 mb-8" />
               
               <div className="w-full h-24 rounded-xl bg-gradient-to-t from-brand-green/30 to-brand-green/5" />
             </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
