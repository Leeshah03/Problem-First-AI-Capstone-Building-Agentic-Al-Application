import { BiasTag } from "./BiasTag";

export function SignalCard({ signal, T }) {
  const isGong = signal.type === "gong";
  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: 8, padding: "14px 16px",
      borderLeft: `3px solid ${isGong ? "#7F56D9" : "#12B76A"}`,
      boxShadow: T.shadow,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
            padding: "2px 7px", borderRadius: 3, textTransform: "uppercase",
            background: isGong ? "#6941C622" : "#12B76A22",
            color: isGong ? "#7F56D9" : "#32D583",
          }}>
            {isGong ? `\uD83C\uDFA4 Gong ${signal.id}` : "\uD83D\uDCCB Canny"}
          </span>
          {isGong && signal.tag && <BiasTag tag={signal.tag} />}
        </div>
        {isGong && signal.arr > 0 && (
          <span style={{ fontSize: 11, color: "#6CE9A6", fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
            ${(signal.arr / 1000).toFixed(0)}K ARR
          </span>
        )}
        {!isGong && signal.votes > 0 && (
          <span style={{ fontSize: 11, color: "#7F56D9", fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
            \u25B2 {signal.votes} votes
          </span>
        )}
      </div>
      {isGong ? (
        <>
          <p style={{ margin: "0 0 6px", fontSize: 13, color: T.textBody, lineHeight: 1.55, fontStyle: "italic" }}>
            &ldquo;{signal.quote}&rdquo;
          </p>
          <div style={{ fontSize: 11, color: T.textDim }}>
            <span style={{ fontWeight: 600, color: T.textMuted }}>{signal.speaker}</span>
            {signal.account && <> &middot; {signal.account}</>}
          </div>
        </>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: T.textBody, fontWeight: 500 }}>{signal.title}</p>
      )}
    </div>
  );
}
