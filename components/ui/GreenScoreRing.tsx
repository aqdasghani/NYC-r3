"use client";

import { motion } from "motion/react";
import { useId } from "react";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { CountUp } from "./CountUp";

interface GreenScoreRingProps {
  value: number; // 0–100
  size?: number;
  strokeWidth?: number;
  label?: string;
  showDelta?: number;
  /** Animate immediately instead of on scroll (e.g. in the sidebar). */
  animate?: boolean;
  className?: string;
}

/**
 * Animated SVG score ring with gradient stroke + count-up center.
 * Reused at three scales: sidebar mini (56px), dashboard (160), green-score hero (200).
 */
export function GreenScoreRing({
  value,
  size = 160,
  strokeWidth = 10,
  label,
  showDelta,
  animate = false,
  className,
}: GreenScoreRingProps) {
  const gid = useId();
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value)) / 100;

  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8CC63F" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={animate ? { strokeDashoffset: c * (1 - pct) } : undefined}
          whileInView={
            animate ? undefined : { strokeDashoffset: c * (1 - pct) }
          }
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 1.5, ease: EASE }}
          style={{ filter: "drop-shadow(0 0 8px rgba(140,198,63,0.45))" }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div
          className="font-heading font-bold leading-none text-ink"
          style={{ fontSize: Math.max(16, size * 0.22) }}
        >
          <CountUp value={value} format={(n) => String(Math.round(n))} duration={1500} />
        </div>
        {label && (
          <span
            className="mt-1 text-dim"
            style={{ fontSize: Math.max(9, size * 0.062) }}
          >
            {label}
          </span>
        )}
        {showDelta !== undefined && showDelta > 0 && (
          <span
            className="mt-1.5 rounded-full bg-accent/15 px-2 py-0.5 font-semibold text-accent"
            style={{ fontSize: Math.max(9, size * 0.055) }}
          >
            +{showDelta} this month
          </span>
        )}
      </div>
    </div>
  );
}
