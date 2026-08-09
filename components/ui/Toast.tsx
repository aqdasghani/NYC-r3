"use client";

import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X, Zap } from "lucide-react";
import type { Toast as ToastType, ToastVariant } from "@/lib/types";
import { cn } from "@/lib/utils";

const meta: Record<
  ToastVariant,
  { icon: typeof Info; color: string; chip: string }
> = {
  success: { icon: CheckCircle2, color: "text-safe", chip: "bg-safe/15" },
  info: { icon: Info, color: "text-info", chip: "bg-info/15" },
  error: { icon: AlertTriangle, color: "text-critical", chip: "bg-critical/15" },
  action: { icon: Zap, color: "text-accent", chip: "bg-accent/15" },
};

export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastType;
  onDismiss: (id: string) => void;
}) {
  const { icon: Icon, color, chip } = meta[toast.variant];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 64, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 32 }}
      className="pointer-events-auto relative w-full overflow-hidden rounded-card border border-line bg-elevated/90 p-4 shadow-card backdrop-blur-xl"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className={cn("mt-0.5 shrink-0 rounded-lg p-2", chip)}>
          <Icon className={cn("h-4 w-4", color)} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{toast.title}</p>
          {toast.message && (
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              {toast.message}
            </p>
          )}
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="shrink-0 rounded-md p-1 text-dim transition-colors hover:bg-white/5 hover:text-ink"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <motion.span
        layoutId={`toast-progress-${toast.id}`}
        className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-accent/40"
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: (toast.duration ?? 4200) / 1000, ease: "linear" }}
      />
    </motion.div>
  );
}
