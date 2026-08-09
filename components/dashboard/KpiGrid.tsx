"use client";

import { motion } from "motion/react";
import type { KPI } from "@/lib/types";
import { useKpiStore } from "@/stores/useKpiStore";
import { KPICard } from "./KPICard";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

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
