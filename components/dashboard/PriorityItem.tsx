"use client";

import type { Risk } from "@/lib/types";
import { cn, formatINR, PRIORITY_META } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export function PriorityItem({
  risk,
  onExecute,
}: {
  risk: Risk;
  onExecute: (risk: Risk) => void;
}) {
  const meta = PRIORITY_META[risk.priority];
  const isReorder = risk.priority === "REORDER";

  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 rounded-xl border border-line bg-surface/50 p-4 transition-colors hover:bg-surface/80",
        "border-l-4",
        meta.border
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide",
              meta.chipBg,
              meta.chipText
            )}
          >
            {meta.label}
          </span>
          <span className="truncate text-sm font-medium text-ink">{risk.productName}</span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted">{risk.reason}</p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {risk.riskValue > 0 && (
          <span className="text-sm font-semibold text-critical">
            {formatINR(risk.riskValue)} at risk
          </span>
        )}
        <Button size="sm" variant={isReorder ? "outline" : "primary"} onClick={() => onExecute(risk)}>
          {isReorder ? "Review" : "Execute"} →
        </Button>
      </div>
    </div>
  );
}
