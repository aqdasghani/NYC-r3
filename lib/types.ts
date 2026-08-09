/**
 * GreenShop AI — typed data contract.
 * Every layer (server pages, client components, future FastAPI backend) shares these.
 */

export type Priority = "URGENT" | "ACTION" | "REORDER" | "TRANSFER";
export type StockStatus =
  | "CRITICAL"
  | "WARNING"
  | "UPCOMING"
  | "SAFE"
  | "DEAD_STOCK"
  | "OVERSTOCK";
export type RecommendationKind = "DISCOUNT" | "TRANSFER" | "SUPPLIER_RETURN";
export type ToastVariant = "success" | "info" | "error" | "action";
export type NotificationType = "danger" | "info" | "success";
export type KpiUnit = "inr" | "number" | "pct";

export interface Product {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  unit: string;
  unitPrice: number;
  status: StockStatus;
  currentQty: number;
  reorderPoint: number;
  velocityPerDay: number;
}

export interface Batch {
  id: string;
  productId: string;
  batchCode: string;
  receivedAt: string; // ISO date
  qty: number;
  expiryDate: string; // ISO date
}

export interface Risk {
  id: string;
  productId: string;
  productName: string;
  batchCode: string;
  priority: Priority;
  tag: string;
  reason: string;
  riskValue: number;
  daysToExpiry: number;
  suggestedAction: string;
}

export interface Recommendation {
  id: string;
  kind: RecommendationKind;
  title: string;
  description: string;
  unitsCleared: number;
  valueImpact: number;
  confidence: number; // 0–100
  toStore?: string;
}

export interface KPI {
  id: string;
  label: string;
  value: number;
  unit: KpiUnit;
  deltaPct: number;
  spark: number[];
  icon: string; // emoji, per design doc
  accent: "accent" | "ink" | "warning" | "safe";
}

export interface ScoreCategory {
  id: string;
  label: string;
  value: number; // 0–100
  weight: number; // 0–1 (0 = informational, not in formula)
  tint: "accent" | "info" | "warning" | "safe" | "purple";
}

export interface ScoreData {
  score: number;
  delta: number;
  categories: ScoreCategory[];
}

export interface InventoryItem {
  id: string;
  product: Product;
  batch: Batch;
  expiryDays: number;
  estLeftover: number;
  riskValue: number;
  aiKind: RecommendationKind | null;
}

export interface ExecutedAction {
  id: string;
  kind: RecommendationKind;
  productName: string;
  valueSaved: number;
  scoreImpact: number;
  status: "success" | "in_progress" | "ordered";
  executedAt: string; // ISO datetime
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  read: boolean;
  createdAt: string; // ISO datetime
}

export interface Toast {
  id: string;
  title: string;
  message?: string;
  variant: ToastVariant;
  duration?: number;
}

export interface InvoiceItem {
  id: string;
  name: string;
  brand: string;
  qty: number;
  unit: string;
  batchCode: string;
  expiryDate: string; // yyyy-mm-dd
  unitPrice: number;
  confidence: number; // 0–100
}

export interface InvoiceDraft {
  supplier: string;
  invoiceNo: string;
  date: string;
  items: InvoiceItem[];
}

export interface DashboardData {
  kpis: KPI[];
  priorities: Risk[];
  score: ScoreData;
}

export interface ChecklistItem {
  id: string;
  title: string;
  desc: string;
}

/** Featured risk data for the AI Action Engine hero card. */
export interface FeaturedRisk {
  productName: string;
  batchCode: string;
  stock: number;
  expiresDays: number;
  velocity: number;
  estLeftover: number;
  riskValue: number;
}
