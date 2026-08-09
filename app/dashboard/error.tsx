"use client";

import { useEffect } from "react";

/** Dashboard-scoped error boundary — resets the failed page without a full reload. */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "grid",
        placeItems: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--color-danger)", margin: 0 }}>
          Something went wrong
        </p>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--color-ink)", margin: "10px 0 8px" }}>
          This section failed to load
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-dim)", lineHeight: 1.6, margin: "0 0 20px" }}>
          The error was logged. Try again — your data is safe.
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
    </div>
  );
}
