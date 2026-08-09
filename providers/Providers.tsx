"use client";

import { MotionConfig } from "framer-motion";
import { Toaster } from "@/components/ui/Toaster";
import { LenisProvider } from "./LenisProvider";

/** Root client providers: smooth scroll → motion config → toast viewport. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LenisProvider>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
      <Toaster />
    </LenisProvider>
  );
}
