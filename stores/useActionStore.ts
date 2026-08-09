"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ExecutedAction, Recommendation } from "@/lib/types";

interface ActionState {
  executed: ExecutedAction[];
  execute: (rec: Recommendation, productName: string) => void;
}

export const useActionStore = create<ActionState>()(
  persist(
    (set) => ({
      executed: [],
      execute: (rec, productName) =>
        set((s) => ({
          executed: [
            {
              id: `exec-${Date.now()}`,
              kind: rec.kind,
              productName,
              valueSaved: rec.valueImpact,
              scoreImpact: 1,
              status: "success",
              executedAt: new Date().toISOString(),
            },
            ...s.executed,
          ],
        })),
    }),
    {
      name: "Green Quant-executed-actions",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
