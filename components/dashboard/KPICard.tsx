"use client";

import type { KPI } from "@/lib/types";
import { cn, formatCompactINR, formatINR } from "@/lib/utils";
import { CountUp } from "@/components/ui/CountUp";
import { GlassCard } from "@/components/ui/GlassCard";
import { Sparkline } from "@/components/ui/Sparkline";

const accentMap = {
  accent: { stroke: "#8CC63F", chip: "bg-accent/10 text-accent" },
  ink: { stroke: "#94A3B8", chip: "bg-white/10 text-muted" },
  warning: { stroke: "#F59E0B", chip: "bg-warning/10 text-warning" },
  safe: { stroke: "#22C55E", chip: "bg-safe/10 text-safe" },
} as const;

export function KPICard({ kpi }: { kpi: KPI }) {
  const acc = accentMap[kpi.accent];
  const up = kpi.deltaPct >= 0;

  const format =
    kpi.unit === "inr"
      ? kpi.value >= 100000
        ? formatCompactINR
        : formatINR
      : (n: number) => Math.round(n).toLocaleString("en-IN");

  return (
    <GlassCard hover className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-lg" aria-hidden>
          {kpi.icon}
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
            acc.chip,
            !up && "bg-critical/10 text-critical"
          )}
        >
          {up ? "▲" : "▼"} {Math.abs(kpi.deltaPct)}%
        </span>
      </div>

      <p className="mt-3 font-heading text-2xl font-bold text-ink sm:text-[28px]">
        <CountUp value={kpi.value} format={format} />
      </p>
      <p className="mt-1 text-sm text-muted">{kpi.label}</p>

      <div className="mt-3">
        <Sparkline data={kpi.spark} stroke={acc.stroke} />
      </div>
    </GlassCard>
  );
}
