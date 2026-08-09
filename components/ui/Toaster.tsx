"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useToastStore } from "./useToast";
import { Toast } from "./Toast";

/** Fixed top-right toast viewport. Mount once in the dashboard layout. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed right-4 top-20 z-[60] flex w-[min(92vw,380px)] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            <Toast toast={t} onDismiss={dismiss} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
