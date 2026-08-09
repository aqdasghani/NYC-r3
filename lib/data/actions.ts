import type { ExecutedAction } from "@/lib/types";
import { hoursAgo } from "./helpers";

export const recentActions: ExecutedAction[] = [
  {
    id: "act-1",
    kind: "DISCOUNT",
    productName: "Parle-G 500g",
    valueSaved: 1240,
    scoreImpact: 1,
    status: "success",
    executedAt: hoursAgo(2),
  },
  {
    id: "act-2",
    kind: "TRANSFER",
    productName: "Amul Cheese 200g",
    valueSaved: 890,
    scoreImpact: 1,
    status: "in_progress",
    executedAt: hoursAgo(4),
  },
  {
    id: "act-3",
    kind: "SUPPLIER_RETURN",
    productName: "Horlicks 1kg",
    valueSaved: 0,
    scoreImpact: 0,
    status: "ordered",
    executedAt: hoursAgo(26),
  },
];
