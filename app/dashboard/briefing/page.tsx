"use client";
import RoleGate from '@/components/layout/RoleGate';


import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Brain, Leaf, AlertTriangle, ArrowRightLeft, TrendingUp, CheckCircle2, ChevronRight, Zap, BarChart, Package, Clock, ShoppingCart } from "lucide-react";
import { formatINR } from "@/lib/utils";
import { useDashboardData } from "@/lib/hooks/useDashboardData";
import { getActions, getInventoryIntelligence, getWeeklyComparison } from "@/lib/api";
import type { ActionOut, InventoryIntelligence, WeeklyComparison } from "@/lib/backend-types";

function BriefingPageContent() {
  const { summary, loading } = useDashboardData();
  const [actions, setActions] = useState<ActionOut[]>([]);
  const [invIntel, setInvIntel] = useState<InventoryIntelligence | null>(null);
  const [weekly, setWeekly] = useState<WeeklyComparison | null>(null);

  useEffect(() => {
    async function loadData() {
      const [actionsRes, invRes, weeklyRes] = await Promise.all([
        getActions("PENDING"),
        getInventoryIntelligence(),
        getWeeklyComparison()
      ]);
      // Sort actions by value_at_risk descending and take top 5
      const sorted = actionsRes.sort((a, b) => (b.value_at_risk || 0) - (a.value_at_risk || 0)).slice(0, 5);
      setActions(sorted);
      setInvIntel(invRes);
      setWeekly(weeklyRes);
    }
    loadData();
  }, []);

  if (loading || !summary) {
    return <div className="p-8 text-center text-slate-500 animate-pulse">Generating your daily briefing...</div>;
  }

  const kpis = summary.kpis;
  const avgOrderValue = (kpis.today_revenue || 0) / (kpis.today_orders || 1);
  const formattedDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-green-600" /> Morning Intelligence
          </h2>
          <p className="text-sm text-slate-500">{formattedDate}</p>
        </div>
        <div className="text-xs font-semibold bg-green-100 text-green-700 px-3 py-1.5 rounded-full flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" /> Fresh insights
        </div>
      </div>

      {/* Top Banner Header */}
      <div className="bg-[#063120] rounded-2xl p-6 border border-[#0A412A] text-white relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#0FA958] rounded-full blur-3xl opacity-20 transform translate-x-1/2 -translate-y-1/2" />
        
        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-[#0FA958] rounded-full flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-bold text-lg">Good Morning, Store Owner 🌱</h3>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            Here is your daily store briefing. We've detected important inventory insights and sales trends to start your day effectively.
          </p>
        </div>
      </div>

      {/* Snapshot */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 border-t-4 border-t-green-500">
          <div className="text-xs text-slate-500 font-semibold mb-1 uppercase tracking-wide">Today Revenue</div>
          <div className="text-xl font-bold text-slate-900">{kpis.today_revenue ? formatINR(kpis.today_revenue) : "₹0"}</div>
        </div>
        <div className="glass-panel p-4 border-t-4 border-t-blue-500">
          <div className="text-xs text-slate-500 font-semibold mb-1 uppercase tracking-wide">Orders</div>
          <div className="text-xl font-bold text-slate-900">{kpis.today_orders || 0}</div>
        </div>
        <div className="glass-panel p-4 border-t-4 border-t-indigo-500">
          <div className="text-xs text-slate-500 font-semibold mb-1 uppercase tracking-wide">Units</div>
          <div className="text-xl font-bold text-slate-900">{kpis.today_units || 0}</div>
        </div>
        <div className="glass-panel p-4 border-t-4 border-t-orange-500">
          <div className="text-xs text-slate-500 font-semibold mb-1 uppercase tracking-wide">Avg Order Value</div>
          <div className="text-xl font-bold text-slate-900">{formatINR(avgOrderValue)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Priority Actions & Sales */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-5">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-5">
              <Zap className="w-4 h-4 text-red-500" /> 🔴 Actions Needed Today
            </h3>
            
            <div className="space-y-3">
              {actions.length === 0 ? (
                <div className="text-center text-sm text-slate-500 py-4">No urgent actions pending today!</div>
              ) : (
                actions.map((action) => (
                  <div key={action.id} className="border border-slate-100 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex gap-2 items-center mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded">
                          {action.risk_type.replace(/_/g, " ")}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">{action.product_name}</h4>
                      <p className="text-xs text-slate-500 mt-1">Value at risk: {formatINR(action.value_at_risk || 0)}</p>
                    </div>
                    
                    <Link href="/dashboard/actions" className="text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-4 py-2 rounded-lg transition-colors whitespace-nowrap">
                      Act Now
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="glass-panel p-5">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
              <BarChart className="w-4 h-4 text-blue-600" /> 📈 Sales This Week
            </h3>
            {weekly ? (
              <div className="flex items-center gap-6">
                <div>
                  <div className="text-sm text-slate-500 mb-1">This Week</div>
                  <div className="text-2xl font-bold text-slate-900">{formatINR(weekly.this_week.revenue)}</div>
                </div>
                <div className="text-slate-300">|</div>
                <div>
                  <div className="text-sm text-slate-500 mb-1">Last Week</div>
                  <div className="text-xl font-semibold text-slate-600">{formatINR(weekly.last_week.revenue)}</div>
                </div>
                <div className={`ml-auto px-3 py-1 rounded-full text-sm font-bold ${weekly.revenue_growth_pct >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {weekly.revenue_growth_pct >= 0 ? "↑" : "↓"} {Math.abs(weekly.revenue_growth_pct)}%
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500">Loading sales data...</div>
            )}
          </div>
        </div>

        {/* Right Column: Inventory Alerts & Quick Actions */}
        <div className="col-span-1 space-y-6">
          <div className="glass-panel p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-orange-600" /> 📦 Inventory Alerts
            </h3>
            
            {invIntel ? (
              <div className="space-y-3">
                <Link href="/dashboard/inventory" className="block border border-orange-100 bg-orange-50/30 rounded-xl p-4 hover:bg-orange-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-orange-500" /> Near Expiry</h4>
                      <p className="text-[11px] text-slate-600">{invIntel.near_expiry.count} products at risk</p>
                    </div>
                    <div className="text-xs font-bold text-orange-600">{formatINR(invIntel.near_expiry.value)}</div>
                  </div>
                </Link>

                <Link href="/dashboard/inventory" className="block border border-blue-100 bg-blue-50/30 rounded-xl p-4 hover:bg-blue-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 mb-1">Low Stock</h4>
                      <p className="text-[11px] text-slate-600">{invIntel.low_stock.count} products to reorder</p>
                    </div>
                  </div>
                </Link>

                <Link href="/dashboard/inventory" className="block border border-slate-200 bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 mb-1">Dead Stock</h4>
                      <p className="text-[11px] text-slate-600">{invIntel.dead_stock.count} products tied up</p>
                    </div>
                    <div className="text-xs font-bold text-slate-500">{formatINR(invIntel.dead_stock.value)}</div>
                  </div>
                </Link>
              </div>
            ) : (
              <div className="text-sm text-slate-500">Loading alerts...</div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link href="/dashboard/scanner" className="bg-white border border-slate-200 text-slate-700 rounded-lg p-3 text-center text-xs font-bold hover:border-green-300 hover:text-green-700 transition-colors">
              Scan Product
            </Link>
            <Link href="/dashboard/pos" className="bg-white border border-slate-200 text-slate-700 rounded-lg p-3 text-center text-xs font-bold hover:border-green-300 hover:text-green-700 transition-colors">
              Record Sale
            </Link>
            <Link href="/dashboard/reports" className="bg-white border border-slate-200 text-slate-700 rounded-lg p-3 text-center text-xs font-bold hover:border-green-300 hover:text-green-700 transition-colors">
              View Reports
            </Link>
            <Link href="/dashboard/actions" className="bg-white border border-slate-200 text-slate-700 rounded-lg p-3 text-center text-xs font-bold hover:border-green-300 hover:text-green-700 transition-colors">
              AI Actions
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}


export default function BriefingPage() {
  return (
    <RoleGate module="analytics">
      <BriefingPageContent />
    </RoleGate>
  );
}
