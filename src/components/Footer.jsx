export function Footer({ T, isMobile, isTablet, px }) {
  return (
    <div style={{ padding: `16px ${px}px`, borderTop: `1px solid ${T.border}`, fontSize: 12, color: T.textMuted, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontWeight: 600, color: T.textTitle, fontSize: 13 }}>Confidence Score Breakdown</div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 16 }}>
        <div>
          <span style={{ fontWeight: 600, color: T.textBody }}>Revenue Impact (40%)</span>
          <div style={{ marginTop: 4, lineHeight: 1.5 }}>Likelihood of driving retention, revenue expansion, upsell, or net-new bookings.</div>
        </div>
        <div>
          <span style={{ fontWeight: 600, color: T.textBody }}>Strategic Fit (20%)</span>
          <div style={{ marginTop: 4, lineHeight: 1.5 }}>Alignment with company OKRs, product vision, and current roadmap priorities.</div>
        </div>
        <div>
          <span style={{ fontWeight: 600, color: T.textBody }}>Competitive Diff (20%)</span>
          <div style={{ marginTop: 4, lineHeight: 1.5 }}>How much this gap is exploited by competitors and its impact on win/loss rates.</div>
        </div>
        <div>
          <span style={{ fontWeight: 600, color: T.textBody }}>Signal Frequency (20%)</span>
          <div style={{ marginTop: 4, lineHeight: 1.5 }}>Volume and recency of mentions across Gong transcripts and Canny feature requests.</div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: T.textMuted, borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
        Sources: 42 Gong Transcripts &middot; 4,329 Canny Feature Requests &middot; Competitive Analysis
      </div>
    </div>
  );
}
