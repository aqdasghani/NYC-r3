// OFFLINE FALLBACK — values are intentionally zero. Real data comes from backend.
import type { KPI } from "@/lib/types";

export const kpis: KPI[] = [
  {
    id: "inv_value",
    label: "Inventory Value",
    value: 0,
    unit: "inr",
    deltaPct: 4.2,
    spark: [4.1, 4.2, 4.15, 4.3, 4.4, 4.55, 4.82],
    icon: "📦",
    accent: "accent",
  },
  {
    id: "total_products",
    label: "Total Products",
    value: 1284,
    unit: "number",
    deltaPct: 1.6,
    spark: [1180, 1205, 1215, 1230, 1250, 1270, 1284],
    icon: "🏷️",
    accent: "ink",
  },
  {
    id: "at_risk",
    label: "At Risk",
    value: 0,
    unit: "inr",
    deltaPct: -8.4,
    spark: [22.1, 21.4, 20.8, 20.1, 19.7, 19.0, 18.42],
    icon: "⚠️",
    accent: "warning",
  },
  {
    id: "waste_prevented",
    label: "Waste Prevented",
    value: 0,
    unit: "inr",
    deltaPct: 23,
    spark: [4.2, 4.5, 4.8, 5.2, 6.1, 6.8, 7.24],
    icon: "🌱",
    accent: "safe",
  },
];
