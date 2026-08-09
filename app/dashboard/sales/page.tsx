"use client";

import React, { useState, useEffect } from "react";
import { TrendingUp, ShoppingCart, Package, Calendar, BarChart2 } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Tabs, type TabItem } from "@/components/ui";
import { formatINR, formatCompactINR } from "@/lib/utils";

import { apiFetch } from "@/lib/api-client";

async function fetchWithAuth(path: string) {
  return apiFetch<any>(path);
}

export default function SalesDashboard() {
  const [activeTab, setActiveTab] = useState<"Overview" | "Today" | "Weekly" | "Monthly">("Overview");
  const [kpis, setKpis] = useState<{
    today_revenue: number;
    today_orders: number;
    today_units: number;
    mtd_revenue: number;
  } | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ this_week: number; last_week: number; growth: number | null } | null>(null);
  const [monthlyData, setMonthlyData] = useState<{ this_month: number; last_month: number; growth: number | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        // Always load KPIs
        const dashboard = await fetchWithAuth("/api/analytics/dashboard").catch(() => null);
        if (dashboard && dashboard.kpis) {
          setKpis({
            today_revenue: dashboard.kpis.today_revenue || 0,
            today_orders: dashboard.kpis.today_orders || 0,
            today_units: dashboard.kpis.today_units || 0,
            mtd_revenue: dashboard.kpis.mtd_revenue || 0,
          });
        } else {
          setKpis({ today_revenue: 0, today_orders: 0, today_units: 0, mtd_revenue: 0 });
        }

        if (activeTab === "Overview") {
          const trend = await fetchWithAuth("/api/analytics/sales-trend?days=30");
          setChartData(trend || []);
        } else if (activeTab === "Today") {
          const hourly = await fetchWithAuth("/api/analytics/hourly");
          setChartData(hourly || []);
        } else if (activeTab === "Weekly") {
          const weekly = await fetchWithAuth("/api/analytics/weekly");
          setWeeklyData(
            weekly
              ? {
                  this_week: weekly.this_week?.revenue ?? 0,
                  last_week: weekly.last_week?.revenue ?? 0,
                  growth: weekly.revenue_growth_pct ?? null,
                }
              : { this_week: 0, last_week: 0, growth: null }
          );
        } else if (activeTab === "Monthly") {
          const monthly = await fetchWithAuth("/api/analytics/monthly");
          setMonthlyData(
            monthly
              ? {
                  this_month: monthly.this_month?.revenue ?? 0,
                  last_month: monthly.last_month?.revenue ?? 0,
                  growth: monthly.revenue_growth_pct ?? null,
                }
              : { this_month: 0, last_month: 0, growth: null }
          );
        }
      } catch (err: any) {
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [activeTab]);

  const tabs: TabItem[] = [
    { key: "Overview", label: "Overview" },
    { key: "Today", label: "Today" },
    { key: "Weekly", label: "Weekly" },
    { key: "Monthly", label: "Monthly" },
  ];

  const formatYAxis = (val: number) => `₹${val >= 100000 ? (val / 100000).toFixed(1) + "L" : val >= 1000 ? (val / 1000).toFixed(1) + "K" : val}`;

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Sales & Performance</h1>
        <p className="mt-1 text-sm text-muted">Track revenue and sales performance across time periods.</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-line bg-surface p-4 shadow-card">
          <div className="flex items-center gap-2 text-muted mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">Today Revenue</span>
          </div>
          <div className="text-2xl font-semibold text-brand">{formatINR(kpis?.today_revenue || 0)}</div>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4 shadow-card">
          <div className="flex items-center gap-2 text-muted mb-2">
            <ShoppingCart className="w-4 h-4" />
            <span className="text-sm font-medium">Today Orders</span>
          </div>
          <div className="text-2xl font-semibold text-ink">{kpis?.today_orders || 0}</div>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4 shadow-card">
          <div className="flex items-center gap-2 text-muted mb-2">
            <Package className="w-4 h-4" />
            <span className="text-sm font-medium">Today Units</span>
          </div>
          <div className="text-2xl font-semibold text-ink">{kpis?.today_units || 0}</div>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4 shadow-card">
          <div className="flex items-center gap-2 text-muted mb-2">
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">MTD Revenue</span>
          </div>
          <div className="text-2xl font-semibold text-info">{formatINR(kpis?.mtd_revenue || 0)}</div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        items={tabs}
        active={activeTab}
        onChange={(key) => setActiveTab(key as "Overview" | "Today" | "Weekly" | "Monthly")}
      />

      {/* Tab Content */}
      <div className="rounded-lg border border-line bg-surface shadow-card">
        {loading && <div className="h-64 animate-pulse bg-subtle rounded-lg" />}
        {!loading && error && (
          <div className="p-4 text-center text-sm text-danger bg-danger-soft border border-danger/20 rounded-lg">
            {error}
          </div>
        )}

        {!loading && !error && activeTab === "Overview" && (
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-ink">30-Day Trend</h3>
            {chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted">
                <BarChart2 className="h-12 w-12 mb-2 text-muted/30" />
                <p>No sales data yet</p>
              </div>
            ) : (
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#157347" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#157347" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748B" }} dy={10} interval="preserveStartEnd" />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748B" }} tickFormatter={formatYAxis} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748B" }} />
                    <Tooltip
                      contentStyle={{ borderRadius: "8px", border: "1px solid #E2E8F0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                      formatter={(value: any, name: any) => [name === "revenue" ? formatINR(value) : value, name === "revenue" ? "Revenue" : "Units"]}
                    />
                    <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#157347" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                    <Area yAxisId="right" type="monotone" dataKey="units" stroke="#6366F1" strokeWidth={2} fillOpacity={0} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {!loading && !error && activeTab === "Today" && (
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-ink">Hourly Revenue</h3>
            {chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted">
                <BarChart2 className="h-12 w-12 mb-2 text-muted/30" />
                <p>No sales data yet</p>
              </div>
            ) : (
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748B" }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748B" }} tickFormatter={formatYAxis} />
                    <Tooltip
                      cursor={{ fill: "#F1F5F9" }}
                      contentStyle={{ borderRadius: "8px", border: "1px solid #E2E8F0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                      formatter={(value: any) => [formatINR(value), "Revenue"]}
                      labelFormatter={(label) => `Hour: ${label}:00`}
                    />
                    <Bar dataKey="revenue" fill="#157347" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {!loading && !error && activeTab === "Weekly" && weeklyData && (
          <div className="p-6 space-y-6">
            <h3 className="text-sm font-semibold text-ink">Weekly Comparison</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-line bg-subtle p-6">
                <div className="text-sm text-muted mb-1">This Week</div>
                <div className="text-3xl font-bold text-ink">{formatINR(weeklyData.this_week)}</div>
              </div>
              <div className="rounded-lg border border-line bg-subtle p-6">
                <div className="text-sm text-muted mb-1">Last Week</div>
                <div className="text-3xl font-bold text-dim">{formatINR(weeklyData.last_week)}</div>
              </div>
            </div>
            <div className="rounded-lg border border-line bg-surface p-4 flex items-center justify-between">
              <span className="font-medium text-muted">Growth</span>
              <span className={`font-bold ${weeklyData.growth === null ? "text-muted" : weeklyData.growth >= 0 ? "text-success" : "text-danger"}`}>
                {weeklyData.growth === null ? "— insufficient data" : `${weeklyData.growth >= 0 ? "+" : ""}${weeklyData.growth}%`}
              </span>
            </div>
          </div>
        )}

        {!loading && !error && activeTab === "Monthly" && monthlyData && (
          <div className="p-6 space-y-6">
            <h3 className="text-sm font-semibold text-ink">Monthly Comparison</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-line bg-subtle p-6">
                <div className="text-sm text-muted mb-1">This Month</div>
                <div className="text-3xl font-bold text-ink">{formatINR(monthlyData.this_month)}</div>
              </div>
              <div className="rounded-lg border border-line bg-subtle p-6">
                <div className="text-sm text-muted mb-1">Last Month</div>
                <div className="text-3xl font-bold text-dim">{formatINR(monthlyData.last_month)}</div>
              </div>
            </div>
            <div className="rounded-lg border border-line bg-surface p-4 flex items-center justify-between">
              <span className="font-medium text-muted">Growth</span>
              <span className={`font-bold ${monthlyData.growth === null ? "text-muted" : monthlyData.growth >= 0 ? "text-success" : "text-danger"}`}>
                {monthlyData.growth === null ? "— insufficient data" : `${monthlyData.growth >= 0 ? "+" : ""}${monthlyData.growth}%`}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}