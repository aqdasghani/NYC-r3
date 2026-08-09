"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Zap,
  BarChart2,
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Target,
  ShieldCheck,
  PlusCircle,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";
import {
  getAIInsights,
  getAIHeatmap,
  getAnalyticsSummary,
  getAIAssociations,
  AIInsight,
  AIHeatmapData,
  ProductMatrixRow,
  AIAssociationData,
} from "@/lib/api";
import { Card, CardHeader, DataTable, type Column, Badge, KpiCard, EmptyState, Button, Tabs, type TabItem } from "@/components/ui";
import { formatINR, formatCompactINR } from "@/lib/utils";

const BADGE_TONES: Record<string, "danger" | "warning" | "info" | "success"> = {
  "DO NOW": "danger",
  "DO TODAY": "warning",
  "WATCH": "info",
  "OPPORTUNITY": "success",
};

const CLASS_BADGES: Record<string, { label: string; tone: "brand" | "success" | "warning" | "danger" | "info" | "neutral" }> = {
  "HIGH DEMAND": { label: "High Demand", tone: "warning" },
  "MEDIUM DEMAND": { label: "Medium Demand", tone: "success" },
  "LOW DEMAND": { label: "Low Demand", tone: "info" },
  "DECLINING": { label: "Declining", tone: "danger" },
  "DEAD": { label: "Dead", tone: "neutral" },
  "RISKY": { label: "Risky", tone: "warning" },
  "UNKNOWN": { label: "Unknown", tone: "neutral" },
};

