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
  SupplierCreate,
  SupplierSummary,
  WastePreventedSeries,
} from "@/lib/backend-types";
import { apiFetch, apiUpload } from "@/lib/api-client";
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

/** Real spark points from the 30-day sales trend (never fabricated). */
function sparksFromTrend(trend: SalesTrendPoint[], mode: "revenue" | "units"): number[] {
  return trend.map((d) => (mode === "revenue" ? d.revenue : d.units));
}

function kpiFromSummary(summary: DashboardSummary): KPI[] {
  const k = summary.kpis;
  const trend = summary.sales_trend ?? [];
  const revSpark = sparksFromTrend(trend, "revenue");
  const unitsSpark = sparksFromTrend(trend, "units");
  return [
    {
      id: "inv_value",
      label: "Inventory Value",
      value: k.inventory_value,
      unit: "inr",
      deltaPct: k.inventory_value_delta_pct,
      spark: revSpark,
      icon: "📦",
      accent: "accent",
    },
    {
      id: "total_products",
      label: "Total Products",
      value: k.product_count,
      unit: "number",
      deltaPct: k.product_count_delta_pct,
      spark: unitsSpark,
      icon: "🏷️",
      accent: "ink",
    },
    {
      id: "at_risk",
      label: "At Risk",
      value: k.at_risk_value,
      unit: "inr",
      deltaPct: 0,
      spark: revSpark,
      icon: "⚠️",
      accent: "warning",
    },
    {
      id: "waste_prevented",
      label: "Waste Prevented",
      value: k.waste_prevented_mtd,
      unit: "inr",
      deltaPct: 0,
      spark: revSpark,
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
 * Execute a live backend call.
 *
 * Demo mode: an auth or network failure falls back to the local demo dataset.
 * Production: a failure NEVER falls back to fabricated data — it returns the
 * typed `emptyFallback` when one is supplied (so pages render honest empty
 * states), otherwise it rethrows so the caller surfaces the real error.
 */
async function liveOr<T>(
  live: () => Promise<T>,
  demoFallback: () => T | Promise<T>,
  emptyFallback?: () => T | Promise<T>
): Promise<T> {
  try {
    return await live();
  } catch (err) {
    if (emptyFallback) return await emptyFallback();
    throw err;
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

export async function getDashboardData(summary?: DashboardSummary): Promise<DashboardData> {
  return liveOr(
    async () => {
      // Reuse an already-fetched aggregate (see useDashboardData) instead of
      // re-hitting the heavy /api/analytics/dashboard endpoint a second time.
      const s = summary ?? (await apiFetch<DashboardSummary>("/api/analytics/dashboard"));
      const pending = s.urgent_actions.length
        ? s.urgent_actions.map(actionToRisk)
        : (await fetchPendingActions()).map(actionToRisk);
      const score = await fetchGreenScore();
      return { kpis: kpiFromSummary(s), priorities: pending, score };
    },
    () => ({ kpis: mockKpis, priorities: mockPriorities, score: mockScoreData }),
    () => ({ kpis: [], priorities: [], score: { score: 0, delta: 0, categories: [] } })
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
      today_revenue: 0,
      today_orders: 0,
      today_units: 0,
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

/** Zeroed aggregate so a fresh/offline production store renders honest empties. */
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
    daily_brief: { important_actions: 0, est_impact: 0, sections: [] },
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
    () => mockKpis,
    () => []
  );
}

export async function getPriorities(): Promise<Risk[]> {
  return liveOr(
    async () => (await fetchPendingActions()).map(actionToRisk),
    () => mockPriorities,
    () => []
  );
}

export async function getGreenScore(): Promise<ScoreData> {
  return liveOr(
    fetchGreenScore,
    () => mockScoreData,
    () => ({ score: 0, delta: 0, categories: [] })
  );
}

export async function getRecommendations(): Promise<Recommendation[]> {
  return liveOr(
    async () => (await fetchPendingActions()).map(actionToRecommendation),
    () => mockRecommendations,
    () => []
  );
}

export async function getRecentActions(): Promise<ExecutedAction[]> {
  return liveOr(
    async () => {
      const executed = await apiFetch<ActionOut[]>("/api/actions/?status=EXECUTED");
      return executed.map(actionToExecuted);
    },
    () => mockRecentActions,
    () => []
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
    () => mockNotifications,
    () => []
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
    () => mockFeaturedRisk,
    () => ({ productName: "", batchCode: "", stock: 0, expiresDays: 0, velocity: 0, estLeftover: 0, riskValue: 0 })
  );
}

// =============================================================== inventory

export async function getInventory(): Promise<InventoryItem[]> {
  return liveOr(
    async () => {
      const rows = await apiFetch<AtRiskItem[]>("/api/inventory/at-risk");
      return rows.map(atRiskToInventory);
    },
    () => mockInventory,
    () => []
  );
}

export async function getAtRisk(): Promise<AtRiskItem[]> {
  return liveOr(
    () => apiFetch<AtRiskItem[]>("/api/inventory/at-risk"),
    () => [],
    () => []
  );
}

export async function getProducts(search?: string): Promise<ProductOut[]> {
  return liveOr(async () => {
    const page = await apiFetch<{ items: ProductOut[] }>(
      `/api/inventory/products?page=1&page_size=100${search ? `&search=${encodeURIComponent(search)}` : ""}`
    );
    return page.items;
  }, () => [], () => []);
}

export async function getProductByBarcode(code: string): Promise<ProductOut> {
  // Backend-only resolution — the server owns barcode→product mapping.
  // An unregistered barcode surfaces as a 404 (the UI shows "new barcode").
  return apiFetch<ProductOut>(`/api/inventory/barcode/${encodeURIComponent(code.trim())}`);
}

export async function createProduct(payload: {
  name: string;
  barcode?: string;
  category?: string;
  selling_price?: number;
  purchase_price?: number;
  gst_rate?: number;
  sku?: string;
  unit?: string;
  supplier_id?: string;
  lead_time_days?: number;
}): Promise<ProductOut> {
  // Creating a product is a real write — it must reach the backend, never be fabricated.
  return apiFetch<ProductOut>("/api/inventory/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateProduct(
  productId: string,
  payload: { name?: string; barcode?: string; category?: string; purchase_price?: number; selling_price?: number }
): Promise<ProductOut> {
  return apiFetch<ProductOut>(`/api/inventory/products/${productId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** All inventory batches (used by POS to compute per-product stock). */
export async function getBatches(): Promise<import("./backend-types").BatchOut[]> {
  return liveOr(
    () => apiFetch<import("./backend-types").BatchOut[]>("/api/inventory/batches"),
    () => [],
    () => []
  );
}

export async function getStockHealth(): Promise<StockHealthSegment[]> {
  return liveOr(
    () => apiFetch<StockHealthSegment[]>("/api/inventory/stock-health"),
    () => [],
    () => []
  );
}

export async function getExpiryTimeline(): Promise<ExpiryTimelineBucket[]> {
  return liveOr(
    () => apiFetch<ExpiryTimelineBucket[]>("/api/inventory/expiry-timeline"),
    () => [],
    () => []
  );
}

export async function getWastePreventedSeries(): Promise<WastePreventedSeries> {
  return liveOr(
    () => apiFetch<WastePreventedSeries>("/api/analytics/waste-prevented?days=30"),
    () => ({ total: 0, series: [] }),
    () => ({ total: 0, series: [] })
  );
}

export async function getWastePrevented(days: number = 30): Promise<WastePreventedSeries> {
  return liveOr(
    () => apiFetch<WastePreventedSeries>(`/api/analytics/waste-prevented?days=${days}`),
    () => ({ total: 0, series: [] }),
    () => ({ total: 0, series: [] })
  );
}

// ================================================================== sales

export async function getSalesTrend(): Promise<SalesTrendPoint[]> {
  return liveOr(
    () => apiFetch<SalesTrendPoint[]>("/api/analytics/sales-trend?days=30"),
    () => [],
    () => []
  );
}

export async function getTransactions(): Promise<Transaction[]> {
  return liveOr(
    async () => {
      const rows = await apiFetch<
        import("./backend-types").TransactionOut[]
      >("/api/inventory/transactions?limit=50");
      return rows.map((r) => ({
        id: r.id.slice(0, 8).toUpperCase(),
        time: r.created_at,
        items: Math.abs(r.quantity),
        total: 0, // the inventory ledger carries no sale price — total is not derivable here
        status: "COMPLETED" as const,
      }));
    },
    () => [],
    () => []
  );
}

export async function postSale(
  items: Array<{ product_id?: string; barcode?: string; quantity: number }>
): Promise<PosSaleResponse> {
  // A sale is a real financial transaction — it must reach the backend, never be fabricated.
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
    () => [],
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
  return liveOr(
    () => {
      const form = new FormData();
      form.append("file", file);
      return apiUpload<ScanInvoiceResponse>("/api/receiving/scan-invoice", form);
    },
    () => ({
      source: "mock",
      raw_text: "Mock Invoice Text",
      extracted_items: [
        { line_text: "Mock Item 1", product_name: "Mock Scanned Item 1", quantity: 20, price: 45, confidence: 0.95, matched_product_id: "mock-prod-1", batch_number: "B101", expiry_date: "2026-09-01" },
        { line_text: "Mock Item 2", product_name: "Mock Scanned Item 2", quantity: 15, price: 120, confidence: 0.88, matched_product_id: "mock-prod-2", batch_number: "B102", expiry_date: "2026-09-15" }
      ]
    })
  );
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
  return liveOr(
    () => apiFetch<ConfirmReceiptResponse>("/api/receiving/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    }),
    () => ({
      created_batch_ids: items.map((_, i) => `mock-batch-${i}`),
      detection_summary: { risks_detected: 0, recommendations_created: 0 },
      alerts_triggered: 0
    })
  );
}

// ============================================================== copilot

export async function askCopilot(question: string): Promise<{
  answer: string;
  evidence_used: string[];
  confidence: number;
  data_quality: string;
  fallback_used: boolean;
  model_used: string;
}> {
  return liveOr(
    () =>
      apiFetch("/api/ai/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      }),
    async () => {
      const q = question.toLowerCase();
      const atRisk = await getAtRisk().catch(() => []);
      const kpis = await getDashboardSummary().then((s) => s.kpis).catch(() => null);
      const salesTrend = await getSalesTrend().catch(() => []);
      const totalProds = kpis?.product_count || 0;
      const atRiskVal = atRisk.reduce((sum, item) => sum + (item.value_at_risk || 0), 0);

      if (["supplier", "lead time", "vendor", "order"].some((w) => q.includes(w))) {
        return {
          answer: `WHAT I SEE: Active catalog tracks ${totalProds} items with registered suppliers.\nWHY IT MATTERS: Lead times impact safety stock requirements and reorder triggers.\nWHAT TO DO: Review supplier performance metrics in the Procurement module.`,
          evidence_used: ["product_catalog", "stock_coverage"],
          confidence: 85,
          data_quality: "MEDIUM",
          fallback_used: true,
          model_used: "Green Quant Pure-Math Engine",
        };
      }

      if (["risk", "expiry", "expire", "waste", "dead"].some((w) => q.includes(w))) {
        if (atRisk.length > 0) {
          const names = atRisk.slice(0, 3).map((i) => i.product_name).join(", ");
          return {
            answer: `WHAT I SEE: ${atRisk.length} product batch(es) flagged for expiry risk (${names}) with total value at risk of ₹${atRiskVal.toLocaleString()}.\nWHY IT MATTERS: Items nearing expiration will incur direct margin loss if unsold.\nWHAT TO DO: Apply a 25%-40% dynamic markdown on ${names} via the Action Center.`,
            evidence_used: ["at_risk_expiry", "batch_inventory", "value_at_risk"],
            confidence: 94,
            data_quality: "HIGH",
            fallback_used: true,
            model_used: "Green Quant Pure-Math Engine",
          };
        }
        return {
          answer: `WHAT I SEE: 0 batches currently flagged for critical expiry risk (< 3 days).\nWHY IT MATTERS: Inventory freshness is optimal across active store batches.\nWHAT TO DO: Continue monitoring batch expiry dates upon invoice receiving.`,
          evidence_used: ["batch_inventory", "expiry_timeline"],
          confidence: 90,
          data_quality: "HIGH",
          fallback_used: true,
          model_used: "Green Quant Pure-Math Engine",
        };
      }

      if (["drop", "sales", "revenue", "trend", "why"].some((w) => q.includes(w))) {
        const totalRev = salesTrend.reduce((sum, p) => sum + (p.revenue || 0), 0);
        return {
          answer: `WHAT I SEE: Registered store sales total ₹${totalRev.toLocaleString()} across active POS transactions.\nWHY IT MATTERS: Daily sales velocity correlates directly with peak traffic hours.\nWHAT TO DO: Ensure high-velocity items are shelved prior to 8-10 AM and 5-7 PM rush hours.`,
          evidence_used: ["sales_trend_30d", "pos_transactions", "daily_stats"],
          confidence: 88,
          data_quality: "MEDIUM",
          fallback_used: true,
          model_used: "Green Quant Pure-Math Engine",
        };
      }

      if (["discount", "markdown", "clearance", "sale"].some((w) => q.includes(w))) {
        return {
          answer: `WHAT I SEE: Catalog contains ${totalProds} active products with ₹${kpis?.inventory_value?.toLocaleString() || 0} total stock value.\nWHY IT MATTERS: Discounting slow-moving items recovers working capital without reducing core gross margin.\nWHAT TO DO: Target items with > 30 days stock coverage for a 20% promotional discount.`,
          evidence_used: ["product_catalog", "margin_analytics", "stock_coverage"],
          confidence: 86,
          data_quality: "MEDIUM",
          fallback_used: true,
          model_used: "Green Quant Pure-Math Engine",
        };
      }

      return {
        answer: `WHAT I SEE: Store has ${totalProds} products registered with ₹${kpis?.inventory_value?.toLocaleString() || 0} total inventory value.\nWHY IT MATTERS: Active inventory is tracked in real-time against sales velocity and batch expiration.\nWHAT TO DO: Check the AI Action Center for priority daily tasks and reorder recommendations.`,
        evidence_used: ["store_summary", "product_catalog", "sales_velocity"],
        confidence: 88,
        data_quality: "MEDIUM",
        fallback_used: true,
        model_used: "Green Quant Pure-Math Engine",
      };
    }
  );
}

// ============================================================== suppliers

export async function getSuppliers(): Promise<SupplierOut[]> {
  return liveOr(() => apiFetch<SupplierOut[]>("/api/suppliers"), () => []);
}

export async function getSupplierSummary(): Promise<SupplierSummary> {
  return liveOr(
    () => apiFetch<SupplierSummary>("/api/suppliers/summary"),
    () => ({
      total_active: 0,
      new_this_month: 0,
      avg_fulfillment: 95.0,
      pending_orders_count: 0,
      pending_orders_supplier_count: 0,
      issues_delays_count: 0,
    })
  );
}

export async function createSupplier(data: SupplierCreate): Promise<SupplierOut> {
  return apiFetch<SupplierOut>("/api/suppliers", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateSupplier(id: string, data: Partial<SupplierCreate>): Promise<SupplierOut> {
  return apiFetch<SupplierOut>(`/api/suppliers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteSupplier(id: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/suppliers/${id}`, {
    method: "DELETE",
  });
}

// ============================================================== monthly reports

export interface MonthlyReportSummary {
  month_name: string;
  total_sales: number;
  total_transactions: number;
  waste_prevented_value: number;
  actual_waste_value: number;
  avg_green_score: number;
  top_category: string;
  top_selling_product: string;
  generated_at: string;
}

export async function getMonthlyReport(monthYear?: string): Promise<MonthlyReportSummary> {
  const q = monthYear ? `?month=${monthYear}` : "";
  return liveOr(
    () => apiFetch<MonthlyReportSummary>(`/api/analytics/monthly-report${q}`),
    () => {
      const now = new Date();
      return {
        month_name: now.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        total_sales: 145800.00,
        total_transactions: 342,
        waste_prevented_value: 18450.00,
        actual_waste_value: 1200.00,
        avg_green_score: 87.5,
        top_category: "Dairy & Milk",
        top_selling_product: "Amul Taaza Toned Milk 1L",
        generated_at: new Date().toISOString()
      };
    }
  );
}

export async function exportMonthlyReportCSV(monthYear?: string): Promise<string> {
  const report = await getMonthlyReport(monthYear);
  const csvLines = [
    "Metric,Value",
    `Month,${report.month_name}`,
    `Total Sales Revenue (INR),${report.total_sales}`,
    `Total Transactions,${report.total_transactions}`,
    `Waste Prevented Value (INR),${report.waste_prevented_value}`,
    `Actual Waste Value (INR),${report.actual_waste_value}`,
    `Average Green Score,${report.avg_green_score}`,
    `Top Category,${report.top_category}`,
    `Top Selling Product,"${report.top_selling_product}"`
  ];
  return csvLines.join("\n");
}

// ================================================================ exports

export type { ExtractedItem };

// ================================================================ intelligence

export interface AIInsight {
  id: string;
  type: string;
  title: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  badge: "DO NOW" | "DO TODAY" | "WATCH" | "OPPORTUNITY";
  evidence: Record<string, string | number>;
  recommendation: string;
  why: string;
  confidence: number;
  dataQuality: string;
}

export interface AIHeatmapData {
  hours: string[];
  products: Array<{ name: string; id: string }>;
  data: number[][]; // product x hour
}

export interface ProductMatrixRow {
  productName: string;
  classification: "STAR" | "GROWING" | "DECLINING" | "DEAD" | "RISKY";
  velocity: number;
  trend: string;
  coverage: number;
  margin: number;
  expiryDays: number | null;
}

export interface AIAssociationData {
  association_rules: Array<{
    product_a_name: string;
    product_b_name: string;
    lift: number;
    confidence_a_to_b: number;
    co_purchases: number;
  }>;
  cross_sell_opportunities: Array<{
    trigger_product: string;
    suggested_product: string;
    lift: number;
    interpretation: string;
  }>;
}

export async function getAIInsights(filter?: string): Promise<AIInsight[]> {
  return liveOr(
    async () => {
      const res = await apiFetch<any>(`/api/ai/insights${filter ? `?type=${filter}` : ""}`);
      const list = Array.isArray(res) ? res : (res?.insights || []);
      return list.map((i: any) => ({
        id: i.id || Math.random().toString(),
        type: i.category || i.type || "INFO",
        title: i.title || "Store Signal",
        priority: i.priority || "WATCH",
        badge: i.priority === "DO_NOW" ? "DO NOW" : i.priority === "DO_TODAY" ? "DO TODAY" : i.priority === "WATCH" ? "WATCH" : "OPPORTUNITY",
        evidence: i.evidence || {},
        recommendation: i.recommendation || "",
        why: i.explanation || i.expected_impact || i.recommendation || "",
        confidence: i.confidence === "HIGH" ? 95 : i.confidence === "MEDIUM" ? 80 : 60,
        dataQuality: i.data_quality || "MEDIUM",
      }));
    },
    () => ([
      {
        id: "1", type: "CRITICAL", title: "Approaching Expiry - Dairy", priority: "CRITICAL", badge: "DO NOW",
        evidence: { items: 45, value: "₹2,400", days: 3 }, recommendation: "Discount immediately by 30%",
        why: "Historical data shows 0% clearance at full price when < 3 days left.", confidence: 94, dataQuality: "HIGH"
      },
      {
        id: "2", type: "OPPORTUNITY", title: "Weekend Demand Surge", priority: "MEDIUM", badge: "OPPORTUNITY",
        evidence: { product: "Chips", expected_lift: "+40%" }, recommendation: "Increase stock on floor.",
        why: "Correlates with upcoming local event.", confidence: 88, dataQuality: "MEDIUM"
      },
      {
        id: "3", type: "BEHAVIOR", title: "Morning Rush Missing", priority: "HIGH", badge: "DO TODAY",
        evidence: { drop: "15%", time: "8-10 AM" }, recommendation: "Check bread/milk availability early.",
        why: "Key morning items were out of stock yesterday at 9 AM.", confidence: 91, dataQuality: "HIGH"
      },
      {
        id: "4", type: "DEMAND", title: "New Brand Gaining Traction", priority: "LOW", badge: "WATCH",
        evidence: { wow_growth: "22%" }, recommendation: "Monitor for potential reorder increase.",
        why: "Steady week-over-week growth without promotions.", confidence: 75, dataQuality: "MEDIUM"
      }
    ] as AIInsight[]).filter(i => !filter || filter === "ALL" || i.type === filter),
    () => []
  );
}

export async function getAIHeatmap(): Promise<AIHeatmapData> {
  return liveOr(
    () => apiFetch<AIHeatmapData>("/api/ai/heatmap"),
    () => {
      const hours = Array.from({length: 24}, (_, i) => `${i}:00`);
      const products = [{name: "Milk", id:"p1"}, {name: "Bread", id:"p2"}, {name: "Chips", id:"p3"}];
      const data = products.map(() => hours.map(() => Math.floor(Math.random() * 50)));
      return { hours, products, data };
    },
    () => ({
      hours: Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}:00`),
      products: [],
      data: []
    })
  );
}

export async function getAIBehavior(): Promise<any> {
  return liveOr(
    () => apiFetch<any>("/api/ai/behavior"),
    () => ({ summary: "Behavior normal" }),
    () => ({ summary: "No store activity registered yet" })
  );
}

export async function getAIAssociations(): Promise<AIAssociationData> {
  return liveOr(
    () => apiFetch<AIAssociationData>("/api/ai/associations"),
    () => ({
      association_rules: [
        { product_a_name: "Milk", product_b_name: "Bread", lift: 1.5, confidence_a_to_b: 0.6, co_purchases: 120 },
      ],
      cross_sell_opportunities: [
        { trigger_product: "Chips", suggested_product: "Soda", lift: 1.8, interpretation: "60% of chips buyers buy soda." },
      ]
    }),
    () => ({
      association_rules: [],
      cross_sell_opportunities: []
    })
  );
}

export async function getAnalyticsSummary(): Promise<ProductMatrixRow[]> {
  return liveOr(
    () => apiFetch<ProductMatrixRow[]>("/api/ai/matrix"),
    () => [
      { productName: "Amul Milk", classification: "STAR", velocity: 120, trend: "+5%", coverage: 2, margin: 12, expiryDays: 4 },
      { productName: "Lays Classic", classification: "GROWING", velocity: 45, trend: "+15%", coverage: 14, margin: 25, expiryDays: 120 },
      { productName: "Local Bread", classification: "DECLINING", velocity: 10, trend: "-20%", coverage: 1, margin: 15, expiryDays: 1 },
      { productName: "Premium Dates", classification: "DEAD", velocity: 0.5, trend: "-5%", coverage: 60, margin: 40, expiryDays: 300 },
      { productName: "Yogurt", classification: "RISKY", velocity: 20, trend: "0%", coverage: 5, margin: 18, expiryDays: 2 },
    ],
    () => []
  );
}

// ================================================================ procurement

import type { ProcurementSummary, ProcurementSuggestion, PurchaseOrderListOut, PurchaseOrderCreateRequest } from "@/lib/backend-types";

export async function getProcurementSummary(): Promise<ProcurementSummary> {
  return liveOr(
    () => apiFetch<ProcurementSummary>("/api/procurement/summary"),
    () => ({ active_pos: 12, spend_mtd: 1200000, delayed_deliveries: 3 }),
    () => ({ active_pos: 0, spend_mtd: 0, delayed_deliveries: 0 })
  );
}

export async function getPurchaseOrders(): Promise<PurchaseOrderListOut[]> {
  return liveOr(
    () => apiFetch<PurchaseOrderListOut[]>("/api/procurement/orders"),
    () => [
      { id: "PO-2023-089", supplier: "Global Distributors", date: "Today", amount: "₹45,200", status: "In Transit" },
      { id: "PO-2023-088", supplier: "Fresh Farms Inc.", date: "Yesterday", amount: "₹12,450", status: "Delivered" },
      { id: "PO-2023-087", supplier: "Dairy Alternatives Co.", date: "Aug 06", amount: "₹8,900", status: "Processing" },
    ],
    () => []
  );
}

export async function getProcurementSuggestions(): Promise<ProcurementSuggestion[]> {
  return liveOr(
    () => apiFetch<ProcurementSuggestion[]>("/api/procurement/suggestions"),
    () => [
      { id: "AR1", product_id: "1", product: "Organic Apples", suggestedQty: 100, supplier: "Fresh Farms Inc.", supplier_id: "s1", confidence: 95, status: "Pending" },
      { id: "AR2", product_id: "2", product: "Almond Milk 1L", suggestedQty: 48, supplier: "Dairy Alternatives Co.", supplier_id: "s3", confidence: 88, status: "Approved" },
    ],
    () => []
  );
}

export async function createPurchaseOrder(data: PurchaseOrderCreateRequest): Promise<{ message: string, id: string }> {
  return apiFetch<{ message: string, id: string }>("/api/procurement/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
}

export async function updatePurchaseOrderStatus(id: string, status: string): Promise<any> {
  return apiFetch<any>(`/api/procurement/orders/${id}?status=${encodeURIComponent(status)}`, {
    method: "PATCH"
  });
}
