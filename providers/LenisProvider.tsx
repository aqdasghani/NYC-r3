"use client";

import { ReactLenis } from "lenis/react";
import { useEffect, useState } from "react";

/**
 * Buttery smooth scrolling for the whole app.
 * Disabled when the user prefers reduced motion; touch scroll stays native
 * (syncTouch: false) so low-end devices feel snappy.
 */
export function LenisProvider({ children }: { children: React.ReactNode }) {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }, []);

  return (
    <ReactLenis
      root
      options={{ duration: 1.1, smoothWheel: !reduced, syncTouch: false }}
    >
      {children}
    </ReactLenis>
  );
}
