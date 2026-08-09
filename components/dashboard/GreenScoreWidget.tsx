"use client";

import React, { useEffect, useState } from "react";
import { Leaf, X } from "lucide-react";
import { getGreenScore } from "@/lib/api";
import { subscribeLive } from "@/lib/live";
import type { ScoreData } from "@/lib/types";

/**
 * Compact dark "gauge" widget shown in the sidebar. Loads the live green
 * score and refreshes when the backend publishes score updates.
 */
export function GreenScoreWidget({ onDismiss }: { onDismiss?: () => void }) {
  const [score, setScore] = useState<ScoreData | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getGreenScore().then((s) => {
      if (!cancelled) setScore(s);
    });
    const unsub = subscribeLive((event) => {
      if (event.type === "green_score_updated") {
        void getGreenScore().then((s) => {
          if (!cancelled) setScore(s);
        });
      }
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const value = score?.score ?? 0;
  const delta = score?.delta ?? 0;
  const up = delta >= 0;
  // Gauge sweep: 0–100 → 0–125 units of arc dasharray.
  const dash = Math.max(0, Math.min(125, (value / 100) * 125));

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#0A412A] bg-[#042417] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-white">Green Score</span>
        {onDismiss && (
          <button onClick={onDismiss} className="text-slate-500 transition-colors hover:text-slate-300" aria-label="Hide green score">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="relative flex justify-center py-2">
        <svg viewBox="0 0 100 50" className="h-16 w-32 overflow-visible">
          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#0A412A" strokeWidth="8" strokeLinecap="round" />
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="#0FA958"
            strokeWidth="8"
            strokeLinecap="round"
            style={{ strokeDasharray: "125", strokeDashoffset: String(125 - dash), filter: "drop-shadow(0 0 4px rgba(15,169,88,0.6))" }}
          />
        </svg>
        <div className="absolute bottom-0 flex flex-col items-center">
          <div className="text-2xl font-bold leading-none text-white">
            {value}
            <span className="text-sm font-normal text-slate-400">/100</span>
          </div>
        </div>
        <div
          className="absolute bottom-1 rounded-full border-2 border-[#042417] bg-[#0FA958] p-1 shadow-[0_0_10px_rgba(15,169,88,0.8)]"
          style={{ transform: "rotate(25deg) translateY(-25px)" }}
        >
          <Leaf className="h-3 w-3 text-white" />
        </div>
      </div>

      <div className="mt-4 text-center">
        <div className={`flex items-center justify-center gap-1 text-[10px] font-semibold ${up ? "text-[#0FA958]" : "text-amber-400"}`}>
          <span>{up ? "↑" : "↓"} {Math.abs(delta)} this month</span>
        </div>
        <div className="mt-1 text-xs text-slate-300">{value >= 80 ? "Great progress!" : value >= 60 ? "On track" : "Room to improve"}</div>
      </div>
    </div>
  );
}
