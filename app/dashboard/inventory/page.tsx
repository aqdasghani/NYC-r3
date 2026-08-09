"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PackageSearch, Clock, Plus, RefreshCw, CheckCircle2 } from "lucide-react";
import { getInventory, getKPIs, getStockHealth } from "@/lib/api";
import { apiFetch } from "@/lib/api-client";
import { subscribeLive } from "@/lib/live";
import type { InventoryItem, KPI, StockHealthSegment } from "@/lib/types";
import { formatINR } from "@/lib/utils";
import { Button, Card, CardHeader, DataTable, type Column, KpiCard, StatusBadge } from "@/components/ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const STATUS_LABELS: Record<string, string> = {
  CRITICAL: "Critical (0-3d)",
  WARNING: "Warning (4-15d)",
  UPCOMING: "Upcoming (16-30d)",
  SAFE: "Safe (30d+)",
  DEAD_STOCK: "Dead Stock",
  OVERSTOCK: "Overstock",
};

interface ReorderRow {
  product_name?: string;
  current_stock?: number;
  velocity_per_day?: number;
  days_until_stockout?: number;
  suggested_order_qty?: number;
  [key: string]: unknown;
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [stockHealth, setStockHealth] = useState<StockHealthSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [atRisk, setAtRisk] = useState<any[]>([]);
  const [deadStockData, setDeadStockData] = useState<any[]>([]);
  const [reorderSuggestions, setReorderSuggestions] = useState<ReorderRow[]>([]);
  const [intelligenceLoading, setIntelligenceLoading] = useState(true);

  async function fetchWithAuth(path: string) {
    try {
      return await apiFetch<any>(path);
    } catch {
      return [];
    }
  }

