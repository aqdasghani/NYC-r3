"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  key: string;
  label: React.ReactNode;
  badge?: number;
  disabled?: boolean;
}

export function Tabs({
  items,
  active,
  onChange,
  className,
}: {
  items: TabItem[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn("flex items-center gap-1 overflow-x-auto border-b border-line", className)}
      role="tablist"
    >
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <button
            key={item.key}
            role="tab"
            aria-selected={isActive}
            disabled={item.disabled}
            onClick={() => onChange(item.key)}
            className={cn(
              "relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors",
              isActive ? "text-ink" : "text-muted hover:text-dim",
              item.disabled && "pointer-events-none opacity-40"
            )}
          >
            {item.label}
            {typeof item.badge === "number" && item.badge > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                  isActive ? "bg-brand-soft text-brand-strong" : "bg-subtle text-dim"
                )}
              >
                {item.badge}
              </span>
            )}
            {isActive && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" />
            )}
          </button>
        );
      })}
    </div>
  );
}
