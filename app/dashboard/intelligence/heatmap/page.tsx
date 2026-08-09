"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Clock, Activity, Zap, ArrowLeft, RefreshCw, BarChart2, Flame } from "lucide-react";
import { getAIHeatmap, AIHeatmapData } from "@/lib/api";
import { Card, CardHeader, KpiCard, Badge, EmptyState, Button } from "@/components/ui";

export default function BehavioralHeatmapPage() {
  const [heatmap, setHeatmap] = useState<AIHeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState<{ product: string; hour: string; count: number } | null>(null);

  const fetchHeatmapData = async () => {
    setLoading(true);
    try {
      const data = await getAIHeatmap();
      setHeatmap(data);
    } catch (err) {
      console.error("Failed to load behavioral heatmap", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHeatmapData();
  }, []);

  const getCellBg = (count: number, maxCount: number) => {
    if (count === 0) return "bg-subtle border-line text-muted";
    const ratio = count / (maxCount || 1);
    if (ratio > 0.75) return "bg-warning-soft border-warning/30 text-warning font-extrabold shadow-xs";
    if (ratio > 0.4) return "bg-success-soft border-brand/30 text-brand font-bold shadow-xs";
    return "bg-brand-soft border-brand/20 text-brand font-medium";
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-muted space-y-3">
        <Zap className="w-8 h-8 text-brand animate-pulse" />
        <span className="text-sm font-semibold">Computing Time × Product Heatmap Matrix...</span>
      </div>
    );
  }

  const products = heatmap?.products || [];
  const hours = heatmap?.hours || Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}:00`);
  const cells = heatmap?.data || [];

  let maxCount = 0;
  cells.forEach((row) => {
    row.forEach((val) => {
      if (val > maxCount) maxCount = val;
    });
  });

  const hourTotals = Array.from({ length: 24 }, (_, hIdx) => {
    return cells.reduce((sum, row) => sum + (row[hIdx] || 0), 0);
  });
  const peakHourIdx = hourTotals.indexOf(Math.max(...hourTotals, 0));

  const formatHour = (idx: number) => `${idx.toString().padStart(2, "0")}:00`;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Navigation Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/intelligence"
            className="p-2 rounded-lg bg-surface border border-line text-muted hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-ink flex items-center gap-2">
              Time × Product Heatmap <Flame className="w-5 h-5 text-warning" />
            </h1>
            <p className="mt-0.5 text-sm text-muted">24-hour purchasing velocity matrix derived directly from registered Sale records</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 bg-surface p-1 rounded-lg border border-line self-start md:self-auto text-xs font-semibold">
          <Link href="/dashboard/intelligence" className="px-3 py-1.5 rounded-md text-muted hover:text-ink hover:bg-subtle transition-colors">
            Overview
          </Link>
          <Link href="/dashboard/intelligence/copilot" className="px-3 py-1.5 rounded-md text-muted hover:text-ink hover:bg-subtle flex items-center gap-1.5 transition-colors">
            <Activity className="w-3.5 h-3.5 text-brand" /> AI Copilot
          </Link>
          <Link href="/dashboard/intelligence/heatmap" className="px-3 py-1.5 rounded-md bg-brand text-white shadow-sm flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-white" /> 24H Heatmap
          </Link>
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          label="Peak Sales Hour"
          value={products.length > 0 && peakHourIdx >= 0 ? `${formatHour(peakHourIdx)} - ${formatHour((peakHourIdx + 1) % 24)}` : "No Activity"}
          sub="Highest combined hourly sales volume"
          icon={<Clock className="w-4 h-4" />}
        />
        <KpiCard
          label="Tracked Products"
          value={`${products.length} Products`}
          sub="Top velocity SKUs in store"
          icon={<BarChart2 className="w-4 h-4" />}
        />
        <KpiCard
          label="Max Single Bucket"
          value={`${maxCount} Units`}
          sub="Peak single product-hour count"
          icon={<Activity className="w-4 h-4" />}
        />
      </div>

      {/* Main Heatmap Matrix Container */}
      <Card>
        <CardHeader
          title="Hourly Purchasing Heatmap Matrix"
          description="Unit velocity by 24-hour time slots derived strictly from database sales logs."
        />

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted mb-4 pb-4 border-b border-line">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-subtle border border-line" /> 0
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-brand-soft border border-brand/20" /> Low
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-success-soft border border-brand/30" /> High
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-warning-soft border border-warning/30" /> Peak
          </div>
        </div>

        {products.length === 0 ? (
          <EmptyState
            title="No sales activity recorded"
            description="As sales occur via the POS terminal, hourly purchasing patterns will populate this matrix automatically."
            icon={<Activity className="h-12 w-12 text-muted/50" />}
            action={
              <Button onClick={() => window.location.href = "/dashboard/sales"}>
                Open POS Terminal
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto pb-4">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-line text-[10px] font-semibold uppercase tracking-wide text-muted">
                  <th className="py-3 px-4 w-48 sticky left-0 bg-surface z-10 border-r border-line">Product Name</th>
                  {hours.map((h, i) => (
                    <th key={i} className={`py-3 px-1 text-center font-mono w-10 ${i === peakHourIdx ? "text-warning font-extrabold" : ""}`}>
                      {h.split(":")[0]}h
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle text-xs">
                {products.map((prod, pIdx) => (
                  <tr key={pIdx} className="hover:bg-subtle/50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-ink sticky left-0 bg-surface z-10 border-r border-line truncate max-w-[180px]">
                      {prod.name}
                    </td>
                    {hours.map((h, hIdx) => {
                      const count = cells[pIdx]?.[hIdx] || 0;
                      const bgClass = getCellBg(count, maxCount);
                      return (
                        <td
                          key={hIdx}
                          onClick={() => setSelectedCell({ product: prod.name, hour: h, count })}
                          className="p-1 text-center cursor-pointer"
                        >
                          <div className={`w-8 h-8 mx-auto rounded-lg border flex items-center justify-center text-[10px] transition-transform hover:scale-110 ${bgClass}`}>
                            {count > 0 ? count : ""}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedCell && (
          <div className="mt-4 p-3.5 rounded-lg bg-brand-soft border border-brand/30 flex items-center justify-between text-xs animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="font-bold text-brand">{selectedCell.product}</span>
              <span className="text-muted">at {selectedCell.hour}:</span>
              <span className="font-bold text-ink">{selectedCell.count} units sold</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedCell(null)}>
              Close
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}