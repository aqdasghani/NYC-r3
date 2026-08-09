"use client";

import { motion } from "motion/react";
import type { KPI } from "@/lib/types";
import { fadeUp, stagger } from "@/lib/motion";
import { useKpiStore } from "@/stores/useKpiStore";
import { KPICard } from "./KPICard";

const container = stagger(0.08, 0.1);
const item = fadeUp;

/** KPI cards driven by the live KPI store so executed actions update them. */
export function KpiGrid({ kpis: seed }: { kpis: KPI[] }) {
  const liveKpis = useKpiStore((s) => s.kpis);
  const kpis = liveKpis.length ? liveKpis : seed;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {kpis.map((kpi) => (
        <motion.div key={kpi.id} variants={item}>
          <KPICard kpi={kpi} />
        </motion.div>
      ))}
    </motion.div>
  );
}
