"use client";

import { Clock } from "lucide-react";
import { cn, STATUS_META } from "@/lib/utils";
import type { StockStatus } from "@/lib/types";

/** Small "Nd left" chip colored by status; clock icon when critical. */
export function ExpiryBadge({ days, status }: { days: number; status: StockStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium",
        meta.bg,
        meta.text
      )}
    >
      {days > 0 && days <= 3 && <Clock className="h-3 w-3" />}
      {days > 0 ? `${days}d left` : "—"}
    </span>
  );
}
