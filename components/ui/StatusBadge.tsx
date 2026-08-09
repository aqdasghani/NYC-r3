"use client";

import { cn, STATUS_META } from "@/lib/utils";
import type { StockStatus } from "@/lib/types";

/** Colored expiry/stock pill; CRITICAL pulses. */
export function StatusBadge({ status }: { status: StockStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide",
        meta.bg,
        meta.text,
        meta.border
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot, meta.pulse && "animate-pulse")} />
      {meta.label}
    </span>
  );
}
