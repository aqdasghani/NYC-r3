/**
 * Green Quant AI — typed data-access facade.
 *
 * Components and pages ONLY import from here. Every function calls the real
 * FastAPI backend (`lib/api-client`) and falls back to the local demo dataset
 * (`lib/data`) when the backend is unreachable — so the UI stays usable as a
 * mock prototype even with no server running.
 *
 * Signatures are stable; the mock dataset is the fallback, not the source.
 */
import type {
  AppNotification,
  DashboardData,
  ExecutedAction,
  ExpiryTimelineBucket,
  FeaturedRisk,
  InventoryItem,
  KPI,
  Recommendation,
  RecommendationKind,
  Risk,
  SalesTrendPoint,
  ScoreData,
  StockHealthSegment,
  Transaction,
} from "@/lib/types";
import type {
  ActionOut,
  AtRiskItem,
  ConfirmReceiptResponse,
  DashboardSummary,
  ExtractedItem,
  GreenScoreHistoryPoint,
  GreenScoreOut,
  PosSaleResponse,
  ProductOut,
  ScanInvoiceResponse,
  SupplierOut,
  WastePreventedSeries,
} from "@/lib/backend-types";
import { apiFetch, apiUpload, ensureAuth } from "@/lib/api-client";
import {
  featuredRisk as mockFeaturedRisk,
  inventory as mockInventory,
  kpis as mockKpis,
  notifications as mockNotifications,
  priorities as mockPriorities,
  recentActions as mockRecentActions,
  recommendations as mockRecommendations,
  scoreData as mockScoreData,
} from "@/lib/data";

// ================================================================ mappers

function sparkFrom(value: number): number[] {
  const base = value || 1;
  return [0.9, 0.92, 0.94, 0.95, 0.97, 0.985, 1].map((k) =>
    Math.round(base * k * 100) / 100
  );
}

function kpiFromSummary(summary: DashboardSummary): KPI[] {
  const k = summary.kpis;
  return [
    {
      id: "inv_value",
      label: "Inventory Value",
      value: k.inventory_value,
      unit: "inr",
      deltaPct: k.inventory_value_delta_pct,
      spark: sparkFrom(k.inventory_value),
      icon: "📦",
      accent: "accent",
    },
    {
      id: "total_products",
      label: "Total Products",
      value: k.product_count,
      unit: "number",
      deltaPct: k.product_count_delta_pct,
      spark: sparkFrom(k.product_count),
      icon: "🏷️",
      accent: "ink",
    },
    {
      id: "at_risk",
      label: "At Risk",
      value: k.at_risk_value,
      unit: "inr",
      deltaPct: 0,
      spark: sparkFrom(k.at_risk_value),
      icon: "⚠️",
      accent: "warning",
    },
    {
      id: "waste_prevented",
      label: "Waste Prevented",
      value: k.waste_prevented_mtd,
      unit: "inr",
      deltaPct: 0,
      spark: sparkFrom(k.waste_prevented_mtd),
      icon: "🌱",
      accent: "safe",
    },
  ];
}

const SEVERITY_TO_STATUS: Record<string, import("./types").StockStatus> = {
  CRITICAL: "CRITICAL",
  WARNING: "WARNING",
  UPCOMING: "UPCOMING",
  SAFE: "SAFE",
  DEAD_STOCK: "DEAD_STOCK",
  OVERSTOCK: "OVERSTOCK",
};

function riskTypeToKind(riskType: string): RecommendationKind {
  const t = riskType.toLowerCase();
  if (t.includes("overstock")) return "TRANSFER";
  if (t.includes("dead")) return "SUPPLIER_RETURN";
  if (t.includes("stockout") || t.includes("demand")) return "SUPPLIER_RETURN";
  return "DISCOUNT";
}

function actionTypeToKind(action: string | undefined): RecommendationKind {
  switch (action) {
    case "TRANSFER":
      return "TRANSFER";
    case "RETURN":
      return "SUPPLIER_RETURN";
    case "REORDER":
      return "SUPPLIER_RETURN";
    case "DISCOUNT":
    default:
      return "DISCOUNT";
  }
}

