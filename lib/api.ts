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
  HourlySalesPoint,
  WeeklyComparison,
  MonthlyComparison,
  HeatmapRow,
  InventoryIntelligence,
  ProductDemand,
  AiInsight,
} from "@/lib/backend-types";
import { apiFetch, apiFetchText, apiUpload, ensureAuth } from "@/lib/api-client";
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

// ================================================================ empty states (production fallback — never mock)

function emptyKpis(): KPI[] {
  return [
    { id: "inv_value", label: "Inventory Value", value: 0, unit: "inr", deltaPct: 0, spark: [], icon: "📦", accent: "accent" },
    { id: "total_products", label: "Total Products", value: 0, unit: "number", deltaPct: 0, spark: [], icon: "🏷️", accent: "ink" },
    { id: "at_risk", label: "At Risk", value: 0, unit: "inr", deltaPct: 0, spark: [], icon: "⚠️", accent: "warning" },
    { id: "waste_prevented", label: "Waste Prevented", value: 0, unit: "inr", deltaPct: 0, spark: [], icon: "🌱", accent: "safe" },
  ];
}

function emptyScoreData(): ScoreData {
  return {
    score: 0,
    delta: 0,
    categories: [
      { id: "expiry_prevention", label: "Expiry Prevention", value: 0, weight: 0.3, tint: "accent" },
      { id: "inventory_eff", label: "Inventory Eff.", value: 0, weight: 0.3, tint: "info" },
      { id: "dead_stock", label: "Dead Stock", value: 0, weight: 0.2, tint: "warning" },
      { id: "waste_prevention", label: "Waste Prevented", value: 0, weight: 0.2, tint: "safe" },
    ],
  };
}

// ================================================================ helpers

function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.location.pathname.startsWith("/demo") ||
    window.location.search.includes("demo=true") ||
    localStorage.getItem("app_mode") === "demo"
  );
}

/**
 * Run a live backend call. If unreachable or unauthenticated:
 * - Uses demo dataset if in Demo mode (/demo or ?demo=true)
 * - Returns clean empty state in Production mode to prevent mock data leakage.
 */
async function liveOr<T>(live: () => Promise<T>, fallback: () => T, emptyFallback?: () => T): Promise<T> {
  if (isDemoMode()) {
    try {
      return await live();
    } catch {
      return fallback();
    }
  }
  return await live();
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
    () => ({ kpis: mockKpis, priorities: mockPriorities, score: mockScoreData }),
    () => ({ kpis: emptyKpis(), priorities: [], score: emptyScoreData() })
  );
}

/** Offline-safe reconstruction returning zero/empty states. */
function mockDashboardSummary(): DashboardSummary {
  return emptyDashboardSummary();
}

function emptyDashboardSummary(): DashboardSummary {
  return {
    kpis: {
      inventory_value: 0,
      inventory_value_delta_pct: 0,
      product_count: 0,
      product_count_delta_pct: 0,
      at_risk_count: 0,
      at_risk_value: 0,
      expired_count: 0,
      expired_value: 0,
      waste_prevented_mtd: 0,
      today_revenue: 0,
      today_orders: 0,
      today_units: 0,
    },
    donut: [],
    sales_trend: [],
    expiry_timeline: [],
    urgent_actions: [],
    ai_priority: {
      sell_first: { products: 0, units: 0, value: 0 },
      discount: { products: 0, units: 0, value: 0 },
      transfer: { products: 0, units: 0, value: 0 },
      reorder: { products: 0, units: 0, value: 0 },
    },
    ai_insights: [],
    mini_kpis: { suppliers: 0, purchase_orders: 0, grn_pending: 0, avg_gross_margin: 0 },
    green_score: {
      score: 0,
      expiry_score: 0,
      inventory_score: 0,
      dead_stock_score: 0,
      waste_score: 0,
      breakdown: [],
      period_date: new Date().toISOString().slice(0, 10),
    },
    daily_brief: {
      important_actions: 0,
      est_impact: 0,
      sections: [],
    },
  };
}

