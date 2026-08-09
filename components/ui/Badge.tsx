import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-subtle text-dim border-line",
  brand: "bg-brand-soft text-brand-strong border-brand/20",
  success: "bg-success-soft text-brand-strong border-brand/20",
  warning: "bg-warning-soft text-warning border-warning/25",
  danger: "bg-danger-soft text-[#8f1d17] border-danger/25",
  info: "bg-info-soft text-info border-info/25",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = "neutral", className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-semibold leading-4",
        tones[tone],
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
