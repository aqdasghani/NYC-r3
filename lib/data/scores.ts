import type { ChecklistItem, ScoreData } from "@/lib/types";

/**
 * Score tuned so the weighted formula is exactly 84:
 * 86×0.30 + 82×0.30 + 80×0.20 + 88×0.20 = 25.8 + 24.6 + 16 + 17.6 = 84.0
 * "Overstock" is informational (weight 0) — it rolls into Inventory Efficiency.
 */
export const scoreData: ScoreData = {
  score: 84,
  delta: 7,
  categories: [
    { id: "expiry_prevention", label: "Expiry Prevention", value: 86, weight: 0.3, tint: "accent" },
    { id: "inventory_eff", label: "Inventory Eff.", value: 82, weight: 0.3, tint: "info" },
    { id: "dead_stock", label: "Dead Stock", value: 80, weight: 0.2, tint: "warning" },
    { id: "waste_prevention", label: "Waste Prevented", value: 88, weight: 0.2, tint: "safe" },
    { id: "overstock", label: "Overstock", value: 74, weight: 0, tint: "purple" },
  ],
};

export const improvementChecklist: ChecklistItem[] = [
  {
    id: "chk-1",
    title: "37 near-expiry units sold before they expired",
    desc: "FEFO enforcement at the POS cleared stock before it hit the danger zone.",
  },
  {
    id: "chk-2",
    title: "₹8,420 potential waste prevented by AI actions",
    desc: "Discounts, transfers and supplier returns executed by the Action Engine this month.",
  },
  {
    id: "chk-3",
    title: "14% reduction in dead stock",
    desc: "From 28 to 24 products — return windows and clearance pricing are working.",
  },
  {
    id: "chk-4",
    title: "6 unnecessary purchase orders avoided",
    desc: "The AI flagged surplus stock before you re-ordered from the distributor.",
  },
];
