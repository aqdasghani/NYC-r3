"use client";

import React from "react";
import Link from "next/link";
import {
  Briefcase, ShoppingBag, AlertTriangle, XCircle, Leaf,
  TrendingUp, Bell, ArrowRightLeft, ShoppingCart, Users, ChevronRight, Package,
  Sparkles, RefreshCw, PlugZap,
} from "lucide-react";
import {
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { useDashboardData } from "@/lib/hooks/useDashboardData";
import type { Risk } from "@/lib/types";
import { formatINR, formatCompactINR } from "@/lib/utils";

const INSIGHT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Package,
  TrendingUp,
  Leaf,
};

const TIMELINE_COLORS = ["#EF4444", "#F59E0B", "#FCD34D", "#34D399", "#0FA958"];

function MetricCard({
  title, value, sub, subColor, icon: Icon, iconBg, iconColor,
}: {
  title: string; value: string; sub: string; subColor: string;
  icon: React.ComponentType<{ className?: string }>; iconBg: string; iconColor: string;
}) {
  return (
    <div className="glass-panel p-4 flex flex-col justify-between">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-500">{title}</div>
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900 mb-1">{value}</div>
        <div className={`text-xs font-medium ${subColor}`}>{sub}</div>
      </div>
    </div>
  );
}

