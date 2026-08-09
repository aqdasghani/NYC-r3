import * as React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Removes default padding so callers can build custom interiors. */
  noPadding?: boolean;
}

export function Card({ className, noPadding, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-line bg-surface shadow-card",
        !noPadding && "p-4 md:p-5",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Card header row: title + optional description and actions. */
export function CardHeader({
  title,
  description,
  actions,
  className,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  if (!title && !description && !actions) return null;
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        {title && (
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
        )}
        {description && (
          <p className="mt-0.5 text-xs text-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