  const load = async () => {
    setLoading(true);
    const [inv, kpiData, health] = await Promise.all([getInventory(), getKPIs(), getStockHealth()]);
    setInventory(inv);
    setKpis(kpiData);
    setStockHealth(health);
    setLoading(false);

    setIntelligenceLoading(true);
    try {
      const [ar, ds, rs] = await Promise.all([
        fetchWithAuth("/api/inventory/at-risk"),
        fetchWithAuth("/api/inventory/dead-stock"),
        fetchWithAuth("/api/inventory/reorder-suggestions"),
      ]);
      setAtRisk(ar.items || ar || []);
      setDeadStockData(ds.items || ds || []);
      setReorderSuggestions(rs.items || rs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIntelligenceLoading(false);
    }
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
    { label: "At-Risk Batches", value: String(inventory.length) },
    { label: "Units at Risk", value: totalQty.toLocaleString("en-IN") },
    { label: "Value at Risk", value: formatINR(kpiValue("at_risk")) },
    { label: "Critical Expiry", value: String(criticalCount) },
    { label: "Dead Stock", value: String(deadStock) },
  ];

  const nearExpiryCount = atRisk.filter((i) => i.days_remaining >= 0 && i.days_remaining <= 15).length;
  const expiredCount = atRisk.filter((i) => i.days_remaining < 0).length;
  const healthyStockCount = inventory.length - nearExpiryCount - expiredCount - deadStockData.length;
  const overstockCount = inventory.filter((i) => i.product.status === "OVERSTOCK").length;
  const lowStockCount = inventory.filter((i) => (i.product.velocityPerDay * 7) >= i.batch.qty).length;

  const healthCards = [
    { label: "Healthy Stock", value: Math.max(0, healthyStockCount), tone: "text-brand" as const },
    { label: "Low Stock", value: lowStockCount, tone: "text-warning" as const },
    { label: "Near Expiry", value: nearExpiryCount, tone: "text-warning" as const },
    { label: "Overstock", value: overstockCount, tone: "text-info" as const },
    { label: "Dead Stock", value: deadStockData.length, tone: "text-muted" as const },
    { label: "Expired", value: expiredCount, tone: "text-danger" as const },
  ];

  const columns: Column<InventoryItem>[] = [
    {
      key: "product",
      header: "Product",
      sortValue: (r) => r.product.name,
      render: (r) => (
        <div>
          <div className="font-medium text-ink">{r.product.name}</div>
          <div className="text-xs text-muted">
            Batch: {r.batch.batchCode || "—"} · {r.product.sku || "No SKU"}
          </div>
        </div>
      ),
    },
    {
      key: "stock",
      header: "Stock / Velocity",
      align: "right",
      sortValue: (r) => r.batch.qty,
      render: (r) => (
        <div>
          <div className="text-ink">{r.batch.qty} units</div>
          <div className="text-xs text-muted">{r.product.velocityPerDay.toFixed(1)}/day</div>
        </div>
      ),
    },
    {
      key: "expiry",
      header: "Expiry",
      align: "right",
      sortValue: (r) => r.expiryDays,
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Clock className="h-3 w-3 text-muted" />
          <span className={r.expiryDays <= 3 ? "text-danger" : r.expiryDays <= 15 ? "text-warning" : "text-dim"}>
            {r.expiryDays}d · {r.batch.expiryDate}
          </span>
        </div>
      ),
    },
    {
      key: "risk",
      header: "Risk Value",
      align: "right",
      sortValue: (r) => r.riskValue,
      render: (r) => <span className="font-medium text-ink">{r.riskValue ? formatINR(r.riskValue) : "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => r.product.status,
      render: (r) => (
        <StatusBadge status={r.product.status} label={STATUS_LABELS[r.product.status] ?? undefined} />
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Inventory & Expiry</h1>
          <p className="mt-1 text-sm text-muted">Stock expiring within 15 days, flagged by the detection engine.</p>
        </div>
        <Link
          href="/dashboard/scanner"
          className="inline-flex h-9 items-center gap-2 rounded-md bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-strong"
        >
          <Plus className="h-4 w-4" /> Add via Receiving
        </Link>
      </div>

      {/* Health grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {healthCards.map((c) => (
          <div key={c.label} className="rounded-lg border border-line bg-surface p-4 shadow-card">
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted">{c.label}</div>
            <div className={`mt-2 text-2xl font-semibold ${c.tone}`}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Reorder suggestions */}
      <Card noPadding>
        <CardHeader title="Reorder Suggestions" className="border-b border-line px-4 py-3" />
        {intelligenceLoading ? (
          <div className="py-8 text-center text-sm text-muted">Loading suggestions…</div>
        ) : reorderSuggestions.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm font-medium text-brand">
            <CheckCircle2 className="h-4 w-4" /> All products are well-stocked
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-elevated">
                  {["Product", "Stock", "Velocity", "Days Until Stockout", "Suggested Order Qty"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {reorderSuggestions.map((item, idx) => (
                  <tr key={idx} className="transition-colors hover:bg-subtle/70">
                    <td className="px-4 py-3 font-medium text-ink">{item.product_name}</td>
                    <td className="px-4 py-3 text-dim">{item.current_stock}</td>
                    <td className="px-4 py-3 text-dim">{item.velocity_per_day}</td>
                    <td className="px-4 py-3 text-dim">{item.days_until_stockout}</td>
                    <td className="px-4 py-3 font-medium text-brand">{item.suggested_order_qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {stats.map((stat, i) => (
          <KpiCard key={i} label={stat.label} value={stat.value} />
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search at-risk products by name or batch…"
            className="h-9 w-full rounded-md border border-line bg-surface pl-3 pr-4 text-sm text-ink placeholder:text-faint transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none"
          />
        </div>
        <Button variant="outline" onClick={() => void load()} title="Refresh" aria-label="Refresh">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Table */}
      <DataTable<InventoryItem>
        columns={columns}
        rows={filtered}
        rowKey={(r) => r.id}
        loading={loading}
        emptyState={
          <div className="py-8 text-center text-sm text-muted">
            {query ? "No matches for that search." : "No stock expiring soon — all clear!"}
          </div>
        }
        rowActions={(r) => (
          <Link href="/dashboard/actions" className="text-sm font-medium text-brand hover:underline">
            {r.aiKind ? "Action" : "View"}
          </Link>
        )}
      />

      {/* Bottom hint */}
      <Card className="flex items-start gap-3 p-4">
        <PackageSearch className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
        <p className="text-sm leading-relaxed text-dim">
          Showing stock expiring within 15 days. The AI detection engine rescans every few minutes —
          run a scan from the{" "}
          <Link href="/dashboard/actions" className="font-medium text-brand hover:underline">AI Action Engine</Link>{" "}
          to refresh recommendations, and use{" "}
          <Link href="/dashboard/scanner" className="font-medium text-brand hover:underline">Smart Receiving</Link>{" "}
          to add new stock.
        </p>
      </Card>
    </div>
  );
}
