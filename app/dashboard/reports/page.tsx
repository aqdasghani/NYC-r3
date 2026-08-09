"use client";
import RoleGate from '@/components/layout/RoleGate';


import React, { useState, useEffect } from "react";
import { Download, Printer, BarChart2, TrendingUp, Package, ShoppingCart, Loader2 } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { formatINR } from "@/lib/utils";
import { getMonthlyComparison, getDashboardSummary, getSalesTrend } from "@/lib/api";
import type { MonthlyComparison, DashboardSummary, SalesTrendPoint } from "@/lib/backend-types";

function exportCSV(data: object[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0] || {}).join(',');
  const rows = data.map(row => Object.values(row).join(',')).join('\n');
  const blob = new Blob([headers + '\n' + rows], {type: 'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportsPageContent() {
  const [period, setPeriod] = useState("This Month");
  const [monthly, setMonthly] = useState<MonthlyComparison | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trend, setTrend] = useState<SalesTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [mRes, sRes, tRes] = await Promise.all([
        getMonthlyComparison(),
        getDashboardSummary(),
        getSalesTrend(90)
      ]);
      setMonthly(mRes);
      setSummary(sRes);
      setTrend(tRes);
      setLoading(false);
    }
    load();
  }, []);

  const handleExportCSV = () => {
    setIsExporting(true);
    setTimeout(() => {
      exportCSV(trend, `GreenShop_Sales_Trend_${period.replace(/ /g, "_")}.csv`);
      setIsExporting(false);
    }, 500);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading || !monthly || !summary) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>Loading reports data...</p>
      </div>
    );
  }

  // Derive metrics based on period selected (simulated for simplicity since we only fetch one set)
  let metrics = { revenue: 0, transactions: 0, units: 0, title: "" };
  if (period === "This Month") {
    metrics = { ...monthly.this_month, title: "This Month" };
  } else if (period === "Last Month") {
    metrics = { ...monthly.last_month, title: "Last Month" };
  } else {
    // 90 days approximation
    metrics = {
      title: "Last 90 Days",
      revenue: trend.reduce((sum, p) => sum + p.revenue, 0),
      units: trend.reduce((sum, p) => sum + p.units, 0),
      transactions: Math.floor(trend.reduce((sum, p) => sum + p.units, 0) / 2.5),
    };
  }

  const avgOrderValue = metrics.revenue / (metrics.transactions || 1);

  // Filter trend data based on period
  let displayTrend = trend;
  if (period === "This Month") displayTrend = trend.slice(-30);
  if (period === "Last Month") displayTrend = trend.slice(-60, -30);
  
  const chartData = displayTrend.map(d => ({ name: d.date.slice(5), revenue: d.revenue }));

  return (
    <div className="space-y-6 pb-12 print:text-black">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Analytics & Reports</h2>
          <p className="text-sm text-slate-500">Detailed sales insights and exportable summaries.</p>
        </div>
        
        <div className="flex items-center gap-2 print:hidden">
          <button 
            onClick={handleExportCSV}
            disabled={isExporting}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export CSV
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-[#0FA958] hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" /> Print Report
          </button>
        </div>
      </div>

      {/* Month Selection */}
      <div className="flex gap-2 print:hidden">
        {["This Month", "Last Month", "Last 90 Days"].map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${period === p ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Revenue Summary Card */}
      <div className="glass-panel p-6">
        <h3 className="text-base font-bold text-slate-800 mb-6">{metrics.title} Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 mb-2">
              <TrendingUp className="w-4 h-4 text-green-600" /> Revenue
            </div>
            <div className="text-3xl font-bold text-slate-900">{formatINR(metrics.revenue)}</div>
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 mb-2">
              <ShoppingCart className="w-4 h-4 text-blue-600" /> Transactions
            </div>
            <div className="text-3xl font-bold text-slate-900">{metrics.transactions.toLocaleString()}</div>
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 mb-2">
              <Package className="w-4 h-4 text-orange-600" /> Units
            </div>
            <div className="text-3xl font-bold text-slate-900">{metrics.units.toLocaleString()}</div>
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 mb-2">
              <BarChart2 className="w-4 h-4 text-indigo-600" /> Avg Order Value
            </div>
            <div className="text-3xl font-bold text-slate-900">{formatINR(avgOrderValue)}</div>
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="glass-panel p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-sm font-bold text-slate-800">Sales Trend ({period})</h3>
        </div>
        <div className="h-[300px]">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} dy={10} minTickGap={30} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(val) => `₹${(val/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Line type="monotone" dataKey="revenue" stroke="#0FA958" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#0FA958', stroke: '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
             <div className="h-full flex items-center justify-center text-sm text-slate-400">
               No sales data for {period}
             </div>
          )}
        </div>
      </div>

    </div>
  );
}


export default function ReportsPage() {
  return (
    <RoleGate module="reports">
      <ReportsPageContent />
    </RoleGate>
  );
}
