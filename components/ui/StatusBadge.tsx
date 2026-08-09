"use client";

import * as React from "react";
import type { StockStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<StockStatus, { chip: string; dot: string; label: string }> = {
  CRITICAL: {
    chip: "bg-danger-soft text-[#8f1d17] border-danger/30",
    dot: "bg-danger",
    label: "Critical",
  },
  WARNING: {
    chip: "bg-warning-soft text-warning border-warning/25",
    dot: "bg-warning",
    label: "Warning",
  },
  UPCOMING: {
    chip: "bg-info-soft text-info border-info/25",
    dot: "bg-info",
    label: "Upcoming",
  },
  SAFE: {
    chip: "bg-success-soft text-brand-strong border-brand/20",
    dot: "bg-success",
    label: "Safe",
  },
  DEAD_STOCK: {
    chip: "bg-subtle text-dim border-line-strong",
    dot: "bg-muted",
    label: "Dead Stock",
  },
  OVERSTOCK: {
    chip: "bg-[#eef3f5] text-[#41565e] border-[#d3dce0]",
    dot: "bg-[#7b8c94]",
    label: "Overstock",
  },
};

export function StatusBadge({
  status,
  label,
  pulse,
  className,
}: {
  status: StockStatus;
  label?: string;
  pulse?: boolean;
  className?: string;
}) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-semibold leading-4",
        s.chip,
        className
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", s.dot, pulse && "animate-pulse")}
      />
      {label ?? s.label}
    </span>
  );
}
