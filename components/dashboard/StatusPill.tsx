"use client";

import { cn } from "@/lib/utils";

export type PillTone = "CRITICAL" | "WARNING" | "UPCOMING" | "SAFE" | "DEAD_STOCK" | "OVERSTOCK";

const TONES: Record<PillTone, { label: string; cls: string; dot: string; pulse?: boolean }> = {
  CRITICAL: { label: "Critical", cls: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500", pulse: true },
  WARNING: { label: "Warning", cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  UPCOMING: { label: "Upcoming", cls: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  SAFE: { label: "Safe", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  DEAD_STOCK: { label: "Dead Stock", cls: "bg-slate-100 text-slate-600 border-slate-300", dot: "bg-slate-500" },
  OVERSTOCK: { label: "Overstock", cls: "bg-purple-50 text-purple-700 border-purple-200", dot: "bg-purple-500" },
};

/** Colored expiry/stock status pill (light theme). */
export function StatusPill({ status, className }: { status: PillTone; className?: string }) {
  const meta = TONES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide whitespace-nowrap",
        meta.cls,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot, meta.pulse && "animate-pulse")} />
      {meta.label}
    </span>
  );
}
