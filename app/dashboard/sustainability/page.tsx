"use client";

import React, { useEffect, useState } from "react";
import { Leaf, Award, TrendingUp, ShieldCheck, Zap, ArrowRight, BarChart2 } from "lucide-react";
import { getGreenScore, getWastePreventedSeries } from "@/lib/api";

export default function SustainabilityPage() {
  const [score, setScore] = useState<number>(0);
  const [waste, setWaste] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [sc, ws] = await Promise.all([
          getGreenScore(),
          getWastePreventedSeries()
        ]);
        if (sc?.score !== undefined) setScore(sc.score);
        if (ws?.total !== undefined) setWaste(ws.total);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6 pb-12 font-sans text-slate-900">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
            <Leaf className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Store Sustainability & Green Score Hub</h1>
            <p className="text-xs text-slate-500">Track waste prevented, carbon footprint reduction, and store sustainability ratings</p>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Overall Green Score</span>
            <Award className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-emerald-700">{score}<span className="text-sm font-normal text-slate-400">/100</span></div>
          <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Top 5% Sustainable Retailers in Region
          </p>
        </div>

        <div className="glass-panel p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Food Waste Prevented (30d)</span>
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{waste.toFixed(1)} kg</div>
          <p className="text-xs text-slate-500 font-medium">Prevented from entering landfill via AI markdown</p>
        </div>

        <div className="glass-panel p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Carbon Offsets (30d)</span>
            <Zap className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-slate-900">{(waste * 2.5).toFixed(1)} kg</div>
          <p className="text-xs text-slate-500 font-medium">Equivalent to planting {Math.round(waste / 8.9)} trees this month</p>
        </div>
      </div>

      {/* Sustainable Practices */}
      <div className="glass-panel p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Leaf className="w-4.5 h-4.5 text-emerald-600" /> Automated Sustainability Drivers
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="font-bold text-slate-900 text-sm">Dynamic Expiry Markdowns</div>
            <p className="text-slate-600">Automated 25%-50% discounts applied 3 days prior to expiration to guarantee clearance before spoilage.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="font-bold text-slate-900 text-sm">Inter-Store Stock Transfers</div>
            <p className="text-slate-600">Overstocked inventory is dynamically transferred to high-velocity neighbor stores before loss occurs.</p>
          </div>
        </div>
      </div>

    </div>
  );
}
