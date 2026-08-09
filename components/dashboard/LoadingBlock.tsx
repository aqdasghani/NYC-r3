"use client";

import { cn } from "@/lib/utils";

/** Skeleton shimmer block. */
export function LoadingBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-slate-200/70", className)} />;
}

/** Convenience grid of skeleton cards. */
export function LoadingGrid({ cards = 4, className }: { cards?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {Array.from({ length: cards }).map((_, i) => (
        <LoadingBlock key={i} className="h-28" />
      ))}
    </div>
  );
}
