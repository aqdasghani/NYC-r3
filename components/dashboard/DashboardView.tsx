"use client";

import type { DashboardData } from "@/lib/types";
import { AiPriorities } from "./AiPriorities";
import { GreenScorePanel } from "./GreenScorePanel";
import { KpiGrid } from "./KpiGrid";

export function DashboardView({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-6">
      <KpiGrid kpis={data.kpis} />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <AiPriorities priorities={data.priorities} />
        </div>
        <div className="lg:col-span-2">
          <GreenScorePanel score={data.score} />
        </div>
      </div>
    </div>
  );
}
