"use client";

import { useCountUp } from "@/hooks/useCountUp";

interface CountUpProps {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  delay?: number;
  className?: string;
}

/** Animates 0 → value. Inherits font-size from parent. */
export function CountUp({
  value,
  format = (n) => Math.round(n).toLocaleString("en-IN"),
  duration = 1200,
  delay = 0,
  className,
}: CountUpProps) {
  const v = useCountUp(value, duration, delay);
  return <span className={className}>{format(v)}</span>;
}
