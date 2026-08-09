"use client";

import { AnimatePresence } from "motion/react";
import { useToastStore } from "@/stores/useToastStore";
import { Toast } from "./Toast";

/** Fixed top-right toast viewport. Mounted once in the root Providers. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed right-4 top-20 z-[60] flex w-[min(92vw,380px)] flex-col gap-3">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}