function actionToRisk(a: ActionOut): Risk {
  const top = a.recommendations?.[0];
  const kind = actionTypeToKind(top?.action_type);
  const critical = a.severity === "CRITICAL";
  const priority: Risk["priority"] =
    kind === "TRANSFER"
      ? "TRANSFER"
      : kind === "SUPPLIER_RETURN"
        ? "REORDER"
        : critical
          ? "URGENT"
          : "ACTION";
  const tag =
    kind === "TRANSFER"
      ? "MOVE STOCK"
      : kind === "SUPPLIER_RETURN"
        ? "PROCUREMENT"
        : critical
          ? "SELL FIRST"
          : "APPLY DISCOUNTS";
  return {
    id: a.id,
    productId: a.product_id,
    productName: a.product_name,
    batchCode: a.batch_number ?? "",
    priority,
    tag,
    reason: top?.reasoning ?? a.risk_type,
    riskValue: a.value_at_risk ?? 0,
    daysToExpiry: 0,
    suggestedAction: top?.reasoning ?? `${a.risk_type} — take action`,
  };
}

function actionToRecommendation(a: ActionOut): Recommendation {
  const top = a.recommendations?.[0];
  const kind = actionTypeToKind(top?.action_type);
  const label =
    kind === "DISCOUNT"
      ? "Discount"
      : kind === "TRANSFER"
        ? "Transfer"
        : "Procure / return";
  const units =
    typeof top?.params?.units === "number"
      ? top.params.units
      : typeof top?.params?.percent_units === "number"
        ? Math.round((top.params.percent_units as number) / 100 * 100)
        : 0;
  return {
    id: a.id,
    kind,
    title: `${label} ${a.product_name}`,
    description: top?.reasoning ?? a.risk_type,
    unitsCleared: units,
    valueImpact: a.value_at_risk ?? 0,
    confidence: top?.confidence ?? 80,
  };
}

function actionToExecuted(a: ActionOut): ExecutedAction {
  return {
    id: a.id,
    kind: actionTypeToKind(a.recommendations?.[0]?.action_type),
    productName: a.product_name,
    valueSaved: a.value_at_risk ?? 0,
    scoreImpact: 1,
    status: "success",
    executedAt: a.created_at,
  };
}

function actionToNotification(a: ActionOut): AppNotification {
  const top = a.recommendations?.[0];
  return {
    id: a.id,
    title: `${a.risk_type} · ${a.product_name}`,
    body:
      top?.reasoning ??
      (a.value_at_risk ? `₹${a.value_at_risk.toLocaleString("en-IN")} at risk` : "Take action"),
    type: a.severity === "CRITICAL" ? "danger" : "info",
    read: false,
    createdAt: a.created_at,
  };
}

function atRiskToInventory(item: AtRiskItem): InventoryItem {
  const unitPrice =
    item.quantity > 0 && item.value_at_risk ? item.value_at_risk / item.quantity : 0;
  return {
    id: item.batch_id,
    product: {
      id: item.product_id,
      sku: "",
      name: item.product_name,
      brand: "",
      category: "",
      unit: "unit",
      unitPrice,
      status: SEVERITY_TO_STATUS[item.severity] ?? "SAFE",
      currentQty: item.quantity,
      reorderPoint: 0,
      velocityPerDay: item.velocity,
    },
    batch: {
      id: item.batch_id,
      productId: item.product_id,
      batchCode: item.batch_number ?? "",
      receivedAt: "",
      qty: item.quantity,
      expiryDate: item.expiry_date,
    },
    expiryDays: item.days_remaining,
    estLeftover: item.expected_leftover,
    riskValue: item.value_at_risk ?? 0,
    aiKind: item.severity === "CRITICAL" ? "DISCOUNT" : item.severity === "WARNING" ? "DISCOUNT" : null,
  };
}

