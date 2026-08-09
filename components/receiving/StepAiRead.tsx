"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useWizardStore } from "@/stores/useWizardStore";
import { Button } from "@/components/ui/Button";
import { CountUp } from "@/components/ui/CountUp";
import { GlassCard } from "@/components/ui/GlassCard";

/** The "magic moment": scanning animation + extracted fields, then Continue. */
export function StepAiRead() {
  const invoice = useWizardStore((s) => s.invoice);
  const setStep = useWizardStore((s) => s.setStep);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 2600);
    return () => window.clearTimeout(t);
  }, []);

  const totalUnits = invoice?.items.reduce((a, b) => a + b.qty, 0) ?? 0;

  const fields: Array<[string, string | number]> = [
    ["Supplier", invoice?.supplier ?? "—"],
    ["Invoice No.", invoice?.invoiceNo ?? "—"],
    ["Products", `${invoice?.items.length ?? 0} line items`],
    ["Total units", totalUnits],
  ];

  return (
    <div className="grid items-center gap-8 sm:grid-cols-2">
      {/* Scanning document frame */}
      <div className="relative mx-auto aspect-[3/4] w-full max-w-[280px] overflow-hidden rounded-2xl border border-accent/30 bg-elevated/60 shadow-glow-soft">
        <div className="p-5">
          <div className="flex items-center justify-between text-[11px] text-dim">
            <span>{invoice?.invoiceNo}</span>
            <span>{invoice?.supplier}</span>
          </div>
          <div className="mt-6 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-2.5 rounded bg-white/8"
                style={{ width: `${100 - i * 14}%` }}
              />
            ))}
            <div className="h-2 w-1/3 rounded bg-white/8" />
          </div>
        </div>
        {/* Moving scan bar */}
        <motion.div
          aria-hidden
          className="absolute inset-x-4 h-1 rounded-full bg-accent/50 shadow-[0_0_12px_rgba(140,198,63,0.6)]"
          animate={{ top: ["10%", "82%", "10%"] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
        {ready && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute inset-x-0 bottom-3 flex justify-center"
          >
            <span className="rounded-full bg-accent/20 px-3 py-1 text-[11px] font-semibold text-accent">
              ✓ Extraction complete
            </span>
          </motion.div>
        )}
      </div>

      {/* Progress + extracted fields */}
      <div className="space-y-5">
        <div>
          <div className="flex items-end gap-2">
            <CountUp
              value={100}
              format={(n) => `${Math.round(n)}%`}
              duration={2400}
              className="font-heading text-4xl font-bold text-accent"
            />
            <span className="pb-1 text-xs text-dim">AI confidence</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/6">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-accent to-safe"
              initial={{ width: "4%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2.4, ease: "easeInOut" }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">Confidence threshold: HIGH</p>
        </div>

        <GlassCard className="divide-y divide-line p-2">
          {fields.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between px-3 py-2.5 text-sm">
              <span className="text-muted">{k}</span>
              <span className="flex items-center gap-2 font-medium text-ink">
                {v}
                <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                  ✓
                </span>
              </span>
            </div>
          ))}
        </GlassCard>

        <Button className="w-full" size="lg" disabled={!ready} onClick={() => setStep(2)}>
          {ready ? "Review items →" : "Scanning invoice…"}
        </Button>
      </div>
    </div>
  );
}
