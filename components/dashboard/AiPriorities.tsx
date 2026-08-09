"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { RecommendationKind, Risk } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";
import { GlassCard } from "@/components/ui/GlassCard";
import { useActionStore } from "@/stores/useActionStore";
import { useKpiStore } from "@/stores/useKpiStore";
import { useToastStore } from "@/stores/useToastStore";
import { PriorityItem } from "./PriorityItem";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const item = {
  hidden: { opacity: 0, x: -14 },
  show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};

/** One-click execution from the dashboard — feeds the action engine + KPI bumps. */
export function AiPriorities({ priorities }: { priorities: Risk[] }) {
  const push = useToastStore((s) => s.push);
  const bump = useKpiStore((s) => s.bump);
  const execute = useActionStore((s) => s.execute);

  const handleExecute = (risk: Risk) => {
    const kind: RecommendationKind =
      risk.priority === "TRANSFER"
        ? "TRANSFER"
        : risk.priority === "REORDER"
          ? "SUPPLIER_RETURN"
          : "DISCOUNT";

    execute(
      {
        id: `rec-${risk.id}`,
        kind,
        title: risk.suggestedAction,
        description: risk.reason,
        unitsCleared: 0,
        valueImpact: risk.riskValue,
        confidence: 90,
      },
      risk.productName
    );

    if (risk.riskValue > 0) bump({ waste_prevented: risk.riskValue });

    push(
      risk.priority === "REORDER"
        ? { variant: "info", title: "Procurement flagged for review", message: risk.reason }
        : {
            variant: "success",
            title: `${risk.tag} · executed`,
            message: `${formatINR(risk.riskValue)} at risk resolved`,
          }
    );
  };

  return (
    <GlassCard green className="flex h-full flex-col p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-heading text-lg font-bold text-ink">AI Action Engine</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent">
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-accent" />
            Live
          </span>
        </div>
        <Link
          href="/actions"
          className={cn(
            "shrink-0 text-xs font-medium text-accent transition-colors hover:text-accent/80"
          )}
        >
          View all →
        </Link>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="space-y-3"
      >
        {priorities.map((risk) => (
          <motion.div key={risk.id} variants={item}>
            <PriorityItem risk={risk} onExecute={handleExecute} />
          </motion.div>
        ))}
      </motion.div>
    </GlassCard>
  );
}
