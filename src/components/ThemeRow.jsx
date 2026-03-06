import { useState } from "react";
import { computeScore, getScoreColor, formatARR } from "../utils/scoring";
import { ScoreBar } from "./ScoreBar";
import { SignalCard } from "./SignalCard";

export function ThemeRow({ theme, rank, isOpen, onToggle, T, isMobile }) {
  const [isHovered, setIsHovered] = useState(false);
  const [activeTab, setActiveTab] = useState("evidence");
  const [scoreHovered, setScoreHovered] = useState(false);
  const score = computeScore(theme);
  const gongCount = theme.signals.filter(s => s.type === "gong").length;
  const cannyCount = theme.signals.filter(s => s.type === "canny").length;
  const scoreColor = getScoreColor(score);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: isHovered && !isOpen ? T.surfaceHover : T.surface,
        border: isOpen ? `1px solid ${T.borderActive}` : `1px solid ${isHovered ? T.borderSubtle : T.border}`,
        borderRadius: 12, overflow: "hidden",
        transition: "background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
        boxShadow: isHovered ? T.shadowMd : T.shadow,
      }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%", border: "none", background: "transparent",
          cursor: "pointer", padding: isMobile ? "14px 14px" : "18px 22px",
          display: "flex", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? 10 : 16,
          color: T.text, textAlign: "left",
        }}
      >
        <div style={{
          width: isMobile ? 28 : 36, height: isMobile ? 28 : 36, borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: rank <= 3 ? `${scoreColor}15` : T.pill,
          border: `1px solid ${rank <= 3 ? scoreColor + "40" : T.borderSubtle}`,
          fontWeight: 800, fontSize: isMobile ? 12 : 14, color: rank <= 3 ? scoreColor : T.textDim,
          fontFamily: "'Inter', sans-serif", flexShrink: 0, marginTop: isMobile ? 2 : 0,
        }}>
          {rank}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 10, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600, fontSize: isMobile ? 13 : 15, color: T.textTitle }}>{theme.name}</span>
            {!isMobile && (
              <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 16, background: T.pill, color: T.pillText, fontWeight: 500, whiteSpace: "nowrap" }}>
                {theme.productArea}
              </span>
            )}
            {!isMobile && theme.jiraStatus && (
              <span title={`${theme.jiraKey} \u00B7 ${theme.jiraStatus}`} style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                fontSize: 11, fontWeight: 500, letterSpacing: "0.01em",
                padding: "2px 10px", borderRadius: 16, cursor: "help", whiteSpace: "nowrap",
                background: "#EFF8FF", color: "#175CD3", border: "1px solid #B2DDFF",
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.35V2.84a.84.84 0 00-.84-.84H11.53zM6.77 6.8a4.36 4.36 0 004.34 4.34h1.8v1.72a4.36 4.36 0 004.34 4.34V7.63a.84.84 0 00-.84-.84H6.77zM2 11.6a4.35 4.35 0 004.35 4.35h1.78v1.71c0 2.4 1.94 4.34 4.34 4.34v-9.56a.84.84 0 00-.84-.84H2z"/>
                </svg>
                {theme.jiraKey}
              </span>
            )}
            {theme.signals.filter(s => s.competitors && s.competitors.length > 0).length === 0 && (
              <DifferentiatorBadge />
            )}
          </div>
          {!isMobile && (
            <p style={{ margin: 0, fontSize: 13, color: T.textMuted, lineHeight: 1.5, maxWidth: 700 }}>{theme.description}</p>
          )}
          {isMobile && (
            <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 11, color: T.textMuted }}>
              <span>{gongCount + cannyCount} signals</span>
              <span style={{ color: "#12B76A" }}>{formatARR(theme.influencedARR)}</span>
              <span style={{ color: scoreColor, fontWeight: 600 }}>{score}</span>
            </div>
          )}
        </div>
        {!isMobile && (
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexShrink: 0 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 2 }}>Signals</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.textTitle }}>{gongCount + cannyCount}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 2 }}>ARR</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#12B76A" }}>
              {formatARR(theme.influencedARR)}
            </div>
          </div>
          <div style={{ position: "relative" }}
            onMouseEnter={(e) => { e.stopPropagation(); setScoreHovered(true); }}
            onMouseLeave={() => setScoreHovered(false)}
          >
            <div style={{
              width: 52, height: 52, borderRadius: 12,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              background: `${scoreColor}10`, border: `1px solid ${scoreColor}30`,
            }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>{score}</span>
              <span style={{ fontSize: 8, color: scoreColor, opacity: 0.7, fontWeight: 500, letterSpacing: "0.05em" }}>score</span>
            </div>
            {scoreHovered && (
              <div onClick={(e) => e.stopPropagation()} style={{
                position: "absolute", top: "100%", right: 0, marginTop: 8,
                background: T.surface, border: `1px solid ${T.border}`,
                borderRadius: 12, padding: 16, zIndex: 60, width: 260, boxShadow: T.shadowLg,
                display: "flex", flexDirection: "column", gap: 8,
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, marginBottom: 6 }}>Score Breakdown</div>
                <ScoreBar score={theme.revenueImpact} label="Revenue (40%)" color="#7F56D9" T={T} />
                <ScoreBar score={theme.strategicFit} label="Strategy (20%)" color="#7F56D9" T={T} />
                <ScoreBar score={theme.competitiveDiff} label="Competitive (20%)" color="#7F56D9" T={T} />
                <ScoreBar score={theme.signalFrequency} label="Signal Freq (20%)" color="#7F56D9" T={T} />
              </div>
            )}
          </div>
        </div>
        )}
        <div style={{
          width: 28, height: 28, borderRadius: 6,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: isMobile ? 16 : 20, color: isHovered ? T.textBody : T.textDim,
          transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.25s ease, color 0.2s ease",
        }}>
          \u25BE
        </div>
      </button>

      {isOpen && (
        <div style={{ padding: isMobile ? "0 14px 14px" : "0 22px 22px", borderTop: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", gap: 0, marginTop: 16, marginBottom: 18, borderBottom: `1px solid ${T.border}` }}>
            {[
              { key: "evidence", label: "Supporting Evidence", count: theme.signals.length },
              { key: "prototype", label: "Prototype" },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                padding: "10px 20px", border: "none", background: "transparent",
                cursor: "pointer", fontSize: 13, fontWeight: 500,
                color: activeTab === tab.key ? "#7F56D9" : T.textMuted,
                borderBottom: activeTab === tab.key ? "2px solid #7F56D9" : "2px solid transparent",
                transition: "all 0.2s ease", display: "flex", alignItems: "center", gap: 8, marginBottom: -1,
              }}>
                {tab.label}
                {tab.count && (
                  <span style={{
                    fontSize: 11, padding: "1px 8px", borderRadius: 16,
                    background: activeTab === tab.key ? "#F4EBFF" : T.pill,
                    color: activeTab === tab.key ? "#7F56D9" : T.textMuted, fontWeight: 500,
                  }}>{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {activeTab === "evidence" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {theme.signals.map((s, i) => <SignalCard key={i} signal={s} T={T} />)}
            </div>
          ) : (
            <PrototypePanel theme={theme} T={T} isMobile={isMobile} />
          )}
        </div>
      )}
    </div>
  );
}

function DifferentiatorBadge() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", cursor: "help", color: "#DC6803", position: "relative" }}
      onMouseEnter={e => { const tip = e.currentTarget.querySelector('[data-tip]'); if (tip) { const rect = e.currentTarget.getBoundingClientRect(); tip.style.position = "fixed"; tip.style.top = `${rect.top - 32}px`; tip.style.left = `${rect.left + rect.width / 2}px`; tip.style.transform = "translateX(-50%)"; tip.style.opacity = 1; } }}
      onMouseLeave={e => { const tip = e.currentTarget.querySelector('[data-tip]'); if (tip) tip.style.opacity = 0; }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="#FDB022" stroke="#DC6803" strokeWidth="1.5" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
      <span data-tip="true" style={{
        position: "fixed", top: 0, left: 0,
        background: "#101828", color: "#fff", fontSize: 11, fontWeight: 500,
        padding: "4px 10px", borderRadius: 6, whiteSpace: "nowrap",
        opacity: 0, transition: "opacity 0.15s ease", pointerEvents: "none", zIndex: 9999,
        boxShadow: "0px 4px 6px -2px rgba(16,24,40,0.1), 0px 12px 16px -4px rgba(16,24,40,0.1)",
      }}>
        Differentiator
      </span>
    </span>
  );
}

function PrototypePanel({ theme, T, isMobile }) {
  if (!theme.prototype) {
    return (
      <div style={{ textAlign: "center", padding: "48px 20px", color: T.textMuted }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: T.surfaceAlt, border: `1px solid ${T.border}`, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16, fontSize: 20, opacity: 0.5 }}>\uD83C\uDFA8</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.textTitle }}>No prototype available yet</div>
        <div style={{ fontSize: 13, color: T.textMuted, marginTop: 4, marginBottom: 20 }}>Prototype will be linked once design exploration begins</div>
        <button style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "10px 18px", borderRadius: 8, border: "none",
          background: "#7F56D9", color: "#fff",
          fontSize: 13, fontWeight: 600, cursor: "pointer",
          boxShadow: "0px 1px 2px rgba(16, 24, 40, 0.05)", transition: "background 0.2s ease",
        }}
          onMouseEnter={e => e.currentTarget.style.background = "#6941C6"}
          onMouseLeave={e => e.currentTarget.style.background = "#7F56D9"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
          Inspire me with a prototype
        </button>
      </div>
    );
  }

  const proto = theme.prototype;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 20, flexDirection: isMobile ? "column" : "row" }}>
        <div style={{ width: isMobile ? "100%" : 280, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{
            width: "100%", minHeight: 200, borderRadius: 10, overflow: "hidden",
            background: proto.thumbnailColor || "#1a1a2e",
            border: `1px solid ${T.border}`,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            position: "relative", cursor: "pointer",
          }}>
            <div style={{ width: "85%", opacity: 0.15 }}>
              <div style={{ height: 8, background: "#fff", borderRadius: 4, marginBottom: 8, width: "60%" }} />
              <div style={{ height: 5, background: "#fff", borderRadius: 3, marginBottom: 5, width: "100%" }} />
              <div style={{ height: 5, background: "#fff", borderRadius: 3, marginBottom: 5, width: "85%" }} />
              <div style={{ height: 5, background: "#fff", borderRadius: 3, marginBottom: 12, width: "70%" }} />
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <div style={{ height: 28, background: "#fff", borderRadius: 4, flex: 1 }} />
                <div style={{ height: 28, background: "#fff", borderRadius: 4, flex: 1 }} />
              </div>
              <div style={{ height: 40, background: "#fff", borderRadius: 6, width: "100%" }} />
            </div>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "10px 14px", background: "linear-gradient(transparent, rgba(0,0,0,0.6))" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "0.02em" }}>{proto.thumbnailLabel}</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>Claude Prototype</div>
            </div>
            <div style={{
              position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
              width: 40, height: 40, borderRadius: "50%",
              background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
                <path d="M16.5 2.5L7.5 21.5h3l2.25-4.75h6.5L21.5 21.5h3L16.5 2.5zm-.75 11.25L18 8.5l2.25 5.25h-4.5zM4.5 21.5L13.5 2.5h-3L4.5 15.25 1.5 21.5h3z"/>
              </svg>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {[
              { label: "Testers", value: proto.testers, link: "Maze", icon: "\u25C7" },
              { label: "Direct Success", value: `${proto.directSuccess}%`, link: "Maze", icon: "\u25C7" },
              { label: "Unfinished", value: `${proto.missionUnfinished}%`, link: "Pendo", icon: "\u25C6" },
            ].map((m, i) => (
              <div key={i} style={{
                background: T.surfaceAlt, border: `1px solid ${T.border}`,
                borderRadius: 8, padding: "8px 6px", textAlign: "center",
                cursor: "pointer", transition: "border-color 0.2s ease, background 0.2s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#7F56D960"; e.currentTarget.style.background = "#7F56D908"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.surfaceAlt; }}
              >
                <div style={{ fontSize: 16, fontWeight: 800, color: "#7F56D9", fontFamily: "'Inter', sans-serif", lineHeight: 1 }}>{m.value}</div>
                <div style={{ fontSize: 8, color: T.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 4 }}>{m.label}</div>
                <div style={{ fontSize: 8, color: "#7F56D9", fontWeight: 600, marginTop: 4, opacity: 0.7, display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
                  <span>{m.icon}</span> {m.link} \u2197
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 11, fontWeight: 500, padding: "2px 10px", borderRadius: 16,
              background: proto.status === "Validated" ? "#ECFDF3" : proto.status === "In Testing" ? "#FFF6ED" : "#F2F4F7",
              color: proto.status === "Validated" ? "#027A48" : proto.status === "In Testing" ? "#B93815" : "#344054",
              border: `1px solid ${proto.status === "Validated" ? "#A6F4C5" : proto.status === "In Testing" ? "#FEDF89" : "#EAECF0"}`,
            }}>
              {proto.status}
            </span>
            <span style={{ fontSize: 12, color: T.textMuted }}>v{proto.iterations} \u00B7 Updated {proto.lastUpdated}</span>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.textTitle, marginBottom: 8 }}>Proposed Improvements</div>
            <p style={{ margin: 0, fontSize: 13, color: T.textBody, lineHeight: 1.7 }}>{proto.description}</p>
          </div>
          {proto.features && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {proto.features.map((f, i) => (
                <span key={i} style={{ fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 16, background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.textBody }}>{f}</span>
              ))}
            </div>
          )}
          {proto.stakeholder && (
            <div style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 8, padding: "12px 14px", borderLeft: `3px solid #7F56D9` }}>
              <p style={{ margin: 0, fontSize: 12, color: T.textBody, lineHeight: 1.6, fontStyle: "italic" }}>&ldquo;{proto.stakeholder.quote}&rdquo;</p>
              <div style={{ marginTop: 8, fontSize: 11, color: T.textMuted, fontWeight: 500 }}>&mdash; {proto.stakeholder.name}, {proto.stakeholder.company}</div>
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: "auto", flexWrap: "wrap" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 14px", borderRadius: 8,
              background: "#7F56D908", border: `1px dashed #7F56D940`,
              color: "#7F56D9", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.5 2.5L7.5 21.5h3l2.25-4.75h6.5L21.5 21.5h3L16.5 2.5zm-.75 11.25L18 8.5l2.25 5.25h-4.5zM4.5 21.5L13.5 2.5h-3L4.5 15.25 1.5 21.5h3z"/>
              </svg>
              View in Claude
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: isMobile ? 10 : 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 8, background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.textDim} strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          <span style={{ fontSize: 16, fontWeight: 700, color: T.textTitle }}>{proto.views}</span>
          <span style={{ fontSize: 11, color: T.textDim }}>views</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 8, background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#F04438" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
          <span style={{ fontSize: 16, fontWeight: 700, color: T.textTitle }}>{proto.hearts}</span>
          <span style={{ fontSize: 11, color: T.textDim }}>loved this</span>
        </div>
      </div>
    </div>
  );
}
