export function ScoreBar({ score, label, color, T }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
      <span style={{ width: 110, color: T.textBody, fontWeight: 500 }}>{label}</span>
      <div style={{ flex: 1, height: 8, background: T.barBg, borderRadius: 4, overflow: "hidden" }}>
        <div style={{
          width: `${score}%`, height: "100%", borderRadius: 4,
          background: color,
          transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
        }} />
      </div>
      <span style={{
        width: 28, textAlign: "right", fontWeight: 600,
        color: T.textTitle, fontFamily: "'Inter', sans-serif", fontSize: 12,
      }}>
        {score}
      </span>
    </div>
  );
}
