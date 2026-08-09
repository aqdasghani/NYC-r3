"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { EASE } from "@/lib/motion";

/**
 * Enter-only page transition. App Router swaps pages synchronously so there's
 * no AnimatePresence exit — a keyed enter slide gives a clean, fast feel.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
