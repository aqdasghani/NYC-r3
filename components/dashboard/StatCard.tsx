"use client";

import React from "react";
import { cn, formatCompactINR, formatINR } from "@/lib/utils";

type Accent = "green" | "blue" | "amber" | "red" | "ink" | "purple";

const ICON_BG: Record<Accent, string> = {
  green: "bg-emerald-100 text-emerald-700",
  blue: "bg-blue-100 text-blue-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
  ink: "bg-slate-100 text-slate-700",
  purple: "bg-purple-100 text-purple-700",
};

interface StatCardProps {
  label: string;
  value: number;
  /** true → render as ₹ INR; "compact" → compact notation. */
  money?: boolean | "compact";
  deltaPct?: number;
  sub?: string;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: Accent;
  loading?: boolean;
}

/** Compact KPI tile used across every dashboard page. */
export function StatCard({
  label,
  value,
  money,
  deltaPct,
  sub,
  icon: Icon,
  accent = "green",
  loading,
}: StatCardProps) {
  const formatted =
    money === "compact"
      ? formatCompactINR(value)
      : money
        ? formatINR(value)
        : Math.round(value).toLocaleString("en-IN");
  const up = (deltaPct ?? 0) >= 0;

  return (
    <div className="glass-panel flex flex-col justify-between p-4">
      <div className="mb-3 flex items-center gap-3">
        {Icon && (
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              ICON_BG[accent]
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
        <span className="text-xs font-semibold text-slate-500">{label}</span>
      </div>
      <div>
        {loading ? (
          <div className="h-7 w-24 animate-pulse rounded bg-slate-200" />
        ) : (
          <div className="text-2xl font-bold text-slate-900">{formatted}</div>
        )}
        {deltaPct !== undefined ? (
          <div
            className={cn(
              "mt-1 text-xs font-medium",
              up ? "text-emerald-600" : "text-red-500"
            )}
          >
            {up ? "↑" : "↓"} {Math.abs(deltaPct).toFixed(1)}%{" "}
            <span className="font-normal text-slate-400">vs last month</span>
          </div>
        ) : sub ? (
          <div className="mt-1 text-xs font-medium text-slate-500">{sub}</div>
        ) : null}
      </div>
    </div>
  );
}
