"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand-strong focus-visible:ring-brand/30 disabled:hover:bg-brand",
  outline:
    "border border-line-strong bg-surface text-ink hover:bg-subtle focus-visible:ring-line-strong/40",
  ghost:
    "text-dim hover:bg-subtle hover:text-ink focus-visible:ring-line-strong/40",
  danger:
    "bg-danger text-white hover:bg-[#8f1d17] focus-visible:ring-danger/30 disabled:hover:bg-danger",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
  lg: "h-10 px-5 text-sm",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, children, disabled, loading, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors duration-150",
          "focus-visible:ring-2 focus-visible:outline-none active:scale-[0.98]",
          variants[variant],
          sizes[size],
          disabled && "pointer-events-none opacity-50",
          className
        )}
        {...rest}
      >
        {loading && <span className="w-4 h-4 animate-spin border-2 border-current border-t-transparent rounded-full" />}
        {!loading && children}
      </button>
    );
  }
);
Button.displayName = "Button";
