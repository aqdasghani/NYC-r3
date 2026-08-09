"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase, ShoppingBag, AlertTriangle, XCircle, Leaf,
  TrendingUp, Bell, ArrowRightLeft, ShoppingCart, Users, ChevronRight, Package,
  RefreshCw, PlugZap, Lightbulb,
} from "lucide-react";
import {
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { useDashboardData } from "@/lib/hooks/useDashboardData";
import type { Risk } from "@/lib/types";
import { formatINR, formatCompactINR } from "@/lib/utils";
import { Card, CardHeader, KpiCard } from "@/components/ui";
import { chartColors, axisProps, gridProps, ChartTooltip, formatINRAxis } from "@/components/ui/chart-theme";

const INSIGHT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Package,
  TrendingUp,
  Leaf,
};

const TIMELINE_COLORS = ["#b3261e", "#a16207", "#d9a441", "#0fa958", "#157347"];

type Tone = "danger" | "warning" | "info" | "success";

const TONE: Record<Tone, { chip: string; title: string; link: string; border: string }> = {
  danger: {
    chip: "bg-danger-soft text-danger",
    title: "text-danger",
    link: "border-danger/25 bg-danger-soft text-danger hover:bg-danger/10",
    border: "border-t-danger/40",
  },
  warning: {
    chip: "bg-warning-soft text-warning",
    title: "text-warning",
    link: "border-warning/25 bg-warning-soft text-warning hover:bg-warning/10",
    border: "border-t-warning/40",
  },
  info: {
    chip: "bg-info-soft text-info",
    title: "text-info",
    link: "border-info/25 bg-info-soft text-info hover:bg-info/10",
    border: "border-t-info/40",
  },
  success: {
    chip: "bg-brand-soft text-brand-strong",
    title: "text-brand-strong",
    link: "border-brand/25 bg-brand-soft text-brand-strong hover:bg-brand-soft",
    border: "border-t-brand/40",
  },
};

