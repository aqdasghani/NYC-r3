"use client";

import { useEffect } from "react";

/**
 * Root error boundary — catches render/runtime errors anywhere in the app so a
 * failure shows a recoverable screen instead of a blank page. `reset()` re-runs
 * the failed segment, and the error is logged for observability.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled app error", error);
  }, [error]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "var(--color-bg-app)",
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 440,
          width: "100%",
          background: "var(--color-surface)",
          border: "1px solid var(--color-line)",
          borderRadius: 16,
          padding: 28,
          boxShadow: "var(--shadow-card)",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--color-danger)", margin: 0 }}>Something went wrong</p>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--color-ink)", margin: "10px 0 8px" }}>
          This page hit an unexpected error
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-dim)", lineHeight: 1.6, margin: "0 0 20px" }}>
          Your data is safe. Reloading usually resolves it — if it keeps happening, the error was logged.
        </p>
        <button
          onClick={reset}
          style={{
            background: "var(--color-brand)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 18px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </div>
    </main>
  );
}
