/**
 * Green Quant AI — FastAPI backend wire types.
 * Mirrors `backend/app/models/schemas.py` so the frontend can type-check the
 * JSON the API actually returns. Frontend UI types live in `./types`.
 */

export interface UserOut {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "WORKER" | "BILL";
  store_id: string | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserOut;
}

export interface ProductOut {
  id: string;
  store_id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  category: string | null;
  purchase_price: number | null;
  selling_price: number | null;
  gst_rate: number | null;
  supplier_id: string | null;
  lead_time_days: number;
  created_at: string;
  is_new?: boolean;
}

export interface BatchOut {
  id: string;
  product_id: string;
  store_id: string;
  batch_number: string | null;
  quantity: number;
  expiry_date: string; // yyyy-mm-dd
  purchase_price: number | null;
  received_date: string;
  days_remaining: number;
  severity: string; // CRITICAL/WARNING/UPCOMING/SAFE/DEAD_STOCK/OVERSTOCK
}

export interface AtRiskItem {
  batch_id: string;
  product_id: string;
  product_name: string;
  batch_number: string | null;
  quantity: number;
  expiry_date: string;
  days_remaining: number;
  severity: string;
  value_at_risk: number | null;
  expected_leftover: number;
  velocity: number;
}

export interface StockHealthSegment {
  name: string;
  value: number;
  color: string;
}

export interface ExpiryTimelineBucket {
  label: string;
  min_days: number;
  max_days: number;
  items: number;
  value: number;
}

export interface DeadStockItem {
  batch_id: string;
  product_id: string;
  product_name: string;
  batch_number: string | null;
  quantity: number;
  days_idle: number;
  value_locked: number | null;
}

export interface ReorderSuggestion {
  product_id: string;
  name: string;
  current_qty: number;
  velocity: number;
  lead_time_days: number;
  suggested_qty: number;
  stockout_eta: number | null;
}

export interface ScoreComponent {
  name: string;
  weight: number;
  value: number;
  note: string;
}

export interface GreenScoreOut {
  score: number;
  expiry_score: number;
  inventory_score: number;
  dead_stock_score: number;
  waste_score: number;
  breakdown: ScoreComponent[];
  period_date: string;
}

export interface GreenScoreHistoryPoint {
  period_date: string;
  score: number;
}

export interface BackendRecommendation {
  rank: number;
  action_type: "DISCOUNT" | "TRANSFER" | "RETURN" | "REORDER";
  params: Record<string, unknown>;
  expected_outcome: number;
  confidence: number;
  reasoning: string;
}

export interface ActionOut {
  id: string;
  product_id: string;
  product_name: string;
  batch_id: string;
  batch_number: string | null;
  risk_type: string;
  severity: string;
  value_at_risk: number | null;
  recommendations: BackendRecommendation[];
  status: string;
  created_at: string;
}

export interface ExecuteActionResponse {
  waste_prevented: number;
  green_score_delta: number;
  items_cleared: number;
  new_status: string;
  intervention: string;
}

export interface DashboardKpis {
  inventory_value: number;
  inventory_value_delta_pct: number;
  product_count: number;
  product_count_delta_pct: number;
  at_risk_count: number;
  at_risk_value: number;
  expired_count: number;
  expired_value: number;
  waste_prevented_mtd: number;
}

export interface AiPriorityAction {
  products: number;
  units: number;
  value: number;
}

export interface AiPriorityActions {
  sell_first: AiPriorityAction;
  discount: AiPriorityAction;
  transfer: AiPriorityAction;
  reorder: AiPriorityAction;
}

export interface AiInsight {
  title: string;
  detail: string;
  icon: string;
}

export interface MiniKpis {
  suppliers: number;
  purchase_orders: number;
  grn_pending: number;
  avg_gross_margin: number;
}

export interface SalesTrendPoint {
  date: string; // yyyy-mm-dd
  revenue: number;
  units: number;
}

export interface DailyBriefSection {
  title: string;
  count: number;
}

export interface DailyBrief {
  important_actions: number;
  est_impact: number;
  sections: DailyBriefSection[];
}

export interface DashboardSummary {
  kpis: DashboardKpis;
  donut: StockHealthSegment[];
  sales_trend: SalesTrendPoint[];
  expiry_timeline: ExpiryTimelineBucket[];
  urgent_actions: ActionOut[];
  ai_priority: AiPriorityActions;
  ai_insights: AiInsight[];
  mini_kpis: MiniKpis;
  green_score: GreenScoreOut;
  daily_brief: DailyBrief;
}

export interface WastePreventedPoint {
  date: string;
  value: number;
}

export interface WastePreventedSeries {
  total: number;
  series: WastePreventedPoint[];
}

export interface SupplierOut {
  id: string;
  store_id: string;
  name: string;
  contact_phone: string | null;
  email: string | null;
  gst_number: string | null;
  on_time_delivery_score: number | null;
  expiry_quality_score: number | null;
}

export interface ReceiptLine {
  product_id: string;
  name: string;
  batch_id: string;
  batch_number: string | null;
  qty: number;
  unit_price: number;
  gst_rate: number;
  gst_amount: number;
  line_total: number;
}

export interface Receipt {
  receipt_no: string;
  store_id: string;
  lines: ReceiptLine[];
  subtotal: number;
  gst_total: number;
  grand_total: number;
  timestamp: string;
}

export interface PosSaleResponse {
  receipt: Receipt;
}

export interface SaleOut {
  id: string;
  product_id: string;
  batch_id: string | null;
  quantity_sold: number;
  sale_price: number;
  gst_amount: number | null;
  sale_date: string;
}

export interface ExtractedItem {
  line_text: string;
  product_name: string;
  matched_product_id: string | null;
  confidence: number;
  quantity: number;
  price: number | null;
  batch_number: string | null;
  expiry_date: string | null;
}

export interface ScanInvoiceResponse {
  source: string;
  raw_text: string;
  extracted_items: ExtractedItem[];
}

export interface ConfirmReceiptResponse {
  created_batch_ids: string[];
  detection_summary: {
    risks_detected: number;
    recommendations_created: number;
  };
  alerts_triggered: number;
}

export interface DetectionRunSummary {
  risks_detected: number;
  recommendations_created: number;
}

export interface MessageOut {
  message: string;
}
