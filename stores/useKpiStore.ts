"use client";

import { create } from "zustand";
import { kpis as seed } from "@/lib/data";
import type { KPI } from "@/lib/types";

interface KpiState {
  kpis: KPI[];
  setKpis: (kpis: KPI[]) => void;
  /** Add an amount to specific KPIs by id (e.g. after executing an action). */
  bump: (delta: Partial<Record<string, number>>) => void;
}

export const useKpiStore = create<KpiState>((set) => ({
  kpis: seed,
  setKpis: (kpis) => set({ kpis }),
  bump: (delta) =>
    set((s) => ({
      kpis: s.kpis.map((k) =>
        delta[k.id] ? { ...k, value: k.value + (delta[k.id] ?? 0) } : k
      ),
    })),
}));