function greenScoreToScoreData(gs: GreenScoreOut, delta: number): ScoreData {
  return {
    score: gs.score,
    delta,
    categories: [
      {
        id: "expiry_prevention",
        label: "Expiry Prevention",
        value: gs.expiry_score,
        weight: 0.3,
        tint: "accent",
      },
      {
        id: "inventory_eff",
        label: "Inventory Eff.",
        value: gs.inventory_score,
        weight: 0.3,
        tint: "info",
      },
      {
        id: "dead_stock",
        label: "Dead Stock",
        value: gs.dead_stock_score,
        weight: 0.2,
        tint: "warning",
      },
      {
        id: "waste_prevention",
        label: "Waste Prevented",
        value: gs.waste_score,
        weight: 0.2,
        tint: "safe",
      },
    ],
  };
}

// ================================================================ helpers

/**
 * Run a live backend call, falling back to `fallback` when auth or the request
 * fails (backend down, 5xx, network error). Keeps the UI functional as a demo.
 */
async function liveOr<T>(live: () => Promise<T>, fallback: () => T): Promise<T> {
  try {
    if (!(await ensureAuth())) return fallback();
    return await live();
  } catch {
    return fallback();
  }
}

async function fetchPendingActions(): Promise<ActionOut[]> {
  return apiFetch<ActionOut[]>("/api/actions/?status=PENDING");
}

async function fetchGreenScore(): Promise<ScoreData> {
  const [current, history] = await Promise.all([
    apiFetch<GreenScoreOut>("/api/green-score/current"),
    apiFetch<GreenScoreHistoryPoint[]>("/api/green-score/history?days=30"),
  ]);
  const delta = history.length > 1 ? Math.round(history[history.length - 1].score - history[0].score) : 0;
  return greenScoreToScoreData(current, delta);
}

// =============================================================== dashboard

export async function getDashboardData(): Promise<DashboardData> {
  return liveOr(
    async () => {
      const summary = await apiFetch<DashboardSummary>("/api/analytics/dashboard");
      const pending = summary.urgent_actions.length
        ? summary.urgent_actions.map(actionToRisk)
        : (await fetchPendingActions()).map(actionToRisk);
      const score = await fetchGreenScore();
      return { kpis: kpiFromSummary(summary), priorities: pending, score };
    },
    () => ({ kpis: mockKpis, priorities: mockPriorities, score: mockScoreData })
  );
}

/** Offline-safe reconstruction of the backend aggregate from the demo dataset. */
function mockDashboardSummary(): DashboardSummary {
  const inv = mockKpis[0];
  const products = mockKpis[1];
  const atRisk = mockKpis[2];
  const waste = mockKpis[3];
  const s = mockScoreData;
  return {
    kpis: {
      inventory_value: inv.value,
      inventory_value_delta_pct: inv.deltaPct,
      product_count: products.value,
      product_count_delta_pct: products.deltaPct,
      at_risk_count: 37,
      at_risk_value: atRisk.value,
      expired_count: 8,
      expired_value: 2160,
      waste_prevented_mtd: waste.value,
    },
    donut: [
      { name: "Good Stock", value: 1012, color: "#10B981" },
      { name: "Near Expiry", value: 37, color: "#F59E0B" },
      { name: "Expired", value: 8, color: "#EF4444" },
      { name: "Low Stock", value: 21, color: "#3B82F6" },
      { name: "Overstock", value: 14, color: "#111827" },
      { name: "Dead Stock", value: 192, color: "#6B7280" },
    ],
    sales_trend: [],
    expiry_timeline: [],
    urgent_actions: [],
    ai_priority: {
      sell_first: { products: 12, units: 37, value: 4200 },
      discount: { products: 7, units: 0, value: 2840 },
      transfer: { products: 0, units: 18, value: 3900 },
      reorder: { products: 7, units: 0, value: 0 },
    },
    ai_insights: [
      { title: "OVERSTOCK_DETECTED", detail: "5.8 months inventory. Reduce next purchase.", icon: "Package" },
      { title: "DEMAND_SPIKE", detail: "Lays sales +37% this week.", icon: "TrendingUp" },
      { title: "WASTE_PRV", detail: "Prevented ₹7,240 potential waste.", icon: "Leaf" },
    ],
    mini_kpis: { suppliers: 24, purchase_orders: 12, grn_pending: 5, avg_gross_margin: 18.6 },
    green_score: {
      score: s.score,
      expiry_score: s.categories[0]?.value ?? s.score,
      inventory_score: s.categories[1]?.value ?? s.score,
      dead_stock_score: s.categories[2]?.value ?? s.score,
      waste_score: s.categories[3]?.value ?? s.score,
      breakdown: s.categories.map((c) => ({ name: c.label, weight: c.weight, value: c.value, note: "" })),
      period_date: new Date().toISOString().slice(0, 10),
    },
    daily_brief: {
      important_actions: 5,
      est_impact: 3200,
      sections: [
        { title: "Urgent", count: 2 },
        { title: "Action", count: 5 },
        { title: "Procurement", count: 1 },
        { title: "Sustainability", count: 7240 },
      ],
    },
  };
}