function UrgentActionCard({ risk }: { risk: Risk }) {
  const tone: Tone =
    risk.priority === "URGENT" ? "danger"
    : risk.priority === "ACTION" ? "warning"
    : risk.priority === "REORDER" ? "info"
    : "success";
  const t = TONE[tone];
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface p-3 shadow-card transition-colors hover:border-line-strong">
      <div className="flex min-w-0 items-start gap-3">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${t.chip}`}>
          <Bell className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h4 className="truncate text-xs font-semibold text-ink">{risk.productName} · {risk.tag.toLowerCase()}</h4>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted">{risk.reason}</p>
        </div>
      </div>
      <Link
        href="/dashboard/actions"
        className="shrink-0 whitespace-nowrap rounded-md border px-3 py-1.5 text-[11px] font-semibold transition-colors"
      >
        Take Action
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const { priorities, summary, loading, offline, reload } = useDashboardData();
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    try {
      const authData = localStorage.getItem("greenshop_auth") || localStorage.getItem("Green Quant_auth");
      if (authData) {
        const parsed = JSON.parse(authData);
        if (parsed?.user?.name) setUserName(parsed.user.name.split(" ")[0]);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (loading || !summary) {
    return (
      <div className="space-y-6 pb-12">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Loading live dashboard…</h2>
          <RefreshCw className="h-5 w-5 animate-spin text-muted" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg border border-line bg-subtle" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-lg border border-line bg-subtle" />
      </div>
    );
  }

  const k = summary?.kpis || {
    inventory_value: 480000,
    inventory_value_delta_pct: 4.2,
    product_count: 1284,
    product_count_delta_pct: 12.5,
    at_risk_count: 37,
    at_risk_value: 18420,
    expired_count: 8,
    expired_value: 2160,
    waste_prevented_mtd: 142000,
  };
  const donut = summary?.donut || [];
  const totalProducts = k.product_count || 1284;
  const trend = (summary?.sales_trend || []).map((p) => ({ name: p.date.slice(5), value: p.revenue }));
  const timeline = summary?.expiry_timeline || [];
  const maxTimelineItems = Math.max(1, ...timeline.map((t) => t.items));
  const ai = summary?.ai_priority || {
    sell_first: { products: 12, units: 37, value: 4200 },
    discount: { products: 7, units: 0, value: 2840 },
    transfer: { products: 0, units: 18, value: 3900 },
    reorder: { products: 7, units: 0, value: 0 },
  };
  const brief = summary?.daily_brief || { important_actions: 5, est_impact: 3200, sections: [] };
  const insights = summary?.ai_insights || [];
  const mini = summary?.mini_kpis || { suppliers: 24, purchase_orders: 12, grn_pending: 5, avg_gross_margin: 18.6 };

  const topMetrics = [
    { label: "Total Inventory Value", value: formatCompactINR(k.inventory_value), delta: k.inventory_value_delta_pct, sub: k.inventory_value_delta_pct != null ? "vs last month" : "Live inventory", icon: <Briefcase className="h-4 w-4" /> },
    { label: "Total Products", value: (k.product_count || 0).toLocaleString("en-IN"), delta: k.product_count_delta_pct, sub: k.product_count_delta_pct != null ? "vs last month" : "Registered products", icon: <ShoppingBag className="h-4 w-4" /> },
    { label: "At Risk (Near Expiry)", value: `${k.at_risk_count || 0} Items`, sub: `${formatINR(k.at_risk_value || 0)} value at risk`, icon: <AlertTriangle className="h-4 w-4" /> },
    { label: "Expired Items", value: `${k.expired_count || 0} Items`, sub: `${formatINR(k.expired_value || 0)} loss`, icon: <XCircle className="h-4 w-4" /> },
    { label: "Waste Prevented", value: formatINR(k.waste_prevented_mtd || 0), sub: "This month", icon: <Leaf className="h-4 w-4" /> },
  ];

  const priorityCards: Array<{ title: string; count: string; impact: string; val: string; tone: Tone; icon: React.ComponentType<{ className?: string }> }> = [
    { title: "Sell First", count: `${ai.sell_first.products} Products`, impact: "Potential loss", val: formatINR(ai.sell_first.value), tone: "danger", icon: AlertTriangle },
    { title: "Discount", count: `${ai.discount.products} Products`, impact: "Potential recovery", val: formatINR(ai.discount.value), tone: "warning", icon: TrendingUp },
    { title: "Transfer", count: `${ai.transfer.units} Units`, impact: "Value to transfer", val: ai.transfer.value ? formatINR(ai.transfer.value) : "", tone: "info", icon: ArrowRightLeft },
    { title: "Reorder", count: `${ai.reorder.products} Products`, impact: "Prevent stockout", val: "", tone: "success", icon: ShoppingCart },
  ];

  const miniCards = [
    { label: "Suppliers", val: String(mini.suppliers), sub: "Active Suppliers", icon: Users },
    { label: "Purchase Orders", val: String(mini.purchase_orders), sub: "Pending Orders", icon: ShoppingCart },
    { label: "GRN Pending", val: String(mini.grn_pending), sub: "Needs Approval", icon: Package },
    { label: "Avg. Gross Margin", val: `${mini.avg_gross_margin}%`, sub: "This Month", icon: TrendingUp },
  ];

  return (
    <div className="space-y-6 pb-12">
      {offline && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-warning">
            <PlugZap className="h-4 w-4" />
            Backend offline — dashboard data unavailable. Retry when server is running.
          </div>
          <button
            onClick={reload}
            className="rounded-md border border-warning/30 bg-surface px-3 py-1.5 text-xs font-semibold text-warning transition-colors hover:bg-warning/10"
          >
            Retry
          </button>
        </div>
      )}

      {/* Greeting */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-ink">
          {greeting}{userName ? `, ${userName}` : ""}.
        </h2>
        <p className="mt-0.5 text-sm text-muted">Here&apos;s what needs your attention at the store today.</p>
      </div>

      {/* 1. Top metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {topMetrics.map((m, i) => (
          <KpiCard key={i} {...m} />
        ))}
      </div>

      {/* 2. Middle row: charts + attention */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Inventory Overview" description="Stock health by segment" />
          <div className="flex items-center">
            <div className="relative h-[180px] w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donut} innerRadius={58} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                    {donut.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-xl font-semibold text-ink">{k.product_count.toLocaleString("en-IN")}</div>
                <div className="text-[10px] text-muted">Total Products</div>
              </div>
            </div>
            <ul className="w-1/2 space-y-2 pl-2">
              {donut.map((item, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-1.5 text-dim">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="font-semibold text-ink">
                    {item.value}
                    <span className="ml-1 font-normal text-muted">({((item.value / totalProducts) * 100).toFixed(1)}%)</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader title="Sales Trend" description="Last 30 days" />
          <div className="h-[180px]">
            {trend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="name" {...axisProps} dy={8} interval="preserveStartEnd" />
                  <YAxis {...axisProps} tickFormatter={formatINRAxis} />
                  <Tooltip content={<ChartTooltip formatter={(v) => formatINR(v)} />} />
                  <Line type="monotone" dataKey="value" name="Revenue" stroke={chartColors.brand} strokeWidth={2} dot={{ r: 2.5, fill: chartColors.brand, strokeWidth: 0 }} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted">No sales data yet</div>
            )}
          </div>
        </Card>

        <div className="lg:col-span-1">
          <CardHeader title="Attention Required" actions={<Link href="/dashboard/actions" className="text-xs font-semibold text-info hover:underline">View All</Link>} />
          <div className="space-y-3">
            {priorities.length === 0 ? (
              <Card className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-muted">No urgent actions — all clear!</p>
              </Card>
            ) : (
              priorities.slice(0, 4).map((risk) => <UrgentActionCard key={risk.id} risk={risk} />)
            )}
          </div>
        </div>
      </div>

      {/* 3. Bottom row: actions, timeline, insights, briefing */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-ink">Priority Actions</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {priorityCards.map((action, i) => {
                const t = TONE[action.tone];
                return (
                  <div key={i} className={`flex flex-col justify-between rounded-lg border border-t-2 border-line bg-surface p-4 shadow-card ${t.border}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-md ${t.chip}`}>
                          <action.icon className="h-4 w-4" />
                        </span>
                        <h4 className={`text-sm font-semibold ${t.title}`}>{action.title}</h4>
                      </div>
                      <div className="mt-3 text-sm font-semibold text-ink">{action.count}</div>
                      <div className="mt-2">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">{action.impact}</div>
                        {action.val && <div className="text-lg font-semibold text-ink">{action.val}</div>}
                      </div>
                    </div>
                    <Link href="/dashboard/actions" className={`mt-4 rounded-md border py-1.5 text-center text-xs font-semibold transition-colors ${t.link}`}>
                      View Details
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>

          <Card>
            <CardHeader title="Expiry Timeline" description="Units expiring by bucket" />
            {timeline.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted">No expiry data available</div>
            ) : (
              <div className="space-y-4">
                {timeline.map((row, i) => (
                  <div key={i} className="flex items-center gap-4 text-xs font-medium">
                    <div className="w-24 shrink-0 text-right text-dim">{row.label} Days</div>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-subtle">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(6, Math.round((row.items / maxTimelineItems) * 100))}%`,
                          backgroundColor: TIMELINE_COLORS[i] ?? TIMELINE_COLORS[4],
                        }}
                      />
                    </div>
                    <div className="w-16 shrink-0 text-right text-ink">{row.items} items</div>
                    <div className="w-24 shrink-0 text-right text-muted">{formatINR(row.value)}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">Insights</h3>
              <span className="text-xs text-muted">auto-detected</span>
            </div>
            <div className="space-y-3">
              {insights.length === 0 && (
                <Card className="p-4 text-sm text-muted">No insights yet — the detection engine will surface them here.</Card>
              )}
              {insights.map((insight, i) => {
                const Icon = INSIGHT_ICONS[insight.icon] ?? Lightbulb;
                return (
                  <div key={i} className="rounded-lg border border-line bg-surface p-4 shadow-card">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand-strong">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-ink capitalize">{insight.title.replace(/_/g, " ").toLowerCase()}</h4>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted">{insight.detail}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-line bg-surface p-4 shadow-card">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-soft">
                <Leaf className="h-4 w-4 text-brand" />
              </div>
              <h3 className="text-sm font-semibold text-ink">Today&apos;s Briefing</h3>
            </div>
            <div className="mt-3 space-y-1.5">
              <p className="text-xs text-muted">You have {brief.important_actions} important actions today</p>
              <p className="text-sm font-semibold text-ink">Est. impact: <span className="text-brand-strong">{formatINR(brief.est_impact)}</span> can be saved</p>
            </div>
            <Link href="/dashboard/actions" className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-md border border-line bg-elevated py-2 text-xs font-semibold text-dim transition-colors hover:bg-subtle hover:text-ink">
              View Briefing <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 4. Bottom stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {miniCards.map((stat, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border border-line bg-surface p-4 shadow-card">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-subtle text-dim">
              <stat.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">{stat.label}</div>
              <div className="text-lg font-semibold text-ink">{stat.val}</div>
              <div className="text-[10px] text-muted">{stat.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
