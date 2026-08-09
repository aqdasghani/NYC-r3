"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary: "bg-accent text-bg font-semibold shadow-glow hover:bg-accent/90",
  ghost: "text-muted hover:bg-white/5 hover:text-ink",
  outline: "border border-line-strong text-ink hover:bg-white/5",
  danger: "border border-critical/25 bg-critical/15 text-critical hover:bg-critical/25",
};

const sizes: Record<Size, string> = {
  sm: "rounded-lg px-3 py-1.5 text-xs",
  md: "rounded-xl px-4 py-2.5 text-sm",
  lg: "rounded-xl px-6 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      disabled={disabled}
      className={cn(
        "focus-ring inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors duration-150",
        variants[variant],
        sizes[size],
        disabled && "pointer-events-none opacity-50",
        className
      )}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
