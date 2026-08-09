"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Leaf, 
  Wind, 
  Droplets, 
  Recycle, 
  TrendingUp,
  Download,
  Share2
} from 'lucide-react';

const sustainMetrics = [
  { title: "Carbon Offset", value: "24.5", unit: "tons", change: "+2.1", icon: Wind, color: "text-emerald-500", bg: "bg-emerald-50" },
  { title: "Water Saved", value: "128", unit: "kL", change: "+14", icon: Droplets, color: "text-blue-500", bg: "bg-blue-50" },
  { title: "Waste Diverted", value: "85", unit: "%", change: "+5%", icon: Recycle, color: "text-amber-500", bg: "bg-amber-50" },
  { title: "Green Score", value: "84", unit: "/100", change: "+7", icon: Leaf, color: "text-[#0FA958]", bg: "bg-[#0FA958]/10" }
];

export default function SustainabilityPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sustainability Impact</h1>
          <p className="text-slate-500 text-sm mt-1">Track your store's environmental footprint and green initiatives.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
            <Share2 className="w-4 h-4" /> Share Report
          </button>
          <button className="px-4 py-2 bg-[#0FA958] text-white rounded-lg text-sm font-medium hover:bg-[#0c8f49] transition-colors shadow-sm shadow-green-500/20 flex items-center gap-2">
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-r from-[#063120] to-[#0A412A] rounded-2xl p-8 text-white shadow-lg overflow-hidden relative"
      >
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <Leaf className="w-64 h-64 text-white transform rotate-12" />
        </div>
        
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-green-300 mb-4 backdrop-blur-sm border border-white/10">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Live Tracking Active
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">You're making a difference.</h2>
          <p className="text-green-100 text-lg mb-8 opacity-90 leading-relaxed">
            Since joining Green Quant AI, your operations have become 24% more eco-friendly. 
            Your sustainable sourcing and optimized logistics are actively reducing your carbon footprint.
          </p>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 flex-1 min-w-[200px]">
              <div className="text-green-200 text-sm font-medium mb-1">Current Goal: Net Zero</div>
              <div className="w-full bg-black/20 rounded-full h-2.5 mt-3">
                <div className="bg-[#0FA958] h-2.5 rounded-full shadow-[0_0_10px_rgba(15,169,88,0.8)]" style={{ width: '65%' }}></div>
              </div>
              <div className="flex justify-between text-xs text-green-100 mt-2">
                <span>65% Achieved</span>
                <span>Target: 2027</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {sustainMetrics.map((metric, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + (idx * 0.1) }}
            key={idx} 
            className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">{metric.title}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <h3 className="text-2xl font-bold text-slate-900">{metric.value}</h3>
                  <span className="text-sm text-slate-500 font-medium">{metric.unit}</span>
                </div>
              </div>
              <div className={`w-10 h-10 rounded-lg ${metric.bg} flex items-center justify-center transition-transform group-hover:scale-110`}>
                <metric.icon className={`w-5 h-5 ${metric.color}`} />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-600 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> {metric.change}
              </span>
              <span className="text-xs text-slate-400">vs last month</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Emissions Reduction Trend</h3>
          <div className="h-64 flex items-end justify-between gap-2 pb-6 border-b border-slate-100 relative">
            {/* Simple Bar Chart Mockup */}
            {[45, 52, 38, 65, 48, 75, 84].map((height, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="w-full relative bg-slate-50 rounded-t-sm h-full flex items-end">
                  <div 
                    className="w-full bg-[#0FA958]/20 group-hover:bg-[#0FA958] rounded-t-sm transition-all duration-300 relative"
                    style={{ height: `${height}%` }}
                  >
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded shadow whitespace-nowrap transition-opacity">
                      {height} units
                    </div>
                  </div>
                </div>
                <span className="text-xs text-slate-400">Month {i+1}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#0FA958]"></span>
              <span className="text-slate-600">Actual Reduction</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#0FA958]/20 border border-[#0FA958] border-dashed"></span>
              <span className="text-slate-600">Target</span>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-xl border border-slate-100 shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold text-slate-900 mb-6">AI Recommendations</h3>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100">
              <div className="flex gap-3">
                <div className="mt-0.5"><Leaf className="w-5 h-5 text-emerald-600" /></div>
                <div>
                  <h4 className="text-sm font-semibold text-emerald-900">Switch Supplier for Packaging</h4>
                  <p className="text-xs text-emerald-700 mt-1">Sourcing from "EcoPack Inc" reduces carbon footprint by 15% and cuts costs by 2%.</p>
                  <button className="mt-3 text-xs font-medium bg-emerald-600 text-white px-3 py-1.5 rounded hover:bg-emerald-700 transition-colors">
                    Review Options
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
              <div className="flex gap-3">
                <div className="mt-0.5"><Wind className="w-5 h-5 text-blue-600" /></div>
                <div>
                  <h4 className="text-sm font-semibold text-blue-900">Optimize Delivery Routes</h4>
                  <p className="text-xs text-blue-700 mt-1">Batching Friday deliveries can save approximately 4.2 tons of CO2 this month.</p>
                  <button className="mt-3 text-xs font-medium bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition-colors">
                    Apply Schedule
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