/** Full backend aggregate (donut, trend, timeline, priorities, insights, brief). */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  return liveOr(
    () => apiFetch<DashboardSummary>("/api/analytics/dashboard"),
    mockDashboardSummary,
    emptyDashboardSummary
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

export async function getFeaturedRisk(): Promise<FeaturedRisk | null> {
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

export async function getProductByBarcode(code: string): Promise<ProductOut> {
  return apiFetch<ProductOut>(`/api/inventory/barcode/${code}`);
}

export async function createProduct(data: {
  name: string;
  barcode?: string;
  category?: string;
  purchase_price?: number;
  selling_price?: number;
}): Promise<ProductOut> {
  return apiFetch<ProductOut>("/api/inventory/products", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getProduct(id: string): Promise<ProductOut> {
  return apiFetch<ProductOut>(`/api/inventory/products/${id}`);
}

export async function getProductDemand(id: string): Promise<ProductDemand> {
  return liveOr(
    () => apiFetch<ProductDemand>(`/api/analytics/product/${id}/demand`),
    () => ({
      total_revenue_30d: 0,
      total_units_30d: 0,
      velocity_per_day: 0,
      daily_series: [],
      hourly_pattern: [],
      dow_pattern: [],
    })
  );
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

export async function getSalesTrend(days: number = 30): Promise<SalesTrendPoint[]> {
  return liveOr(
    () => apiFetch<SalesTrendPoint[]>(`/api/sales/trend?days=${days}`),
    () => [], // Demo mode: also return empty — real demo data comes from backend seed
    () => [] // Production mode: empty array = "No sales data yet" shown in UI
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

// Hourly sales for a specific date
export async function getHourlySales(date?: string): Promise<HourlySalesPoint[]> {
  try {
    const params = date ? `?target_date=${date}` : '';
    return await apiFetch(`/api/analytics/hourly${params}`);
  } catch { return []; }
}

// Weekly comparison  
export async function getWeeklyComparison(): Promise<WeeklyComparison | null> {
  try {
    return await apiFetch('/api/analytics/weekly');
  } catch { return null; }
}

// Monthly comparison
export async function getMonthlyComparison(): Promise<MonthlyComparison | null> {
  try {
    return await apiFetch('/api/analytics/monthly');
  } catch { return null; }
}

// Demand heatmap
export async function getDemandHeatmap(days: number = 30): Promise<HeatmapRow[]> {
  try {
    return await apiFetch(`/api/analytics/heatmap?days=${days}`);
  } catch { return []; }
}

// Inventory intelligence
export async function getInventoryIntelligence(): Promise<InventoryIntelligence | null> {
  try {
    return await apiFetch('/api/inventory/intelligence');
  } catch { return null; }
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
  return await apiUpload<ScanInvoiceResponse>("/api/receiving/scan-invoice", form);
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
  return await apiFetch<ConfirmReceiptResponse>("/api/receiving/confirm", {
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

/** Download the current month's report from the backend as CSV text. */
export async function exportMonthlyReportCSV(): Promise<string> {
  return apiFetchText("/api/analytics/monthly-report/export-csv");
}

export type { ExtractedItem };

export async function getInsights(): Promise<AiInsight[]> {
  return liveOr(
    () => apiFetch<AiInsight[]>("/api/analytics/insights"),
    () => []
  );
}

export async function getGreenScoreCurrent(): Promise<GreenScoreOut> {
  return liveOr(
    () => apiFetch<GreenScoreOut>("/api/green-score/current"),
    () => ({
      score: 0,
      expiry_score: 0,
      inventory_score: 0,
      dead_stock_score: 0,
      waste_score: 0,
      breakdown: [],
      period_date: new Date().toISOString().slice(0, 10),
    }),
    () => ({
      score: 0,
      expiry_score: 0,
      inventory_score: 0,
      dead_stock_score: 0,
      waste_score: 0,
      breakdown: [],
      period_date: new Date().toISOString().slice(0, 10),
    })
  );
}

export async function getGreenScoreHistory(days: number = 30): Promise<GreenScoreHistoryPoint[]> {
  return liveOr(
    () => apiFetch<GreenScoreHistoryPoint[]>(`/api/green-score/history?days=${days}`),
    () => []
  );
}

export async function getPurchaseOrders(): Promise<any[]> {
  return liveOr(
    () => apiFetch<any[]>("/api/purchase-orders"),
    () => []
  );
}

export async function getTransfers(): Promise<any[]> {
  return liveOr(
    () => apiFetch<any[]>("/api/transfers"),
    () => []
  );
}

export async function getReturns(): Promise<any[]> {
  return liveOr(
    () => apiFetch<any[]>("/api/returns"),
    () => []
  );
}

export async function getBriefing(): Promise<import("./backend-types").DailyBrief> {
  return liveOr(
    () => apiFetch<import("./backend-types").DailyBrief>("/api/analytics/briefing"),
    () => ({
      important_actions: 0,
      est_impact: 0,
      sections: []
    })
  );
}

