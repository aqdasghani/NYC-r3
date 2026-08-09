"use client";

import React, { useState, useEffect } from "react";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { getToken } from "@/lib/api-client";
import { formatINR } from "@/lib/utils";
import { TrendingUp, TrendingDown, DollarSign, Calendar, Clock, BarChart3, PieChart, Activity } from "lucide-react";

type Tab = "Overview" | "Today" | "Hourly" | "Weekly" | "Monthly";

interface TrendData {
  date: string;
  revenue: number;
  units: number;
}

interface HourlyData {
  hour: number;
  revenue: number;
  units: number;
}

interface WeeklyData {
  this_week_revenue: number;
  last_week_revenue: number;
  growth_pct: number;
}

interface MonthlyData {
  this_month_revenue: number;
  last_month_revenue: number;
  growth_pct: number;
}

const formatHour = (hour: number) => {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
};

export default function SalesDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null);
  
  const [todayRevenue, setTodayRevenue] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

        // Fetch Dashboard KPIs
        const dashRes = await fetch(`${baseUrl}/api/analytics/dashboard`, { headers });
        if (!dashRes.ok) throw new Error("Failed to fetch dashboard data");
        const dashData = await dashRes.json();
        
        // Overview
        const trendRes = await fetch(`${baseUrl}/api/analytics/sales-trend?days=30`, { headers });
        if (!trendRes.ok) throw new Error("Failed to fetch trend data");
        const tData = await trendRes.json();
        setTrendData(tData);

        // Hourly (Today)
        const hourlyRes = await fetch(`${baseUrl}/api/analytics/hourly`, { headers });
        if (!hourlyRes.ok) throw new Error("Failed to fetch hourly data");
        const hData = await hourlyRes.json();
        setHourlyData(hData);

        // Weekly
        const weeklyRes = await fetch(`${baseUrl}/api/analytics/weekly`, { headers });
        if (!weeklyRes.ok) throw new Error("Failed to fetch weekly data");
        const wData = await weeklyRes.json();
        setWeeklyData(wData);

        // Monthly
        const monthlyRes = await fetch(`${baseUrl}/api/analytics/monthly`, { headers });
        if (!monthlyRes.ok) throw new Error("Failed to fetch monthly data");
        const mData = await monthlyRes.json();
        setMonthlyData(mData);

        if (dashData?.kpis?.today_revenue !== undefined) {
          setTodayRevenue(dashData.kpis.today_revenue);
        } else {
          // fallback: sum from hourly
          const sum = hData.reduce((acc: number, val: HourlyData) => acc + val.revenue, 0);
          setTodayRevenue(sum);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const peakHour = hourlyData.length > 0 ? hourlyData.reduce((max, h) => h.revenue > max.revenue ? h : max, hourlyData[0]) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Sales Dashboard</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Revenue</div>
          </div>
          {loading ? <div className="h-8 bg-slate-100 animate-pulse rounded w-1/2"></div> : (
            <div className="text-2xl font-bold text-slate-900">{formatINR(todayRevenue)}</div>
          )}
        </div>

        <div className="glass-panel p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">This Week Revenue</div>
          </div>
          {loading ? <div className="h-8 bg-slate-100 animate-pulse rounded w-1/2"></div> : (
            <>
              <div className="text-2xl font-bold text-slate-900">{formatINR(weeklyData?.this_week_revenue ?? 0)}</div>
              {weeklyData && (
                <div className={`text-xs font-medium mt-1 ${weeklyData.growth_pct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {weeklyData.growth_pct >= 0 ? "↑" : "↓"} {Math.abs(weeklyData.growth_pct).toFixed(1)}% vs last week
                </div>
              )}
            </>
          )}
        </div>

        <div className="glass-panel p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-purple-500" />
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">MTD Revenue</div>
          </div>
          {loading ? <div className="h-8 bg-slate-100 animate-pulse rounded w-1/2"></div> : (
            <>
              <div className="text-2xl font-bold text-slate-900">{formatINR(monthlyData?.this_month_revenue ?? 0)}</div>
            </>
          )}
        </div>

        <div className="glass-panel p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            {monthlyData && monthlyData.growth_pct >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">MoM Growth</div>
          </div>
          {loading ? <div className="h-8 bg-slate-100 animate-pulse rounded w-1/2"></div> : (
            <>
              <div className={`text-2xl font-bold ${monthlyData && monthlyData.growth_pct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {monthlyData && monthlyData.growth_pct > 0 ? "+" : ""}{monthlyData?.growth_pct?.toFixed(1) ?? 0}%
              </div>
              <div className="text-xs text-slate-500 font-medium mt-1">vs last month</div>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(["Overview", "Today", "Hourly", "Weekly", "Monthly"] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`min-w-[44px] min-h-[44px] px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              activeTab === tab 
                ? "bg-slate-900 text-white" 
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="glass-panel p-6">
        {loading && (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
          </div>
        )}
        
        {!loading && error && (
          <div className="h-64 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-3">
              <TrendingDown className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">Failed to load data</h3>
            <p className="text-slate-500">{error}</p>
          </div>
        )}

        {!loading && !error && activeTab === "Overview" && (
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">30-Day Sales Trend</h3>
            {trendData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center text-slate-500">
                <BarChart3 className="w-8 h-8 mb-2 opacity-50" />
                <p>No sales data yet &mdash; make your first sale</p>
              </div>
            ) : (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="date" tickFormatter={val => val.slice(5)} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dy={10} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tickFormatter={v => `₹${v/1000}k`} tick={{ fontSize: 12, fill: '#64748B' }} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                    <Tooltip 
                      formatter={(value: any, name: any) => [name === 'revenue' ? formatINR(value) : value, name === 'revenue' ? 'Revenue' : 'Units'] as [string, string]}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                    />
                    <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                    <Line yAxisId="right" type="monotone" dataKey="units" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {!loading && !error && (activeTab === "Today" || activeTab === "Hourly") && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Hourly Performance</h3>
              {activeTab === "Hourly" && peakHour && (
                <div className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Peak: {formatHour(peakHour.hour)} ({formatINR(peakHour.revenue)})
                </div>
              )}
            </div>
            {hourlyData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center text-slate-500">
                <BarChart3 className="w-8 h-8 mb-2 opacity-50" />
                <p>No sales data yet &mdash; make your first sale</p>
              </div>
            ) : (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="hour" tickFormatter={formatHour} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={v => `₹${v/1000}k`} tick={{ fontSize: 12, fill: '#64748B' }} />
                    <Tooltip 
                      formatter={(value: any) => [`₹${value}`, "Amount"] as [string, string]}
                      labelFormatter={(label: any) => `Hour: ${formatHour(label)}`}
                      cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {!loading && !error && activeTab === "Weekly" && (
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Weekly Comparison</h3>
            {!weeklyData ? (
              <div className="h-64 flex flex-col items-center justify-center text-center text-slate-500">
                <BarChart3 className="w-8 h-8 mb-2 opacity-50" />
                <p>No sales data yet &mdash; make your first sale</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 flex flex-col justify-center items-center text-center">
                  <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">This Week</div>
                  <div className="text-3xl font-bold text-slate-900">{formatINR(weeklyData.this_week_revenue)}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 flex flex-col justify-center items-center text-center">
                  <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Last Week</div>
                  <div className="text-3xl font-bold text-slate-900">{formatINR(weeklyData.last_week_revenue)}</div>
                  <div className={`mt-3 inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${weeklyData.growth_pct >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {weeklyData.growth_pct >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {Math.abs(weeklyData.growth_pct).toFixed(1)}% vs Last Week
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && !error && activeTab === "Monthly" && (
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Monthly Comparison</h3>
            {!monthlyData ? (
              <div className="h-64 flex flex-col items-center justify-center text-center text-slate-500">
                <BarChart3 className="w-8 h-8 mb-2 opacity-50" />
                <p>No sales data yet &mdash; make your first sale</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 flex flex-col justify-center items-center text-center">
                  <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">This Month</div>
                  <div className="text-3xl font-bold text-slate-900">{formatINR(monthlyData.this_month_revenue)}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 flex flex-col justify-center items-center text-center">
                  <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Last Month</div>
                  <div className="text-3xl font-bold text-slate-900">{formatINR(monthlyData.last_month_revenue)}</div>
                  <div className={`mt-3 inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${monthlyData.growth_pct >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {monthlyData.growth_pct >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {Math.abs(monthlyData.growth_pct).toFixed(1)}% vs Last Month
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
