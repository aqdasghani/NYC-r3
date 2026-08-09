"use client";

import type { ScoreData } from "@/lib/types";
import { GlassCard } from "@/components/ui/GlassCard";
import { GreenScoreRing } from "@/components/ui/GreenScoreRing";
import { CategoryBar } from "./CategoryBar";

export function GreenScorePanel({ score }: { score: ScoreData }) {
  return (
    <GlassCard green className="flex h-full flex-col p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-bold text-ink">Green Score</h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent">
          <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-accent" />
          Live
        </span>
      </div>

      <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-6 sm:flex-row sm:gap-5">
        <GreenScoreRing value={score.score} size={160} strokeWidth={10} showDelta={score.delta} />
        <div className="w-full max-w-xs space-y-3.5 sm:max-w-none sm:flex-1">
          {score.categories.map((c) => (
            <CategoryBar key={c.id} category={c} />
          ))}
        </div>
      </div>
    </GlassCard>
  );
}