function UrgentActionCard({ risk }: { risk: Risk }) {
  const color =
    risk.priority === "TRANSFER"
      ? "text-blue-500 bg-blue-50"
      : risk.priority === "REORDER"
        ? "text-green-600 bg-green-50"
        : risk.priority === "URGENT"
          ? "text-red-500 bg-red-50"
          : "text-orange-500 bg-orange-50";
  const btn =
    risk.priority === "TRANSFER"
      ? "bg-blue-500"
      : risk.priority === "REORDER"
        ? "bg-green-600"
        : risk.priority === "URGENT"
          ? "bg-red-500"
          : "bg-orange-500";
  return (
    <div className="glass-panel p-3 flex justify-between items-center border border-slate-100 hover:border-slate-200 transition-colors">
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${color}`}>
          <Bell className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-800">{risk.productName} — {risk.tag.toLowerCase()}</h4>
          <p className="text-[11px] text-slate-500 mt-0.5">{risk.reason}</p>
        </div>
      </div>
      <Link
        href="/dashboard/actions"
        className={`text-[10px] font-bold text-white px-3 py-1.5 rounded whitespace-nowrap ${btn} hover:opacity-90 transition-opacity`}
      >
        Take Action
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const { kpis, priorities, summary, loading, offline, reload } = useDashboardData();

  if (loading || !summary) {
    return (
      <div className="space-y-6 pb-12">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Loading live dashboard…</h2>
          <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="glass-panel p-4 h-28 animate-pulse bg-slate-100" />
          ))}
        </div>
        <div className="glass-panel p-5 h-64 animate-pulse bg-slate-100" />
      </div>
    );
  }

  const k = summary.kpis;
  const donut = summary.donut;
  const totalProducts = k.product_count || 1;
  const trend = summary.sales_trend.map((p) => ({ name: p.date.slice(5), value: p.revenue }));
  const timeline = summary.expiry_timeline;
  const maxTimelineItems = Math.max(1, ...timeline.map((t) => t.items));
  const ai = summary.ai_priority;
  const brief = summary.daily_brief;
  const insights = summary.ai_insights;
  const mini = summary.mini_kpis;

  const topMetrics = [
    { title: "Total Inventory Value", value: formatCompactINR(k.inventory_value), sub: `↑ ${k.inventory_value_delta_pct}% vs last month`, subColor: "text-green-600", icon: Briefcase, iconBg: "bg-green-100", iconColor: "text-green-600" },
    { title: "Total Products", value: k.product_count.toLocaleString("en-IN"), sub: `↑ ${k.product_count_delta_pct}% vs last month`, subColor: "text-green-600", icon: ShoppingBag, iconBg: "bg-blue-100", iconColor: "text-blue-600" },
    { title: "At Risk (Near Expiry)", value: `${k.at_risk_count} Items`, sub: `${formatINR(k.at_risk_value)} value at risk`, subColor: "text-slate-500", icon: AlertTriangle, iconBg: "bg-orange-100", iconColor: "text-orange-500" },
    { title: "Expired Items", value: `${k.expired_count} Items`, sub: `${formatINR(k.expired_value)} loss`, subColor: "text-slate-500", icon: XCircle, iconBg: "bg-red-100", iconColor: "text-red-500" },
    { title: "Waste Prevented", value: formatINR(k.waste_prevented_mtd), sub: "This month", subColor: "text-slate-500", icon: Leaf, iconBg: "bg-green-100", iconColor: "text-emerald-600" },
  ];

  const priorityCards = [
    { title: "Sell First", count: `${ai.sell_first.products} Products`, impact: "Potential loss", val: formatINR(ai.sell_first.value), color: "red", icon: AlertTriangle },
    { title: "Discount", count: `${ai.discount.products} Products`, impact: "Potential recovery", val: formatINR(ai.discount.value), color: "orange", icon: TrendingUp },
    { title: "Transfer", count: `${ai.transfer.units} Units`, impact: "Value to transfer", val: ai.transfer.value ? formatINR(ai.transfer.value) : "", color: "blue", icon: ArrowRightLeft },
    { title: "Reorder", count: `${ai.reorder.products} Products`, impact: "Prevent stockout", val: "", color: "green", icon: ShoppingCart },
  ];

  const miniCards = [
    { label: "Suppliers", val: String(mini.suppliers), sub: "Active Suppliers", icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Purchase Orders", val: String(mini.purchase_orders), sub: "Pending Orders", icon: ShoppingCart, color: "text-orange-500", bg: "bg-orange-50" },
    { label: "GRN Pending", val: String(mini.grn_pending), sub: "Needs Approval", icon: Package, color: "text-red-500", bg: "bg-red-50" },
    { label: "Avg. Gross Margin", val: `${mini.avg_gross_margin}%`, sub: "This Month", icon: TrendingUp, color: "text-green-500", bg: "bg-green-50" },
  ];

  return (
    <div className="space-y-6 pb-12">
      {offline && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
            <PlugZap className="w-4 h-4" />
            Backend offline — showing demo data
          </div>
          <button
            onClick={reload}
            className="text-xs font-bold text-amber-800 border border-amber-300 rounded-lg px-3 py-1.5 hover:bg-amber-100 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* 1. Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {topMetrics.map((metric, i) => (
          <MetricCard key={i} {...metric} />
        ))}
      </div>

      {/* 2. Middle Row: Charts & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory Overview (Donut) */}
        <div className="glass-panel p-5 col-span-1">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-slate-800">Inventory Overview</h3>
            <span className="text-xs text-slate-400">{donut.length} segments</span>
          </div>
          <div className="flex items-center">
            <div className="w-1/2 h-[180px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donut}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {donut.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-xl font-bold text-slate-900">{k.product_count.toLocaleString("en-IN")}</div>
                <div className="text-[10px] text-slate-500">Total Products</div>
              </div>
            </div>
            <div className="w-1/2 pl-2">
              <ul className="space-y-2">
                {donut.map((item, i) => (
                  <li key={i} className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-600 font-medium">{item.name}</span>
                    </div>
                    <div className="font-semibold text-slate-900">
                      {item.value} <span className="text-slate-400 font-normal ml-1">({((item.value / totalProducts) * 100).toFixed(1)}%)</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Sales Trend (Line Chart) */}
        <div className="glass-panel p-5 col-span-1">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-slate-800">Sales Trend</h3>
            <span className="text-xs text-slate-400">Last 30 days</span>
          </div>
          <div className="h-[180px]">
            {trend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} dy={10} interval="preserveStartEnd" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={(val) => `₹${val / 1000}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                    itemStyle={{ color: '#0F172A', fontWeight: 'bold' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#0FA958"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#0FA958', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, fill: '#0FA958', stroke: '#fff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                No sales data yet
              </div>
            )}
          </div>
        </div>

        {/* Urgent Actions */}
        <div className="col-span-1 flex flex-col h-full">
          <div className="flex justify-between items-center mb-3 px-1">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-green-600" /> AI Urgent Actions
            </h3>
            <Link href="/dashboard/actions" className="text-xs font-semibold text-blue-600 hover:underline">View All</Link>
          </div>
          <div className="flex-1 space-y-3">
            {priorities.length === 0 && (
              <div className="glass-panel p-6 text-center text-sm text-slate-500">
                No urgent actions — all clear!
              </div>
            )}
            {priorities.slice(0, 4).map((risk) => (
              <UrgentActionCard key={risk.id} risk={risk} />
            ))}
          </div>
        </div>
      </div>

      {/* 3. Bottom Row: AI Actions, Timeline & AI Briefing */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (AI Actions + Timeline) */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Priority Actions */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3 px-1">✨ AI Priority Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {priorityCards.map((action, i) => (
                <div key={i} className={`glass-panel p-4 flex flex-col justify-between border-t-4 border-t-${action.color}-500`}>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`text-${action.color}-500 bg-${action.color}-50 p-1.5 rounded`}>
                        <action.icon className="w-4 h-4" />
                      </div>
                      <h4 className={`text-sm font-bold text-${action.color}-600`}>{action.title}</h4>
                    </div>
                    <div className="text-sm font-semibold text-slate-800">{action.count}</div>

                    <div className="mt-3 mb-4">
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">{action.impact}</div>
                      {action.val && <div className="text-lg font-bold text-slate-900">{action.val}</div>}
                    </div>
                  </div>
                  <Link
                    href="/dashboard/actions"
                    className={`w-full py-1.5 rounded border border-${action.color}-200 text-${action.color}-600 bg-${action.color}-50 hover:bg-${action.color}-100 text-xs font-semibold transition-colors text-center`}
                  >
                    View Details
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Expiry Timeline */}
          <div className="glass-panel p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Expiry Timeline</h3>
            {timeline.length === 0 ? (
              <div className="text-sm text-slate-400 py-6 text-center">No expiry data available</div>
            ) : (
              <div className="space-y-4">
                {timeline.map((row, i) => (
                  <div key={i} className="flex items-center gap-4 text-xs font-medium">
                    <div className="w-20 text-right text-slate-600 whitespace-nowrap">{row.label} Days</div>
                    <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(6, Math.round((row.items / maxTimelineItems) * 100))}%`,
                          backgroundColor: TIMELINE_COLORS[i] ?? TIMELINE_COLORS[4],
                        }}
                      />
                    </div>
                    <div className="w-16 text-right text-slate-800">{row.items} items</div>
                    <div className="w-20 text-right text-slate-500">{formatINR(row.value)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Insights + Briefing) */}
        <div className="col-span-1 space-y-6">
          {/* AI Insights */}
          <div>
            <div className="flex justify-between items-center mb-3 px-1">
              <h3 className="text-sm font-bold text-slate-800">AI Insights</h3>
              <span className="text-xs font-semibold text-slate-400">auto-detected</span>
            </div>
            <div className="space-y-3">
              {insights.length === 0 && (
                <div className="glass-panel p-4 text-sm text-slate-500">No insights yet — the detection engine will surface them here.</div>
              )}
              {insights.map((insight, i) => {
                const Icon = INSIGHT_ICONS[insight.icon] ?? Sparkles;
                return (
                  <div key={i} className="glass-panel p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-green-100 text-green-600">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 capitalize">{insight.title.replace(/_/g, " ").toLowerCase()}</h4>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{insight.detail}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Today's AI Briefing */}
          <div className="bg-[#063120] rounded-xl p-5 border border-[#0A412A] text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#0FA958] rounded-full blur-3xl opacity-20 transform translate-x-1/2 -translate-y-1/2" />
            <div className="flex items-center gap-2 mb-3 relative z-10">
              <div className="w-8 h-8 bg-[#0FA958] rounded-full flex items-center justify-center">
                <Leaf className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-sm">Today's AI Briefing</h3>
            </div>
            <div className="space-y-1 mb-4 relative z-10">
              <p className="text-xs text-slate-300">You have {brief.important_actions} important actions today</p>
              <p className="text-[13px] font-semibold text-white">Est. impact: {formatINR(brief.est_impact)} can be saved</p>
            </div>
            <Link
              href="/dashboard/actions"
              className="w-full py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 relative z-10"
            >
              View Briefing <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* 4. Bottom Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {miniCards.map((stat, i) => (
          <div key={i} className="glass-panel p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${stat.bg}`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-semibold uppercase">{stat.label}</div>
              <div className="text-lg font-bold text-slate-900">{stat.val}</div>
              <div className="text-[10px] text-slate-400">{stat.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
