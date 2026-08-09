// OFFLINE FALLBACK — values are intentionally zero. Real data comes from backend.
import type { ChecklistItem, ScoreData } from "@/lib/types";

export const scoreData: ScoreData = {
  score: 0,
  delta: 0,
  categories: [
    { id: "expiry_prevention", label: "Expiry Prevention", value: 0, weight: 0.3, tint: "accent" },
    { id: "inventory_eff", label: "Inventory Eff.", value: 0, weight: 0.3, tint: "info" },
    { id: "dead_stock", label: "Dead Stock", value: 0, weight: 0.2, tint: "warning" },
    { id: "waste_prevention", label: "Waste Prevented", value: 0, weight: 0.2, tint: "safe" },
    { id: "overstock", label: "Overstock", value: 0, weight: 0, tint: "purple" },
  ],
};

export const improvementChecklist: ChecklistItem[] = [];
