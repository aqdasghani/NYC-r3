import Link from "next/link";

export default function NotFound() {
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
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--color-brand)", margin: 0 }}>404</p>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--color-ink)", margin: "10px 0 8px" }}>
          Page not found
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-dim)", lineHeight: 1.6, margin: "0 0 20px" }}>
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Link
          href="/dashboard"
          style={{
            display: "inline-block",
            background: "var(--color-brand)",
            color: "#fff",
            textDecoration: "none",
            borderRadius: 8,
            padding: "10px 18px",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
