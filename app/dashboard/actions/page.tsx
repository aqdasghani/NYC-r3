"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Tag, RefreshCw, ShoppingCart, CheckCircle2, XCircle } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

const aiPlans = [
  {
    id: 1,
    type: 'discount',
    title: 'Discount Amul Butter 500g',
    reason: 'Sales velocity is 3.2/day. Expiry in 6 days. Expected loss if no action: ₹5,850.',
    recommendation: 'Discount 15% to clear 32 units.',
    icon: Tag,
    color: 'text-brand-orange',
    bgColor: 'bg-brand-orange/10',
    borderColor: 'border-brand-orange/20',
  },
  {
    id: 2,
    type: 'transfer',
    title: 'Transfer Aashirvaad Atta',
    reason: 'Store A has 15 units of dead stock. Store B has a 42% demand spike for this item.',
    recommendation: 'Transfer 10 units to Store B.',
    icon: RefreshCw,
    color: 'text-brand-blue',
    bgColor: 'bg-brand-blue/10',
    borderColor: 'border-brand-blue/20',
  },
  {
    id: 3,
    type: 'reorder',
    title: 'Reorder Tropicana Orange',
    reason: 'Sales increased 37% this week. Current stock (45) will run out in 5 days.',
    recommendation: 'Reorder 120 units from Supplier X.',
    icon: ShoppingCart,
    color: 'text-brand-green',
    bgColor: 'bg-brand-green/10',
    borderColor: 'border-brand-green/20',
  },
];

export default function ActionsPage() {
  const [plans, setPlans] = useState(aiPlans);

  const executePlan = (id: number) => {
    setPlans(plans.filter(p => p.id !== id));
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold tracking-tight mb-2">AI Action Engine</h1>
        <p className="text-text-secondary">Review and execute AI-generated strategies to prevent waste and maximize profit.</p>
      </motion.div>

      <div className="grid grid-cols-1 gap-6">
        <AnimatePresence>
          {plans.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-panel p-12 text-center flex flex-col items-center justify-center"
            >
              <div className="w-16 h-16 bg-brand-green/10 text-brand-green rounded-full flex items-center justify-center mb-4 border border-brand-green/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-2">All Caught Up!</h3>
              <p className="text-text-secondary max-w-md">You have reviewed all pending AI actions. GreenShop is continuously monitoring your inventory for new optimizations.</p>
            </motion.div>
          )}

          {plans.map((plan) => (
            <motion.div
              key={plan.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, x: -50 }}
              className="glass-panel p-6 relative overflow-hidden group"
            >
              <div className={`absolute top-0 left-0 w-1 h-full ${plan.bgColor} ${plan.color.replace('text', 'bg')}`} />
              
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${plan.bgColor} ${plan.borderColor} border`}>
                      <plan.icon className={`w-5 h-5 ${plan.color}`} />
                    </div>
                    <h3 className="text-xl font-semibold text-text-primary">{plan.title}</h3>
                  </div>
                  
                  <div className="pl-13">
                    <p className="text-text-secondary text-sm mb-3">{plan.reason}</p>
                    <div className="inline-flex items-center gap-2 bg-[#1A1A1A] px-3 py-2 rounded-lg border border-[#222]">
                      <Zap className="w-4 h-4 text-brand-green" />
                      <span className="text-sm font-medium text-text-primary">AI Plan: {plan.recommendation}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0 pl-13 md:pl-0">
                  <button 
                    onClick={() => executePlan(plan.id)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-brand-green text-black px-6 py-2.5 rounded-lg font-medium hover:bg-brand-green/90 transition-colors shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                  >
                    Execute Plan
                  </button>
                  <button 
                    onClick={() => executePlan(plan.id)}
                    className="p-2.5 rounded-lg border border-border-default text-text-secondary hover:text-text-primary hover:bg-[#222222] transition-colors"
                    title="Dismiss"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
