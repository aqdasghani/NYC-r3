"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PackageSearch, Clock, Plus, Search, RefreshCw } from "lucide-react";
import Link from "next/link";
import { getInventory, getKPIs, getStockHealth } from "@/lib/api";
import { subscribeLive } from "@/lib/live";
import type { InventoryItem, KPI, StockHealthSegment } from "@/lib/types";
import { formatINR } from "@/lib/utils";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  CRITICAL: { label: "Critical (0-3d)", cls: "bg-red-500/10 text-red-500 border border-red-500/20" },
  WARNING: { label: "Warning (4-15d)", cls: "bg-orange-500/10 text-orange-500 border border-orange-500/20" },
  UPCOMING: { label: "Upcoming (16-30d)", cls: "bg-blue-500/10 text-blue-500 border border-blue-500/20" },
  SAFE: { label: "Safe (30d+)", cls: "bg-brand-green/10 text-brand-green border border-brand-green/20" },
  DEAD_STOCK: { label: "Dead Stock", cls: "bg-slate-200/50 text-text-secondary border border-slate-300/50" },
  OVERSTOCK: { label: "Overstock", cls: "bg-purple-500/10 text-purple-500 border border-purple-500/20" },
};

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [stockHealth, setStockHealth] = useState<StockHealthSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true);
    const [inv, kpiData, health] = await Promise.all([getInventory(), getKPIs(), getStockHealth()]);
    setInventory(inv);
    setKpis(kpiData);
    setStockHealth(health);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const unsub = subscribeLive((event) => {
      if (event.type === "inventory_updated") void load();
    });
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return inventory;
    return inventory.filter((item) => item.product.name.toLowerCase().includes(q));
  }, [inventory, query]);

  const kpiValue = (id: string) => kpis.find((k) => k.id === id)?.value ?? 0;
  const criticalCount = inventory.filter((i) => i.product.status === "CRITICAL").length;
  const deadStock = stockHealth.find((s) => s.name === "Dead Stock")?.value ?? 0;
  const totalQty = inventory.reduce((sum, i) => sum + i.batch.qty, 0);

  const stats = [
    { label: "At-Risk Batches", value: String(inventory.length), color: "text-orange-500" },
    { label: "Units at Risk", value: totalQty.toLocaleString("en-IN"), color: "text-text-primary" },
    { label: "Value at Risk", value: formatINR(kpiValue("at_risk")), color: "text-red-500" },
    { label: "Critical Expiry", value: String(criticalCount), color: "text-red-500" },
    { label: "Dead Stock", value: String(deadStock), color: "text-slate-500" },
  ];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Inventory & Expiry</h1>
          <p className="text-text-secondary">Stock expiring within 15 days, flagged by the detection engine.</p>
        </div>
        <Link
          href="/dashboard/scanner"
          className="flex items-center gap-2 bg-brand-green text-black px-4 py-2 rounded-lg font-medium hover:bg-brand-green/90 transition-colors shadow-[0_0_15px_rgba(34,197,94,0.3)]"
        >
          <Plus className="w-4 h-4" /> Add via Receiving
        </Link>
      </motion.div>

      {/* Stats row */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="glass-panel p-4 flex flex-col justify-between">
            <span className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">{stat.label}</span>
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </motion.div>

      {/* Toolbar */}
      <motion.div variants={itemVariants} className="flex gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search at-risk products by name or batch…"
            className="w-full bg-bg-surface border border-border-default text-text-primary rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/50 transition-all placeholder:text-text-muted"
          />
        </div>
        <button
          onClick={() => void load()}
          className="glass-panel px-4 py-2 hover:bg-bg-surface/80 transition-colors flex items-center gap-2"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </motion.div>

      {/* Table */}
      <motion.div variants={itemVariants} className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-10 text-center text-text-secondary">Loading inventory…</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-text-secondary">
              {query ? "No matches for that search." : "No stock expiring soon — all clear!"}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-default bg-slate-50">
                  <th className="p-4 text-xs font-medium text-text-secondary uppercase tracking-wider">Product</th>
                  <th className="p-4 text-xs font-medium text-text-secondary uppercase tracking-wider">Stock / Velocity</th>
                  <th className="p-4 text-xs font-medium text-text-secondary uppercase tracking-wider">Expiry</th>
                  <th className="p-4 text-xs font-medium text-text-secondary uppercase tracking-wider">Risk Value</th>
                  <th className="p-4 text-xs font-medium text-text-secondary uppercase tracking-wider">Status</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {filtered.map((item) => {
                  const badge = STATUS_BADGE[item.product.status] ?? STATUS_BADGE.SAFE;
                  return (
                    <tr key={item.id} className="hover:bg-bg-surface/50 transition-colors">
                      <td className="p-4">
                        <div className="font-medium text-text-primary">{item.product.name}</div>
                        <div className="text-xs text-text-muted">
                          Batch: {item.batch.batchCode || "—"} · {item.product.sku || "No SKU"}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-text-primary">{item.batch.qty} units</div>
                        <div className="text-xs text-text-muted">{item.product.velocityPerDay.toFixed(1)}/day</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-text-secondary" />
                          <span className={item.expiryDays <= 3 ? "text-red-400" : item.expiryDays <= 15 ? "text-orange-400" : "text-text-secondary"}>
                            {item.expiryDays}d · {item.batch.expiryDate}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 font-medium text-text-primary">
                        {item.riskValue ? formatINR(item.riskValue) : "—"}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                      </td>
                      <td className="p-4 text-right">
                        <Link href="/dashboard/actions" className="text-sm font-medium text-brand-green hover:text-brand-green/80 transition-colors">
                          {item.aiKind ? "Action" : "View"}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>

      {/* Bottom hint */}
      <motion.div variants={itemVariants} className="glass-panel p-4 flex items-start gap-3 text-sm text-text-secondary">
        <PackageSearch className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
        <p>
          Showing stock expiring within 15 days. The AI detection engine rescans every few minutes —
          run a scan from the{" "}
          <Link href="/dashboard/actions" className="text-brand-green font-medium hover:underline">AI Action Engine</Link>{" "}
          to refresh recommendations, and use{" "}
          <Link href="/dashboard/scanner" className="text-brand-green font-medium hover:underline">Smart Receiving</Link>{" "}
          to add new stock.
        </p>
      </motion.div>
    </motion.div>
  );
}
