"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  green?: boolean;
  critical?: boolean;
  onClick?: () => void;
}

/** Glassmorphism surface from the design system. */
export function GlassCard({
  children,
  className,
  hover,
  green,
  critical,
  onClick,
}: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "glass",
        green && "glass--green",
        critical && "glass--critical",
        hover &&
          "transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:border-line-strong",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}
