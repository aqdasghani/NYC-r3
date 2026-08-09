"use client";

import { cn } from "@/lib/utils";
import { ProgressBar } from "./ProgressBar";

/** AI confidence with color-coded threshold. */
export function ConfidenceBar({ value }: { value: number }) {
  const color =
    value >= 85 ? "bg-accent" : value >= 70 ? "bg-warning" : "bg-info";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] text-muted">
        <span>AI confidence</span>
        <span className={cn("font-semibold", value >= 85 ? "text-accent" : value >= 70 ? "text-warning" : "text-info")}>
          {value}%
        </span>
      </div>
      <ProgressBar value={value} barClassName={color} height={4} />
    </div>
  );
}