function InsightCard({ insight }: { insight: AIInsight }) {
  const [expanded, setExpanded] = useState(false);
  const isDoNow = insight.badge === "DO NOW";
  const badgeTone = BADGE_TONES[insight.badge] ?? "neutral";

  return (
    <Card className={isDoNow ? "border-danger/30 bg-danger-soft/20" : ""}>
      <div className="flex justify-between items-start mb-3">
        <h4 className="font-bold text-sm text-ink flex items-center gap-2">
          {isDoNow && <AlertTriangle className="w-4 h-4 text-danger" />}
          {insight.title}
        </h4>
        <Badge tone={badgeTone}>{insight.badge}</Badge>
      </div>

      {Object.keys(insight.evidence).length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {Object.entries(insight.evidence).map(([k, v]) => (
            <div key={k} className="rounded-lg border border-line bg-subtle p-2 text-center">
              <div className="text-[10px] text-muted uppercase tracking-wider mb-0.5">{k.replace("_", " ")}</div>
              <div className="text-xs font-bold text-ink">{v}</div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted mb-3 border-l-2 border-brand pl-2.5">
        <span className="font-semibold text-brand">Action:</span> {insight.recommendation}
      </p>

      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full py-1.5 flex items-center justify-center gap-1 text-[11px] font-semibold text-muted hover:text-ink bg-subtle hover:bg-subtle/80 rounded-lg transition-colors"
      >
        {expanded ? "Hide Explanation" : "Why this action?"} {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-line space-y-2 text-xs text-dim leading-relaxed">
          <p>{insight.why}</p>
          <div className="flex gap-2 pt-1">
            <div className="flex items-center gap-1 text-[10px] font-medium text-dim bg-subtle px-2 py-0.5 rounded border border-line">
              <Target className="w-3 h-3 text-info" />
              {insight.confidence}% Confidence
            </div>
            <div className="flex items-center gap-1 text-[10px] font-medium text-dim bg-subtle px-2 py-0.5 rounded border border-line">
              <ShieldCheck className="w-3 h-3 text-success" />
              {insight.dataQuality} Data Quality
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function AIIntelligencePage() {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [heatmap, setHeatmap] = useState<AIHeatmapData | null>(null);
  const [matrix, setMatrix] = useState<ProductMatrixRow[]>([]);
  const [associations, setAssociations] = useState<AIAssociationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const ins = await getAIInsights().catch(() => []);
        setInsights(ins);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }

      // Background loading for matrix, heatmap, associations
      getAnalyticsSummary().then((mat) => setMatrix(mat)).catch(() => {});
      getAIHeatmap().then((hm) => setHeatmap(hm)).catch(() => {});
      getAIAssociations().then((assoc) => setAssociations(assoc)).catch(() => {});
    }
    load();
  }, []);

  const [activeTab, setActiveTab] = useState<string>("insights");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-muted gap-2">
        <Zap className="w-6 h-6 text-brand animate-pulse" />
        <span className="text-sm font-semibold">Loading Intelligence Engine...</span>
      </div>
    );
  }

  const crossSell = associations?.cross_sell_opportunities || [];

  const tabs: TabItem[] = [
    { key: "insights", label: "Insights" },
    { key: "matrix", label: "Product Matrix" },
    { key: "associations", label: "Cross-Sell" },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Sub-Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-soft flex items-center justify-center">
            <Zap className="w-5 h-5 text-brand" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-ink">Green Quant AI Engine</h1>
            <p className="mt-0.5 text-sm text-muted">Pure mathematical analytics & anti-hallucination retail AI</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 bg-surface p-1 rounded-lg border border-line self-start md:self-auto text-xs font-semibold">
          <Link href="/dashboard/intelligence" className="px-3 py-1.5 rounded-md bg-brand text-white shadow-sm">
            Overview
          </Link>
          <Link href="/dashboard/intelligence/copilot" className="px-3 py-1.5 rounded-md text-muted hover:text-ink hover:bg-subtle flex items-center gap-1.5 transition-colors">
            <Activity className="w-3.5 h-3.5 text-brand" /> AI Copilot
          </Link>
          <Link href="/dashboard/intelligence/heatmap" className="px-3 py-1.5 rounded-md text-muted hover:text-ink hover:bg-subtle flex items-center gap-1.5 transition-colors">
            <BarChart2 className="w-3.5 h-3.5 text-warning" /> 24H Heatmap
          </Link>
        </div>
      </div>

      {/* Tab Navigation for Sections */}
      <Tabs items={tabs} active={activeTab} onChange={setActiveTab} />

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === "insights" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
                <Zap className="w-4 h-4 text-warning" /> Live AI Insights & Action Inbox
              </h2>
              <span className="text-xs text-muted">{insights.length} total active signals</span>
            </div>

            {insights.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<Zap className="h-12 w-12 text-brand/50" />}
                  title="No signals detected yet"
                  description="Your store currently has no registered products or sales. Add catalog items or record POS sales to trigger automated velocity, expiry, and demand signals."
                  action={
                    <div className="flex items-center justify-center gap-3">
                      <Button onClick={() => window.location.href = "/dashboard/products"}>
                        <PlusCircle className="w-4 h-4" /> Add Products
                      </Button>
                      <Button variant="outline" onClick={() => window.location.href = "/dashboard/sales"}>
                        <ShoppingBag className="w-4 h-4" /> Open POS
                      </Button>
                    </div>
                  }
                />
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {["DO NOW", "DO TODAY", "WATCH", "OPPORTUNITY"].map((badgeType) => {
                  const sectionInsights = insights.filter((i) => i.badge === badgeType);
                  const badgeTone = BADGE_TONES[badgeType] ?? "neutral";
                  return (
                    <div key={badgeType} className="space-y-3">
                      <Badge tone={badgeTone} className="w-full text-center py-1.5 text-[11px]">
                        {badgeType} ({sectionInsights.length})
                      </Badge>
                      <div className="space-y-3">
                        {sectionInsights.map((insight) => (
                          <InsightCard key={insight.id} insight={insight} />
                        ))}
                        {sectionInsights.length === 0 && (
                          <Card className="border-dashed border-line/50">
                            <EmptyState
                              title={`No ${badgeType.toLowerCase()} actions`}
                              description="All clear for this priority level."
                              icon={<ShieldCheck className="h-8 w-8 text-success/50" />}
                            />
                          </Card>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "matrix" && (
          <Card>
            <CardHeader
              title="Product Classification Matrix"
              description="Pure math categorization based on 30-day velocity, trend, coverage, and margin"
              actions={
                <Link href="/dashboard/products" className="text-sm font-medium text-brand hover:underline">
                  View All Products →
                </Link>
              }
            />
            {matrix.length === 0 ? (
              <EmptyState
                title="No products found"
                description="Create catalog products to populate velocity analytics."
                icon={<BarChart2 className="h-12 w-12 text-muted/50" />}
              />
            ) : (
              <DataTable<ProductMatrixRow>
                columns={[
                  { key: "productName", header: "Product Name", sortValue: (r) => r.productName, render: (r) => <span className="font-medium text-ink">{r.productName}</span> },
                  {
                    key: "classification",
                    header: "Classification",
                    sortValue: (r) => r.classification,
                    render: (r) => {
                      const cls = CLASS_BADGES[r.classification] ?? { label: r.classification, tone: "neutral" };
                      return <Badge tone={cls.tone}>{cls.label}</Badge>;
                    },
                  },
                  { key: "velocity", header: "Velocity (Units/Day)", align: "right", sortValue: (r) => r.velocity, render: (r) => <span className="font-mono font-semibold text-ink">{r.velocity}</span> },
                  {
                    key: "trend",
                    header: "30-Day Trend",
                    align: "right",
                    sortValue: (r) => parseFloat(r.trend.replace(/[+%]/g, "")) || 0,
                    render: (r) => (
                      <span className="font-mono font-semibold" style={{ color: r.trend.startsWith("+") ? "var(--color-success)" : r.trend.startsWith("-") ? "var(--color-danger)" : "var(--color-muted)" }}>
                        {r.trend}
                      </span>
                    ),
                  },
                  { key: "coverage", header: "Stock Coverage", align: "right", sortValue: (r) => r.coverage ?? 0, render: (r) => <span className="font-mono text-dim">{r.coverage != null ? `${r.coverage} Days` : "—"}</span> },
                  { key: "margin", header: "Margin %", align: "right", sortValue: (r) => r.margin, render: (r) => <span className="font-mono text-dim">{r.margin}%</span> },
                ]}
                rows={matrix}
                rowKey={(r) => r.productName}
                searchText={(r) => r.productName}
                searchPlaceholder="Search products..."
              />
            )}
          </Card>
        )}

        {activeTab === "associations" && (
          <Card>
            <CardHeader
              title="Behavioral Association & Cross-Sell Pairs"
              description="Co-occurrence market basket analysis derived from POS receipt clusters"
            />
            {crossSell.length === 0 ? (
              <EmptyState
                title="No associations yet"
                description="Associations build automatically as multi-item POS sales are registered."
                icon={<Activity className="h-12 w-12 text-muted/50" />}
              />
            ) : (
              <DataTable<AIAssociationData["cross_sell_opportunities"][0]>
                columns={[
                  {
                    key: "pair",
                    header: "Product Pair",
                    sortValue: (r) => r.trigger_product,
                    render: (r) => <span className="font-medium text-ink">{r.trigger_product} → {r.suggested_product}</span>,
                  },
                  { key: "interpretation", header: "Insight", sortValue: (r) => r.interpretation, render: (r) => <span className="text-dim">{r.interpretation}</span> },
                  { key: "lift", header: "Lift", align: "right", sortValue: (r) => r.lift, render: (r) => <span className="font-mono font-bold text-info">{r.lift}x</span> },
                ]}
                rows={crossSell}
                rowKey={(r) => `${r.trigger_product}-${r.suggested_product}`}
                searchText={(r) => `${r.trigger_product} ${r.suggested_product}`}
                searchPlaceholder="Search associations..."
              />
            )}
          </Card>
        )}
      </div>
    </div>
  );
}