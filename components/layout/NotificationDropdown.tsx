"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { useHydrated } from "@/hooks/useHydrated";
import { useNotificationStore } from "@/stores/useNotificationStore";
import type { NotificationType } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

const meta: Record<
  NotificationType,
  { icon: typeof Info; color: string; chip: string }
> = {
  danger: { icon: AlertTriangle, color: "text-critical", chip: "bg-critical/15" },
  info: { icon: Info, color: "text-info", chip: "bg-info/15" },
  success: { icon: CheckCircle2, color: "text-safe", chip: "bg-safe/15" },
};

export function NotificationDropdown({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { notifications, markAllRead, markRead } = useNotificationStore();
  const hydrated = useHydrated();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 z-50 mt-2 w-[min(92vw,360px)] origin-top-right overflow-hidden rounded-card border border-line bg-elevated/95 shadow-card backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="text-sm font-semibold text-ink">Notifications</p>
              <button
                onClick={markAllRead}
                className="text-xs font-medium text-accent hover:underline"
              >
                Mark all read
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto" data-lenis-prevent>
              {notifications.map((n) => {
                const { icon: Icon, color, chip } = meta[n.type];
                return (
                  <button
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/4",
                      !n.read && "bg-accent/5"
                    )}
                  >
                    <span className={cn("mt-0.5 shrink-0 rounded-lg p-1.5", chip)}>
                      <Icon className={cn("h-4 w-4", color)} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-ink">{n.title}</span>
                        <span className="shrink-0 text-[10px] text-dim">
                          {hydrated ? timeAgo(n.createdAt) : ""}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                        {n.body}
                      </span>
                    </span>
                    {!n.read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="border-t border-line p-2">
              <button
                onClick={onClose}
                className="w-full rounded-lg px-3 py-2 text-center text-xs font-medium text-muted transition-colors hover:bg-white/5 hover:text-ink"
              >
                View all
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