/** Full backend aggregate (donut, trend, timeline, priorities, insights, brief). */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  return liveOr(
    () => apiFetch<DashboardSummary>("/api/analytics/dashboard"),
    mockDashboardSummary
  );
}

export async function getKPIs(): Promise<KPI[]> {
  return liveOr(
    async () => {
      const summary = await apiFetch<DashboardSummary>("/api/analytics/dashboard");
      return kpiFromSummary(summary);
    },
    () => mockKpis
  );
}

export async function getPriorities(): Promise<Risk[]> {
  return liveOr(
    async () => (await fetchPendingActions()).map(actionToRisk),
    () => mockPriorities
  );
}

export async function getGreenScore(): Promise<ScoreData> {
  return liveOr(fetchGreenScore, () => mockScoreData);
}

export async function getRecommendations(): Promise<Recommendation[]> {
  return liveOr(
    async () => (await fetchPendingActions()).map(actionToRecommendation),
    () => mockRecommendations
  );
}

export async function getRecentActions(): Promise<ExecutedAction[]> {
  return liveOr(
    async () => {
      const executed = await apiFetch<ActionOut[]>("/api/actions/?status=EXECUTED");
      return executed.map(actionToExecuted);
    },
    () => mockRecentActions
  );
}

export async function getNotifications(): Promise<AppNotification[]> {
  return liveOr(
    async () => {
      const pending = await fetchPendingActions();
      const notifications = pending.map(actionToNotification);
      if (notifications.length) return notifications;
      const summary = await apiFetch<DashboardSummary>("/api/analytics/dashboard");
      const k = summary.kpis;
      return [
        {
          id: "at-risk",
          title: `${k.at_risk_count} items near expiry`,
          body: `₹${k.at_risk_value.toLocaleString("en-IN")} of stock at risk within 15 days`,
          type: "danger",
          read: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: "expired",
          title: `${k.expired_count} expired items`,
          body: `₹${k.expired_value.toLocaleString("en-IN")} already written off`,
          type: "info",
          read: false,
          createdAt: new Date().toISOString(),
        },
      ];
    },
    () => mockNotifications
  );
}

export async function getFeaturedRisk(): Promise<FeaturedRisk> {
  return liveOr(
    async () => {
      const rows = await apiFetch<AtRiskItem[]>("/api/inventory/at-risk");
      const top = rows[0];
      if (!top) throw new Error("no at-risk stock");
      return {
        productName: top.product_name,
        batchCode: top.batch_number ?? "",
        stock: top.quantity,
        expiresDays: top.days_remaining,
        velocity: top.velocity,
        estLeftover: top.expected_leftover,
        riskValue: top.value_at_risk ?? 0,
      };
    },
    () => mockFeaturedRisk
  );
}

// =============================================================== inventory

export async function getInventory(): Promise<InventoryItem[]> {
  return liveOr(
    async () => {
      const rows = await apiFetch<AtRiskItem[]>("/api/inventory/at-risk");
      return rows.map(atRiskToInventory);
    },
    () => mockInventory
  );
}

export async function getAtRisk(): Promise<AtRiskItem[]> {
  return liveOr(
    () => apiFetch<AtRiskItem[]>("/api/inventory/at-risk"),
    () => []
  );
}

