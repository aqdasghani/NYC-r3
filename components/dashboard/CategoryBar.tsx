"use client";

import type { ScoreCategory } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ProgressBar } from "@/components/ui/ProgressBar";

const tintBar: Record<ScoreCategory["tint"], string> = {
  accent: "bg-accent",
  info: "bg-info",
  warning: "bg-warning",
  safe: "bg-safe",
  purple: "bg-purple",
};

const tintText: Record<ScoreCategory["tint"], string> = {
  accent: "text-accent",
  info: "text-info",
  warning: "text-warning",
  safe: "text-safe",
  purple: "text-purple",
};

export function CategoryBar({ category }: { category: ScoreCategory }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted">{category.label}</span>
        <span className={cn("font-semibold", tintText[category.tint])}>{category.value}</span>
      </div>
      <ProgressBar value={category.value} barClassName={tintBar[category.tint]} height={5} />
    </div>
  );
}
