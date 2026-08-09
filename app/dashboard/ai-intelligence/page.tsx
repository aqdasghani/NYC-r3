"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BrainCircuit, 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  BarChart3, 
  Zap,
  ArrowRight,
  Bot
} from 'lucide-react';

const insights = [
  {
    id: 1,
    type: "demand",
    title: "High Demand Forecast",
    description: "Based on upcoming weather patterns and historical data, demand for 'Organic Cotton T-Shirts' is expected to increase by 45% next week.",
    action: "Order 200 units",
    impact: "High Impact",
    icon: TrendingUp,
    color: "text-blue-500",
    bg: "bg-blue-50",
    border: "border-blue-200"
  },
  {
    id: 2,
    type: "anomaly",
    title: "Unusual Sales Drop Detected",
    description: "Sales for 'Bamboo Toothbrushes' have dropped 30% below the moving average over the past 3 days in the downtown region.",
    action: "Review Pricing & Display",
    impact: "Critical",
    icon: AlertTriangle,
    color: "text-orange-500",
    bg: "bg-orange-50",
    border: "border-orange-200"
  },
  {
    id: 3,
    type: "optimization",
    title: "Pricing Optimization Available",
    description: "Competitor analysis suggests you can safely increase the price of 'Reusable Water Bottles' by $1.50 without affecting volume.",
    action: "Apply New Price",
    impact: "Medium Impact",
    icon: BarChart3,
    color: "text-green-500",
    bg: "bg-green-50",
    border: "border-green-200"
  }
];

export default function AIIntelligencePage() {
  const [activeTab, setActiveTab] = useState('all');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">AI Intelligence Hub</h1>
            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Powered by Green Quant
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">Actionable insights and predictive analytics for your business.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
            <Bot className="w-4 h-4" /> Ask AI Assistant
          </button>
        </div>
      </div>

      {/* AI Assistant Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-xl p-6 text-white shadow-lg relative overflow-hidden"
      >
        <div className="absolute -right-4 -top-4 opacity-10">
          <BrainCircuit className="w-48 h-48" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
            <Bot className="w-8 h-8 text-purple-300" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1">Morning Analysis Complete</h3>
            <p className="text-indigo-200 text-sm max-w-2xl leading-relaxed">
              I've analyzed yesterday's sales data, current inventory levels, and local market trends. 
              You have 3 new actionable insights today that could improve your margin by approximately 4.2%.
            </p>
          </div>
          <button className="shrink-0 px-5 py-2.5 bg-white text-indigo-900 rounded-lg text-sm font-bold shadow-[0_0_15px_rgba(255,255,255,0.3)] hover:bg-indigo-50 transition-colors self-start md:self-center">
            Review All Actions
          </button>
        </div>
      </motion.div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-px">
        {[
          { id: 'all', label: 'All Insights' },
          { id: 'demand', label: 'Demand Forecasting' },
          { id: 'anomaly', label: 'Anomaly Detection' },
          { id: 'optimization', label: 'Optimization' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id 
                ? 'border-[#0FA958] text-[#0FA958]' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Insights List */}
      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence>
          {insights
            .filter(insight => activeTab === 'all' || insight.type === activeTab)
            .map((insight, idx) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, delay: idx * 0.05 }}
              key={insight.id}
              className={`bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden ${insight.border}`}
            >
              <div className={`absolute top-0 left-0 w-1.5 h-full ${insight.bg}`}></div>
              <div className="flex flex-col sm:flex-row gap-5">
                <div className={`w-12 h-12 rounded-full ${insight.bg} flex items-center justify-center shrink-0`}>
                  <insight.icon className={`w-6 h-6 ${insight.color}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-base font-semibold text-slate-900">{insight.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${insight.impact === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                          {insight.impact}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">Generated 2 hrs ago</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-slate-600 text-sm mt-3 leading-relaxed max-w-3xl">
                    {insight.description}
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <button className="px-4 py-1.5 bg-[#0FA958] hover:bg-[#0c8f49] text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
                      <Zap className="w-4 h-4" /> {insight.action}
                    </button>
                    <button className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium rounded-lg transition-colors">
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {insights.filter(insight => activeTab === 'all' || insight.type === activeTab).length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-slate-900 font-medium mb-1">No insights in this category</h3>
            <p className="text-slate-500 text-sm">Our AI is constantly analyzing your data. Check back later.</p>
          </div>
        )}
      </div>
    </div>
  );
}