export async function getProducts(search?: string): Promise<ProductOut[]> {
  return liveOr(async () => {
    const page = await apiFetch<{ items: ProductOut[] }>(
      `/api/inventory/products?page=1&page_size=100${search ? `&search=${encodeURIComponent(search)}` : ""}`
    );
    return page.items;
  }, () => []);
}

/** All inventory batches (used by POS to compute per-product stock). */
export async function getBatches(): Promise<import("./backend-types").BatchOut[]> {
  return liveOr(() => apiFetch<import("./backend-types").BatchOut[]>("/api/inventory/batches"), () => []);
}

export async function getStockHealth(): Promise<StockHealthSegment[]> {
  return liveOr(
    () => apiFetch<StockHealthSegment[]>("/api/inventory/stock-health"),
    () => []
  );
}

export async function getExpiryTimeline(): Promise<ExpiryTimelineBucket[]> {
  return liveOr(
    () => apiFetch<ExpiryTimelineBucket[]>("/api/inventory/expiry-timeline"),
    () => []
  );
}

export async function getWastePreventedSeries(): Promise<WastePreventedSeries> {
  return liveOr(
    () => apiFetch<WastePreventedSeries>("/api/analytics/waste-prevented?days=30"),
    () => ({ total: 0, series: [] })
  );
}

// ================================================================== sales

export async function getSalesTrend(): Promise<SalesTrendPoint[]> {
  return liveOr(
    () => apiFetch<SalesTrendPoint[]>("/api/sales/trend?days=30"),
    () => []
  );
}

export async function getTransactions(): Promise<Transaction[]> {
  return liveOr(
    async () => {
      const rows = await apiFetch<
        Array<{ id: string; quantity_sold: number; sale_price: number; sale_date: string }>
      >("/api/sales/transactions?limit=50");
      // Group consecutive sales by session is not available — surface as one row per sale.
      return rows.map((r) => ({
        id: r.id.slice(0, 8).toUpperCase(),
        time: r.sale_date,
        items: r.quantity_sold,
        total: r.sale_price * r.quantity_sold,
        status: "COMPLETED" as const,
      }));
    },
    () => []
  );
}

export async function postSale(
  items: Array<{ product_id?: string; barcode?: string; quantity: number }>
): Promise<PosSaleResponse> {
  return apiFetch<PosSaleResponse>("/api/pos/sale", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
}

// ================================================================= actions

/** Raw AI recommendation inbox rows (PENDING/EXECUTED/DISMISSED). */
export async function getActions(status = "PENDING"): Promise<ActionOut[]> {
  return liveOr(
    () => apiFetch<ActionOut[]>(`/api/actions/?status=${status}`),
    () => []
  );
}

export async function executeAction(
  actionId: string,
  selected: import("./backend-types").BackendRecommendation
): Promise<{
  waste_prevented: number;
  green_score_delta: number;
  items_cleared: number;
  new_status: string;
  intervention: string;
}> {
  return apiFetch("/api/actions/" + actionId + "/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selected }),
  });
}

export async function dismissAction(actionId: string): Promise<void> {
  await apiFetch("/api/actions/" + actionId + "/dismiss", { method: "POST" });
}

export async function generateActions(): Promise<{
  risks_detected: number;
  recommendations_created: number;
}> {
  return apiFetch("/api/actions/generate", { method: "POST" });
}

// ============================================================== receiving

export async function scanInvoice(file: File): Promise<ScanInvoiceResponse> {
  const form = new FormData();
  form.append("file", file);
  return apiUpload<ScanInvoiceResponse>("/api/receiving/scan-invoice", form);
}

export async function confirmReceipt(
  items: Array<{
    product_id: string;
    quantity: number;
    purchase_price?: number;
    expiry_date: string;
    batch_number?: string;
  }>
): Promise<ConfirmReceiptResponse> {
  return apiFetch<ConfirmReceiptResponse>("/api/receiving/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
}

// ============================================================== suppliers

export async function getSuppliers(): Promise<SupplierOut[]> {
  return liveOr(() => apiFetch<SupplierOut[]>("/api/suppliers"), () => []);
}

// ================================================================ exports

export type { ExtractedItem };
