"use client";

import * as React from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  sub,
  delta,
  icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  /** Percent change vs previous period. Negative is a down arrow. */
  delta?: number;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-line bg-surface p-4 shadow-card", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-medium text-muted">{label}</p>
        {icon && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-subtle text-dim">
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-2xl font-semibold tracking-tight text-ink">{value}</p>
        {typeof delta === "number" && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-semibold",
              delta === 0
                ? "text-muted"
                : delta > 0
                  ? "text-success"
                  : "text-danger"
            )}
          >
            {delta === 0 ? (
              <Minus className="h-3 w-3" />
            ) : delta > 0 ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}
