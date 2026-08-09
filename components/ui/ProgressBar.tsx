"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number; // 0–100
  className?: string;
  barClassName?: string;
  height?: number;
}

/** Animated fill bar — draws to `value` on scroll into view. */
export function ProgressBar({ value, className, barClassName, height = 6 }: ProgressBarProps) {
  return (
    <div
      className={cn("w-full overflow-hidden rounded-full bg-white/6", className)}
      style={{ height }}
    >
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className={cn("h-full rounded-full", barClassName ?? "bg-accent")}
      />
    </div>
  );
}
