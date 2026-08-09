"use client";
import RoleGate from '@/components/layout/RoleGate';


import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { 
  Leaf, 
  Wind, 
  Droplets, 
  Recycle, 
  TrendingUp,
  Download,
  Share2,
  Activity,
  PackageCheck,
  PackageMinus,
  AlertTriangle
} from 'lucide-react';
import { getGreenScoreCurrent, getGreenScoreHistory } from '@/lib/api';
import type { GreenScoreOut, GreenScoreHistoryPoint } from '@/lib/backend-types';

function SustainabilityPageContent() {
  const [current, setCurrent] = useState<GreenScoreOut | null>(null);
  const [history, setHistory] = useState<GreenScoreHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [c, h] = await Promise.all([getGreenScoreCurrent(), getGreenScoreHistory()]);
        setCurrent(c);
        setHistory(h);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const sustainMetrics = current ? [
    { title: "Expiry Prevention", value: current.expiry_score, unit: "/100", icon: PackageCheck, color: "text-emerald-500", bg: "bg-emerald-50", change: "+0%" },
    { title: "Inventory Efficiency", value: current.inventory_score, unit: "/100", icon: Activity, color: "text-blue-500", bg: "bg-blue-50", change: "+0%" },
    { title: "Dead Stock Control", value: current.dead_stock_score, unit: "/100", icon: PackageMinus, color: "text-amber-500", bg: "bg-amber-50", change: "+0%" },
    { title: "Waste Prevention", value: current.waste_score, unit: "/100", icon: Recycle, color: "text-[#0FA958]", bg: "bg-[#0FA958]/10", change: "+0%" }
  ] : [];

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
              <div className="text-green-200 text-sm font-medium mb-1">Overall Green Score</div>
              <div className="w-full bg-black/20 rounded-full h-2.5 mt-3">
                <div className="bg-[#0FA958] h-2.5 rounded-full shadow-[0_0_10px_rgba(15,169,88,0.8)]" style={{ width: `${current?.score ?? 0}%` }}></div>
              </div>
              <div className="flex justify-between text-xs text-green-100 mt-2">
                <span>{current?.score ?? 0} / 100</span>
                <span>Target: 95</span>
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
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Green Score History</h3>
          <div className="h-64 flex items-end justify-between gap-2 pb-6 relative">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
              </div>
            ) : history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="period_date" tickFormatter={val => val.slice(5)} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dy={10} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                  <Tooltip 
                    formatter={(value: any) => [value, 'Green Score']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  />
                  <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                <Leaf className="w-8 h-8 mb-2 opacity-50" />
                <p>No history data available</p>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-xl border border-slate-100 shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Environmental Tracking</h3>
          <div className="space-y-4">
            <div className="p-6 rounded-lg bg-slate-50 border border-slate-200 text-center flex flex-col items-center">
              <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
              <h4 className="text-sm font-semibold text-slate-700">Coming Soon</h4>
              <p className="text-xs text-slate-500 mt-2">Environmental impact tracking for Carbon, Water, and specific waste parameters is coming in a future update.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}


export default function SustainabilityPage() {
  return (
    <RoleGate module="sustainability">
      <SustainabilityPageContent />
    </RoleGate>
  );
}
