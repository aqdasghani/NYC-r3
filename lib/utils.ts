import type { Priority, RecommendationKind, StockStatus } from "@/lib/types";

/** Join truthy class parts. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** ₹18,420 */
export function formatINR(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

/** ₹4.82L / ₹18.4K / ₹842 */
export function formatCompactINR(n: number): string {
  if (n >= 100000) {
    const v = n / 100000;
    const s = Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
    return "₹" + s + "L";
  }
  if (n >= 1000) {
    const v = n / 1000;
    const s = Number.isInteger(v) ? String(v) : v.toFixed(1);
    return "₹" + s + "K";
  }
  return "₹" + Math.round(n);
}

/** Whole days between today and an ISO date (negative = past). */
export function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

/** "2h ago" / "Yesterday" / "3d ago" */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export const STATUS_META: Record<
  StockStatus,
  { label: string; text: string; bg: string; border: string; dot: string; pulse?: boolean }
> = {
  CRITICAL: { label: "CRITICAL", text: "text-critical", bg: "bg-critical/10", border: "border-critical/25", dot: "bg-critical", pulse: true },
  WARNING: { label: "WARNING", text: "text-warning", bg: "bg-warning/10", border: "border-warning/25", dot: "bg-warning" },
  UPCOMING: { label: "UPCOMING", text: "text-upcoming", bg: "bg-upcoming/10", border: "border-upcoming/25", dot: "bg-upcoming" },
  SAFE: { label: "SAFE", text: "text-safe", bg: "bg-safe/10", border: "border-safe/25", dot: "bg-safe" },
  DEAD_STOCK: { label: "DEAD STOCK", text: "text-dim", bg: "bg-white/5", border: "border-white/10", dot: "bg-dim" },
  OVERSTOCK: { label: "OVERSTOCK", text: "text-purple", bg: "bg-purple/10", border: "border-purple/25", dot: "bg-purple" },
};

export const PRIORITY_META: Record<
  Priority,
  { label: string; text: string; border: string; chipBg: string; chipText: string }
> = {
  URGENT: { label: "URGENT", text: "text-critical", border: "border-l-critical", chipBg: "bg-critical/15", chipText: "text-critical" },
  ACTION: { label: "ACTION", text: "text-warning", border: "border-l-warning", chipBg: "bg-warning/15", chipText: "text-warning" },
  REORDER: { label: "REORDER", text: "text-info", border: "border-l-info", chipBg: "bg-info/15", chipText: "text-info" },
  TRANSFER: { label: "TRANSFER", text: "text-purple", border: "border-l-purple", chipBg: "bg-purple/15", chipText: "text-purple" },
};

export const RECOMMENDATION_META: Record<
  RecommendationKind,
  { label: string; text: string; bg: string }
> = {
  DISCOUNT: { label: "Discount", text: "text-accent", bg: "bg-accent/10" },
  TRANSFER: { label: "Transfer", text: "text-purple", bg: "bg-purple/10" },
  SUPPLIER_RETURN: { label: "Supplier Return", text: "text-info", bg: "bg-info/10" },
};
