export default function DashboardLoading() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "grid",
        placeItems: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 28,
            height: 28,
            margin: "0 auto 12px",
            borderRadius: "50%",
            border: "3px solid var(--color-line)",
            borderTopColor: "var(--color-brand)",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ fontSize: 14, color: "var(--color-muted)", margin: 0 }}>Loading…</p>
      </div>
    </div>
  );
}
