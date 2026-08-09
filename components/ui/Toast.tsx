"use client";

import { AlertTriangle, CheckCircle2, Info, X, Zap } from "lucide-react";
import type { Toast as ToastType, ToastVariant } from "@/lib/types";
import { cn } from "@/lib/utils";

const meta: Record<ToastVariant, { icon: typeof Info; chip: string; iconColor: string }> = {
  success: { icon: CheckCircle2, chip: "bg-success-soft", iconColor: "text-success" },
  info: { icon: Info, chip: "bg-info-soft", iconColor: "text-info" },
  error: { icon: AlertTriangle, chip: "bg-danger-soft", iconColor: "text-danger" },
  action: { icon: Zap, chip: "bg-brand-soft", iconColor: "text-brand" },
};

export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastType;
  onDismiss: (id: string) => void;
}) {
  const { icon: Icon, chip, iconColor } = meta[toast.variant];
  return (
    <div
      className="pointer-events-auto relative w-full overflow-hidden rounded-lg border border-line bg-surface p-3 shadow-popover"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-2.5">
        <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md", chip)}>
          <Icon className={cn("h-3.5 w-3.5", iconColor)} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{toast.title}</p>
          {toast.message && (
            <p className="mt-0.5 text-xs leading-relaxed text-muted">{toast.message}</p>
          )}
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="shrink-0 rounded-md p-1 text-muted transition-colors hover:bg-subtle hover:text-ink"
          aria-label="Dismiss notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <span className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-brand/25" />
    </div>
  );
}
