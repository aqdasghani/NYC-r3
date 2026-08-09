"use client";

import { motion } from "motion/react";
import { Check, ListChecks, ScanLine, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

const icons = [UploadCloud, ScanLine, ListChecks, Check];

export function WizardStepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2">
      {steps.map((label, i) => {
        const Icon = icons[i] ?? Check;
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
            <div className="flex items-center gap-2">
              <motion.span
                animate={active ? { scale: 1.08 } : { scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold",
                  done && "border-accent bg-accent text-bg",
                  active && "border-accent bg-accent/15 text-accent",
                  !done && !active && "border-line text-dim"
                )}
              >
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </motion.span>
              <span className={cn("hidden text-xs font-medium sm:block", active ? "text-ink" : "text-dim")}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-white/8">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-accent"
                  initial={{ width: "0%" }}
                  animate={{ width: done ? "100%" : "0%" }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
