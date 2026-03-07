// Project Sift v3.0 — Dropdown controls, no Signal tab
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useThemes } from "./hooks/useThemes.js";
import { useReviewQueue } from "./hooks/useReviewQueue.js";
import { useEventStream } from "./hooks/useEventStream.js";
import { setAuthTokenProvider, fetchConnectors, updateConnector, triggerConnectorSync, fetchActivity } from "./api/client.js";

let clerkAvailable = false;
let SignedIn, SignedOut, SignIn, UserButton, OrganizationSwitcher, useAuth, useOrganization;
try {
  const clerk = await import("@clerk/react");
  SignedIn = clerk.SignedIn;
  SignedOut = clerk.SignedOut;
  SignIn = clerk.SignIn;
  UserButton = clerk.UserButton;
  OrganizationSwitcher = clerk.OrganizationSwitcher;
  useAuth = clerk.useAuth;
  useOrganization = clerk.useOrganization;
  clerkAvailable = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
} catch { /* Clerk not available */ }
function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const handle = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);
  return width;
}
const BIAS_TAG_INFO = {
  "INTERNAL": { label: "Employee-Led", color: "#F79009", icon: "⚠", desc: "Employee drove conversation toward roadmap item, inflating signal" },
  "SOLUTION": { label: "Solution Bias", color: "#7F56D9", icon: "🔧", desc: "Customer stated a solution, not the underlying need" },
  "WHALE": { label: "Whale Account", color: "#2E90FA", icon: "🐋", desc: "Large account whose volume distorts prioritization" },
  "VOTE-STACK": { label: "Vote Stacked", color: "#EE46BC", icon: "📊", desc: "Upvote-heavy but niche or coordinated request" },
  "CLEAN": { label: "Clean Signal", color: "#12B76A", icon: "✓", desc: "Genuine, well-articulated customer need" },
  "COMPETITIVE": { label: "Competitive Intel", color: "#F04438", icon: "⚔", desc: "Competitor mentioned, often missed by system" },
  "MISSING": { label: "Missing Signal", color: "#6941C6", icon: "👁", desc: "Strategic opportunity invisible to inbound analysis" },
};
const VIEW_OPTIONS = ["Product Area", "Strategic Pillar", "Customer", "Competitor"];
function computeScore(t) {
  return Math.round(t.revenueImpact * 0.4 + t.strategicFit * 0.2 + t.competitiveDiff * 0.2 + t.signalFrequency * 0.2);
}
// ─── COMPONENTS ─────────────────────────────────────────────────────────────
function BiasTag({ tag }) {
  const info = BIAS_TAG_INFO[tag];
  if (!info) return null;
  return (
    <span
      title={info.desc}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        fontSize: 10, fontWeight: 500, letterSpacing: "0.03em",
        padding: "2px 8px", borderRadius: 16,
        background: info.color + "12", color: info.color, border: `1px solid ${info.color}25`,
        textTransform: "uppercase", cursor: "help", whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: 11 }}>{info.icon}</span> {info.label}
    </span>
  );
}
function ConfidenceBadge({ confidence, T }) {
  if (confidence == null) return null;
  const color = confidence >= 0.8 ? '#12B76A' : confidence >= 0.6 ? '#F79009' : '#F04438';
  const label = confidence >= 0.8 ? 'High' : confidence >= 0.6 ? 'Med' : 'Low';
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 10, fontWeight: 600, padding: "2px 8px",
      borderRadius: 16, background: color + "15", color: color,
      border: `1px solid ${color}30`,
    }}>
      {label} {(confidence * 100).toFixed(0)}%
    </span>
  );
}
function ScoreBar({ score, label, color, T }) {
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
      <span style={{ width: 28, textAlign: "right", fontWeight: 600, color: T.textTitle, fontFamily: "'Inter', sans-serif", fontSize: 12 }}>{score}</span>
    </div>
  );
}
function SignalCard({ signal, T, isDark }) {
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
            {isGong ? `🎙 Gong ${signal.id}` : "📋 Canny"}
          </span>
          {isGong && signal.tag && <BiasTag tag={signal.tag} />}
          {signal.aiConfidence != null && <ConfidenceBadge confidence={signal.aiConfidence} T={T} />}
          {signal.needsReview && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 12, background: "#FEF3F2", color: "#F04438", border: "1px solid #FECDCA", fontWeight: 600 }}>Needs Review</span>}
        </div>
        {isGong && signal.arr > 0 && (
          <span style={{ fontSize: 11, color: "#6CE9A6", fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
            ${(signal.arr / 1000).toFixed(0)}K ARR
          </span>
        )}
        {!isGong && signal.votes > 0 && (
          <span style={{ fontSize: 11, color: "#7F56D9", fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
            ▲ {signal.votes} votes
          </span>
        )}
      </div>
      {isGong ? (
        <>
          <p style={{ margin: "0 0 6px", fontSize: 13, color: T.textBody, lineHeight: 1.55, fontStyle: "italic" }}>
            "{signal.quote}"
          </p>
          <div style={{ fontSize: 11, color: T.textDim }}>
            <span style={{ fontWeight: 600, color: T.textMuted }}>{signal.speaker}</span>
            {signal.account && <> · {signal.account}</>}
          </div>
        </>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: T.textBody, fontWeight: 500 }}>{signal.title}</p>
      )}
      {signal.aiSummary && (
        <div style={{ marginTop: 6, fontSize: 11, color: T.textMuted, padding: "6px 10px", background: isDark ? "rgba(127,86,217,0.08)" : "rgba(127,86,217,0.05)", borderRadius: 6, border: `1px solid ${isDark ? "rgba(127,86,217,0.2)" : "rgba(127,86,217,0.15)"}` }}>
          <span style={{ fontWeight: 600, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: "#7F56D9", marginRight: 6 }}>AI</span>
          {signal.aiSummary}
        </div>
      )}
    </div>
  );
}
function ThemeRow({ theme, rank, isOpen, onToggle, T, isMobile, isDark }) {
  const [isHovered, setIsHovered] = useState(false);
  const [activeTab, setActiveTab] = useState("evidence");
  const [scoreHovered, setScoreHovered] = useState(false);
  const score = computeScore(theme);
  const gongCount = theme.signals.filter(s => s.type === "gong").length;
  const cannyCount = theme.signals.filter(s => s.type === "canny").length;
  const scoreColor = score >= 80 ? "#12B76A" : score >= 65 ? "#F79009" : "#F04438";
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
              <span title={`${theme.jiraKey} · ${theme.jiraStatus}`} style={{
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
            )}
          </div>
          {!isMobile && (
            <p style={{ margin: 0, fontSize: 13, color: T.textMuted, lineHeight: 1.5, maxWidth: 700 }}>{theme.description}</p>
          )}
          {isMobile && (
            <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 11, color: T.textMuted }}>
              <span>{gongCount + cannyCount} signals</span>
              <span style={{ color: "#12B76A" }}>{theme.influencedARR >= 1000000 ? `$${(theme.influencedARR / 1000000).toFixed(2)}M` : `$${(theme.influencedARR / 1000).toFixed(0)}K`}</span>
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
              {theme.influencedARR >= 1000000 ? `$${(theme.influencedARR / 1000000).toFixed(2)}M` : `$${(theme.influencedARR / 1000).toFixed(0)}K`}
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
          ▾
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
            <div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {theme.signals.map((s, i) => <SignalCard key={i} signal={s} T={T} isDark={isDark} />)}
              </div>
            </div>
          ) : (
            <div>
              {theme.prototype ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", gap: 20, flexDirection: isMobile ? "column" : "row" }}>
                    <div style={{ width: isMobile ? "100%" : 280, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{
                      width: "100%", minHeight: 200, borderRadius: 10, overflow: "hidden",
                      background: theme.prototype.thumbnailColor || "#1a1a2e",
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
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "0.02em" }}>{theme.prototype.thumbnailLabel}</div>
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
                        { label: "Testers", value: theme.prototype.testers, link: "Maze", icon: "◇" },
                        { label: "Direct Success", value: `${theme.prototype.directSuccess}%`, link: "Maze", icon: "◇" },
                        { label: "Unfinished", value: `${theme.prototype.missionUnfinished}%`, link: "Pendo", icon: "◆" },
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
                            <span>{m.icon}</span> {m.link} ↗
                          </div>
                        </div>
                      ))}
                    </div>
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{
                          fontSize: 11, fontWeight: 500, padding: "2px 10px", borderRadius: 16,
                          background: theme.prototype.status === "Validated" ? "#ECFDF3" : theme.prototype.status === "In Testing" ? "#FFF6ED" : "#F2F4F7",
                          color: theme.prototype.status === "Validated" ? "#027A48" : theme.prototype.status === "In Testing" ? "#B93815" : "#344054",
                          border: `1px solid ${theme.prototype.status === "Validated" ? "#A6F4C5" : theme.prototype.status === "In Testing" ? "#FEDF89" : "#EAECF0"}`,
                        }}>
                          {theme.prototype.status}
                        </span>
                        <span style={{ fontSize: 12, color: T.textMuted }}>v{theme.prototype.iterations} · Updated {theme.prototype.lastUpdated}</span>
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: T.textTitle, marginBottom: 8 }}>Proposed Improvements</div>
                        <p style={{ margin: 0, fontSize: 13, color: T.textBody, lineHeight: 1.7 }}>{theme.prototype.description}</p>
                      </div>
                      {theme.prototype.features && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {theme.prototype.features.map((f, i) => (
                            <span key={i} style={{ fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 16, background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.textBody }}>{f}</span>
                          ))}
                        </div>
                      )}
                      {theme.prototype.stakeholder && (
                        <div style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 8, padding: "12px 14px", borderLeft: `3px solid #7F56D9` }}>
                          <p style={{ margin: 0, fontSize: 12, color: T.textBody, lineHeight: 1.6, fontStyle: "italic" }}>"{theme.prototype.stakeholder.quote}"</p>
                          <div style={{ marginTop: 8, fontSize: 11, color: T.textMuted, fontWeight: 500 }}>— {theme.prototype.stakeholder.name}, {theme.prototype.stakeholder.company}</div>
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
                      <span style={{ fontSize: 16, fontWeight: 700, color: T.textTitle }}>{theme.prototype.views}</span>
                      <span style={{ fontSize: 11, color: T.textDim }}>views</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 8, background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#F04438" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                      <span style={{ fontSize: 16, fontWeight: 700, color: T.textTitle }}>{theme.prototype.hearts}</span>
                      <span style={{ fontSize: 11, color: T.textDim }}>loved this</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "48px 20px", color: T.textMuted }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: T.surfaceAlt, border: `1px solid ${T.border}`, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16, fontSize: 20, opacity: 0.5 }}>🎨</div>
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
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
// ─── BUBBLE CHART ───────────────────────────────────────────────────────────
function BubbleChart({ themes, T, isDark, onSelect, sizeMetric = "customers", sizeLabel = "# customers" }) {
  const [hovered, setHovered] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const chartW = 900, chartH = 480;
  const pad = { top: 40, right: 40, bottom: 56, left: 80 };
  const plotW = chartW - pad.left - pad.right;
  const plotH = chartH - pad.top - pad.bottom;
  const maxARR = Math.max(...themes.map(t => t.influencedARR));
  const getCustomerCount = (t) => {
    const gongAccounts = new Set(t.signals.filter(s => s.type === "gong" && s.account).map(s => s.account)).size;
    const cannyVotes = t.signals.filter(s => s.type === "canny").reduce((sum, s) => sum + (s.votes || 0), 0);
    return gongAccounts + cannyVotes;
  };
  const getSignalCount = (t) => t.signals.length;
  const getSize = sizeMetric === "signals" ? getSignalCount : getCustomerCount;
  const maxSize = Math.max(...themes.map(t => getSize(t)));
  const minScore = Math.min(...themes.map(t => computeScore(t)));
  const maxScore = Math.max(...themes.map(t => computeScore(t)));
  const scaleX = (score) => pad.left + ((score - (minScore - 5)) / ((maxScore + 5) - (minScore - 5))) * plotW;
  const scaleY = (arr) => pad.top + plotH - (arr / (maxARR * 1.15)) * plotH;
  const scaleR = (val) => 14 + (val / maxSize) * 30;
  const bubbleColors = ["#6941C6", "#12B76A", "#F79009", "#F04438", "#8B5CF6", "#2E90FA", "#EC4899", "#14B8A6", "#F97316", "#06B6D4", "#84CC16", "#E879F9", "#FB923C"];
  const yTicks = [0, 100000, 200000, 300000, 400000, 500000].filter(v => v <= maxARR * 1.15);
  const xTicks = [];
  for (let s = Math.floor(minScore / 10) * 10; s <= Math.ceil(maxScore / 10) * 10; s += 10) xTicks.push(s);
  return (
    <div style={{ position: "relative" }}>
      <svg width="100%" viewBox={`0 0 ${chartW} ${chartH}`} style={{ overflow: "visible" }}>
        {yTicks.map(v => (
          <g key={`y-${v}`}>
            <line x1={pad.left} y1={scaleY(v)} x2={chartW - pad.right} y2={scaleY(v)} stroke={T.border} strokeWidth={1} strokeDasharray="4,4" />
            <text x={pad.left - 12} y={scaleY(v) + 4} textAnchor="end" fill={T.textDim} fontSize={10} fontFamily="'Inter', sans-serif">${v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}</text>
          </g>
        ))}
        {xTicks.map(v => (
          <g key={`x-${v}`}>
            <line x1={scaleX(v)} y1={pad.top} x2={scaleX(v)} y2={pad.top + plotH} stroke={T.border} strokeWidth={1} strokeDasharray="4,4" />
            <text x={scaleX(v)} y={pad.top + plotH + 24} textAnchor="middle" fill={T.textDim} fontSize={10} fontFamily="'Inter', sans-serif">{v}</text>
          </g>
        ))}
        <text x={chartW / 2} y={chartH - 4} textAnchor="middle" fill={T.textDim} fontSize={11} fontWeight={600} fontFamily="Inter, sans-serif">Confidence Score →</text>
        <text x={14} y={chartH / 2} textAnchor="middle" fill={T.textDim} fontSize={11} fontWeight={600} fontFamily="Inter, sans-serif" transform={`rotate(-90, 14, ${chartH / 2})`}>Influenced Revenue →</text>
        {themes.map((t, i) => {
          const score = computeScore(t);
          const cx = scaleX(score); const cy = scaleY(t.influencedARR);
          const r = scaleR(getSize(t));
          const color = bubbleColors[i % bubbleColors.length];
          const isHov = hovered === t.id;
          return (
            <g key={t.id}
              onMouseEnter={(e) => { setHovered(t.id); const rect = e.currentTarget.closest("svg").getBoundingClientRect(); const svgScale = rect.width / chartW; setTooltip({ x: cx * svgScale + rect.left - window.scrollX, y: cy * svgScale + rect.top - window.scrollY, theme: t, score, color }); }}
              onMouseLeave={() => { setHovered(null); setTooltip(null); }}
              onClick={() => onSelect && onSelect(t.id)} style={{ cursor: "pointer" }}
            >
              <circle cx={cx} cy={cy} r={r + 3} fill="none" stroke={color} strokeWidth={isHov ? 2.5 : 0} opacity={0.6} style={{ transition: "stroke-width 0.2s ease" }} />
              <circle cx={cx} cy={cy} r={r} fill={color} opacity={isHov ? 0.85 : 0.55} style={{ transition: "opacity 0.2s ease, r 0.2s ease" }} />
              <text x={cx} y={cy + 4} textAnchor="middle" fill="#fff" fontSize={r > 22 ? 10 : 8} fontWeight={700} fontFamily="'Inter', sans-serif" style={{ pointerEvents: "none" }}>{getSize(t)}</text>
            </g>
          );
        })}
      </svg>
      {tooltip && (
        <div style={{ position: "fixed", left: tooltip.x + 20, top: tooltip.y - 20, background: T.surface, border: `1px solid ${tooltip.color}44`, borderRadius: 10, padding: "12px 16px", zIndex: 100, minWidth: 220, maxWidth: 300, boxShadow: T.shadowLg, pointerEvents: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 5, background: tooltip.color }} />
            <span style={{ fontWeight: 700, fontSize: 13, color: T.textTitle }}>{tooltip.theme.name}</span>
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 11, fontFamily: "'Inter', sans-serif" }}>
            <span style={{ color: T.textDim }}>Score: <span style={{ color: tooltip.color, fontWeight: 700 }}>{tooltip.score}</span></span>
            <span style={{ color: T.textDim }}>ARR: <span style={{ color: "#6CE9A6", fontWeight: 700 }}>{tooltip.theme.influencedARR >= 1000000 ? `$${(tooltip.theme.influencedARR / 1000000).toFixed(2)}M` : `$${(tooltip.theme.influencedARR / 1000).toFixed(0)}K`}</span></span>
            <span style={{ color: T.textDim }}>{sizeMetric === "signals" ? "Signals" : "Customers"}: <span style={{ color: "#F79009", fontWeight: 700 }}>{getSize(tooltip.theme)}</span></span>
          </div>
          <div style={{ fontSize: 10, color: T.textFaint, marginTop: 4 }}>{tooltip.theme.productArea}</div>
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 12, padding: "0 40px" }}>
        {themes.map((t, i) => (
          <div key={t.id} onMouseEnter={() => setHovered(t.id)} onMouseLeave={() => { setHovered(null); setTooltip(null); }} onClick={() => onSelect && onSelect(t.id)}
            style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: hovered === t.id ? T.textTitle : T.textDim, cursor: "pointer", padding: "3px 8px", borderRadius: 6, background: hovered === t.id ? `${bubbleColors[i % bubbleColors.length]}15` : "transparent", transition: "all 0.2s ease", fontWeight: 500 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: bubbleColors[i % bubbleColors.length], flexShrink: 0 }} />
            {t.name.length > 30 ? t.name.slice(0, 28) + "…" : t.name}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 10, fontSize: 10, color: T.textFaint }}>
        <span style={{ fontWeight: 600 }}>Bubble size = {sizeLabel}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {(() => {
            const vals = themes.map(t => getSize(t)).filter(v => v > 0);
            const min = Math.min(...vals);
            const max = Math.max(...vals);
            const mid = Math.round((min + max) / 2);
            const ticks = [...new Set([min, mid, max])].sort((a, b) => a - b);
            return ticks.map(s => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: scaleR(s) * 0.7, height: scaleR(s) * 0.7, borderRadius: "50%", background: T.textFaint, opacity: 0.3 }} />
                <span>{s}</span>
              </div>
            ));
          })()}
        </div>
      </div>
    </div>
  );
}
// ─── COLOR THEMES ───────────────────────────────────────────────────────────
const darkTheme = {
  bg: "#0C111D", bgGrad1: "#101828", bgGrad2: "#0C111D",
  surface: "#1D2939", surfaceAlt: "#161B26",
  surfaceHover: "#1D293920", surfaceHover2: "#1D293930",
  border: "#344054", borderLight: "#1D2939",
  borderActive: "#7F56D9", borderSubtle: "#475467",
  text: "#F2F4F7", textBright: "#FFFFFF", textTitle: "#F9FAFB",
  textBody: "#EAECF0", textMuted: "#98A2B3",
  textDim: "#98A2B3", textFaint: "#667085", textGhost: "#475467",
  pill: "#1D2939", pillText: "#98A2B3", barBg: "#344054",
  stickyBg: "#0C111Dee", scrollTrack: "#1D2939", scrollThumb: "#475467",
  inputBg: "#1D2939", gongBorder: "#344054", cannyBorder: "#344054",
  shadow: "0px 1px 2px rgba(16, 24, 40, 0.3)",
  shadowMd: "0px 4px 8px -2px rgba(16, 24, 40, 0.3), 0px 2px 4px -2px rgba(16, 24, 40, 0.3)",
  shadowLg: "0px 12px 16px -4px rgba(16, 24, 40, 0.4), 0px 4px 6px -2px rgba(16, 24, 40, 0.3)",
};
const lightTheme = {
  bg: "#F9FAFB", bgGrad1: "#FFFFFF", bgGrad2: "#F9FAFB",
  surface: "#FFFFFF", surfaceAlt: "#F9FAFB",
  surfaceHover: "#F4EBFF20", surfaceHover2: "#ECFDF320",
  border: "#EAECF0", borderLight: "#F2F4F7",
  borderActive: "#7F56D9", borderSubtle: "#D0D5DD",
  text: "#344054", textBright: "#101828", textTitle: "#101828",
  textBody: "#344054", textMuted: "#667085",
  textDim: "#98A2B3", textFaint: "#D0D5DD", textGhost: "#EAECF0",
  pill: "#F2F4F7", pillText: "#667085", barBg: "#EAECF0",
  stickyBg: "#F9FAFBee", scrollTrack: "#F2F4F7", scrollThumb: "#D0D5DD",
  inputBg: "#FFFFFF", gongBorder: "#EAECF0", cannyBorder: "#D1FADF",
  shadow: "0px 1px 2px rgba(16, 24, 40, 0.05)",
  shadowMd: "0px 4px 8px -2px rgba(16, 24, 40, 0.1), 0px 2px 4px -2px rgba(16, 24, 40, 0.06)",
  shadowLg: "0px 12px 16px -4px rgba(16, 24, 40, 0.08), 0px 4px 6px -2px rgba(16, 24, 40, 0.03)",
};
// ─── REVIEW QUEUE PAGE ──────────────────────────────────────────────────────
function ReviewQueuePage({ T, isDark, isMobile, isAdmin = true, orgId, eventStream }) {
  const { items, total, loading, error, filters, setFilters, handleReview, handleBatchReview, refresh } = useReviewQueue({}, orgId, eventStream);
  const [selected, setSelected] = useState(new Set());

  const toggleSelect = (id) => {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };
  const selectAll = () => {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map(i => i.id)));
  };

  const REVIEW_TYPES = { low_confidence: "Low Confidence", bias_conflict: "Bias Conflict", duplicate_candidate: "Duplicate", new_theme: "Theme Merge" };
  const TYPE_COLORS = { low_confidence: "#F04438", bias_conflict: "#F79009", duplicate_candidate: "#2E90FA", new_theme: "#6941C6" };

  return (
    <div style={{ padding: isMobile ? 16 : 36 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.fg }}>Signals</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: T.textMuted }}>{total} items pending review</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {isAdmin && selected.size > 0 && (
            <>
              <button onClick={() => { handleBatchReview([...selected], 'accept'); setSelected(new Set()); }} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#12B76A", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Accept ({selected.size})</button>
              <button onClick={() => { handleBatchReview([...selected], 'reject'); setSelected(new Set()); }} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#F04438", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Reject ({selected.size})</button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))} style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, color: T.fg, fontSize: 12 }}>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
          <option value="reclassified">Reclassified</option>
          <option value="">All</option>
        </select>
        <select value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value, page: 1 }))} style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, color: T.fg, fontSize: 12 }}>
          <option value="">All Types</option>
          <option value="low_confidence">Low Confidence</option>
          <option value="bias_conflict">Bias Conflict</option>
          <option value="duplicate_candidate">Duplicate</option>
          <option value="new_theme">Theme Merge</option>
        </select>
        <select value={filters.sort} onChange={e => setFilters(f => ({ ...f, sort: e.target.value }))} style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, color: T.fg, fontSize: 12 }}>
          <option value="confidence_asc">Lowest Confidence</option>
          <option value="confidence_desc">Highest Confidence</option>
          <option value="created_at_desc">Newest</option>
          <option value="created_at_asc">Oldest</option>
        </select>
        <button onClick={refresh} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, color: T.fg, fontSize: 12, cursor: "pointer" }}>Refresh</button>
      </div>

      {/* Loading / Error */}
      {loading && <div style={{ textAlign: "center", padding: 40, color: T.textMuted }}>Loading review queue...</div>}
      {error && <div style={{ textAlign: "center", padding: 40, color: "#F04438" }}>Error: {error}</div>}

      {/* Items */}
      {!loading && !error && items.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: T.textMuted, fontSize: 14 }}>No items in the review queue. Run the AI pipeline to generate review items.</div>
      )}

      {!loading && items.map(item => (
        <div key={item.id} style={{ border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 12, background: T.surface, transition: "border-color 0.2s", borderLeftWidth: 4, borderLeftColor: TYPE_COLORS[item.reviewType] || T.border }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
              <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} style={{ cursor: "pointer" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Type badge */}
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 12, background: (TYPE_COLORS[item.reviewType] || "#666") + "15", color: TYPE_COLORS[item.reviewType] || "#666", border: `1px solid ${(TYPE_COLORS[item.reviewType] || "#666")}30` }}>{REVIEW_TYPES[item.reviewType] || item.reviewType}</span>
                  <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 12, background: item.signal.source === "gong" ? "rgba(46,144,250,0.1)" : "rgba(238,70,188,0.1)", color: item.signal.source === "gong" ? "#2E90FA" : "#EE46BC" }}>{item.signal.source}</span>
                  <ConfidenceBadge confidence={item.aiConfidence} T={T} />
                  {item.signal.biasTag && <BiasTag tag={item.signal.biasTag} />}
                </div>
                {/* Content */}
                <div style={{ fontSize: 13, color: T.fg, lineHeight: 1.5 }}>
                  {item.signal.content || item.signal.title || "No content"}
                </div>
                {item.signal.speaker && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>{item.signal.speaker}{item.signal.account ? ` — ${item.signal.account}` : ""}</div>}
                {/* AI suggestion info */}
                {item.reviewType === "bias_conflict" && item.aiSuggestedBias && (
                  <div style={{ marginTop: 8, fontSize: 11, color: T.textMuted }}>AI suggests: <strong style={{ color: T.fg }}>{item.aiSuggestedBias}</strong> (current: {item.signal.biasTag})</div>
                )}
                {item.themes && item.themes.length > 0 && (
                  <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {item.themes.map(t => (
                      <span key={t.themeId} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 12, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", color: T.textMuted, border: `1px solid ${T.border}` }}>{t.themeName}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Actions */}
            {isAdmin && item.status === "pending" && (
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button onClick={() => handleReview(item.id, { action: "accept" })} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#12B76A", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Accept</button>
                <button onClick={() => handleReview(item.id, { action: "reject" })} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#F04438", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Reject</button>
              </div>
            )}
            {item.status !== "pending" && (
              <span style={{ fontSize: 11, fontWeight: 600, color: item.status === "accepted" ? "#12B76A" : item.status === "rejected" ? "#F04438" : "#7F56D9", textTransform: "capitalize" }}>{item.status}</span>
            )}
          </div>
        </div>
      ))}

      {/* Pagination */}
      {total > filters.limit && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
          <button disabled={filters.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, color: T.fg, fontSize: 12, cursor: filters.page <= 1 ? "default" : "pointer", opacity: filters.page <= 1 ? 0.4 : 1 }}>Prev</button>
          <span style={{ padding: "6px 14px", fontSize: 12, color: T.textMuted }}>Page {filters.page} of {Math.ceil(total / filters.limit)}</span>
          <button disabled={filters.page >= Math.ceil(total / filters.limit)} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, color: T.fg, fontSize: 12, cursor: filters.page >= Math.ceil(total / filters.limit) ? "default" : "pointer", opacity: filters.page >= Math.ceil(total / filters.limit) ? 0.4 : 1 }}>Next</button>
        </div>
      )}
    </div>
  );
}
// ─── ACTIVITY FEED ──────────────────────────────────────────────────────────
function ActivityFeed({ activities, T, isMobile }) {
  const icons = { 'sync:started': '\u{1F504}', 'sync:completed': '\u{2705}', 'sync:failed': '\u{274C}', 'pipeline:started': '\u{2699}\u{FE0F}', 'pipeline:progress': '\u{1F4CA}', 'pipeline:completed': '\u{2705}', 'signals:ingested': '\u{1F4E5}', 'review:created': '\u{1F441}', connected: '\u{1F7E2}' };
  const describe = (event) => {
    switch (event.type) {
      case 'sync:started': return `${event.connectorName} sync started`;
      case 'sync:completed': return `${event.connectorName}: ${event.signalsNew} new signals`;
      case 'sync:failed': return `${event.connectorName} sync failed`;
      case 'pipeline:started': return `Pipeline started (${event.total} signals)`;
      case 'pipeline:progress': return `Pipeline batch ${event.batchNum}/${event.totalBatches}`;
      case 'pipeline:completed': return event.total > 0 ? `Pipeline: ${event.classified} classified` : 'Pipeline: no new signals';
      case 'signals:ingested': return `${event.count} signals from ${event.connectorType}`;
      case 'review:created': return `${event.count} items for review`;
      case 'connected': return 'Connected to live updates';
      default: return event.type;
    }
  };
  const timeAgo = (ts) => {
    if (!ts) return '';
    const diff = (Date.now() - new Date(ts).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  if (activities.length === 0) return (
    <div style={{ padding: 16, fontSize: 12, color: T.textMuted, textAlign: "center" }}>No recent activity</div>
  );

  return (
    <div style={{ maxHeight: 300, overflowY: "auto" }}>
      {activities.map((event, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 16px", borderBottom: `1px solid ${T.border}`, fontSize: 12 }}>
          <span style={{ fontSize: 13, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{icons[event.type] || '\u{1F4AC}'}</span>
          <span style={{ color: T.textBody, lineHeight: 1.4, flex: 1 }}>{describe(event)}</span>
          <span style={{ color: T.textDim, fontSize: 10, whiteSpace: "nowrap", flexShrink: 0 }}>{timeAgo(event.timestamp)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── CONNECTORS PAGE ────────────────────────────────────────────────────────
function ConnectorsPage({ T, isDark, isMobile, isAdmin, orgId, eventStream }) {
  const [connectors, setConnectors] = useState([]);
  const [loadingConnectors, setLoadingConnectors] = useState(true);
  const [syncingId, setSyncingId] = useState(null);
  const [historicalActivity, setHistoricalActivity] = useState([]);

  const loadConnectors = useCallback(() => {
    fetchConnectors().then(setConnectors).catch(() => {}).finally(() => setLoadingConnectors(false));
  }, []);

  useEffect(() => { loadConnectors(); }, [loadConnectors]);

  // Load historical activity on mount
  useEffect(() => {
    fetchActivity(20).then(setHistoricalActivity).catch(() => {});
  }, []);

  // Reload connectors when a sync completes
  useEffect(() => {
    if (!eventStream) return;
    const unsub1 = eventStream.on('sync:completed', () => loadConnectors());
    const unsub2 = eventStream.on('sync:failed', () => { loadConnectors(); setSyncingId(null); });
    return () => { unsub1(); unsub2(); };
  }, [eventStream, loadConnectors]);

  const handleSync = async (id) => {
    setSyncingId(id);
    try {
      await triggerConnectorSync(id);
    } catch { /* handled by SSE events */ }
  };

  const handleToggle = async (id, enabled) => {
    await updateConnector(id, { enabled: !enabled });
    loadConnectors();
  };

  const FREQ_LABELS = { '1h': 'Hourly', '6h': 'Every 6h', '24h': 'Daily', '168h': 'Weekly' };
  const TYPE_ICONS = { gong: '\u{1F399}\u{FE0F}', canny: '\u{1F4AC}', g2: '\u{2B50}' };

  // Merge historical activity with live SSE activities
  const allActivities = useMemo(() => {
    const live = eventStream.activities || [];
    const historical = historicalActivity.map(a => ({
      type: a.type === 'sync' ? (a.status === 'failed' ? 'sync:failed' : 'sync:completed') : (a.status === 'failed' ? 'pipeline:failed' : 'pipeline:completed'),
      timestamp: a.timestamp,
      connectorName: a.connectorName,
      signalsNew: a.signalsNew,
      signalsPulled: a.signalsPulled,
      total: a.totalSignals,
      classified: a.classifiedSignals,
      count: a.signalsNew,
      connectorType: a.connectorType,
    }));
    // Deduplicate by timestamp (prefer live events)
    const seen = new Set(live.map(e => e.timestamp));
    return [...live, ...historical.filter(h => !seen.has(h.timestamp))].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 30);
  }, [eventStream.activities, historicalActivity]);

  if (loadingConnectors) return <div style={{ padding: 36, textAlign: "center", color: T.textMuted }}>Loading connectors...</div>;

  return (
    <div style={{ padding: isMobile ? 16 : 36 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.textTitle }}>Connectors</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: T.textMuted }}>{connectors.length} data sources configured</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 32 }}>
        {connectors.map(conn => (
          <div key={conn.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, boxShadow: T.shadow }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>{TYPE_ICONS[conn.type] || '\u{1F50C}'}</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.textTitle }}>{conn.name}</div>
                  <div style={{ fontSize: 11, color: T.textMuted }}>{FREQ_LABELS[conn.syncFrequency] || conn.syncFrequency}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {isAdmin && (
                  <button onClick={() => handleToggle(conn.id, conn.enabled)} style={{
                    width: 36, height: 20, borderRadius: 10, border: `1px solid ${T.border}`,
                    background: conn.enabled ? "#12B76A" : T.pill, cursor: "pointer", position: "relative", padding: 0,
                    transition: "background 0.3s",
                  }}>
                    <div style={{ width: 16, height: 16, borderRadius: 8, background: "#fff", position: "absolute", top: 1, left: conn.enabled ? 17 : 1, transition: "left 0.3s", boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }} />
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, marginBottom: 16, fontSize: 12 }}>
              <div style={{ flex: 1, padding: "8px 10px", background: isDark ? "rgba(255,255,255,0.04)" : "#F9FAFB", borderRadius: 8 }}>
                <div style={{ color: T.textMuted, fontSize: 10, marginBottom: 2 }}>Last Sync</div>
                <div style={{ color: T.textBody, fontWeight: 600 }}>{conn.lastSyncAt ? new Date(conn.lastSyncAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}</div>
              </div>
              <div style={{ flex: 1, padding: "8px 10px", background: isDark ? "rgba(255,255,255,0.04)" : "#F9FAFB", borderRadius: 8 }}>
                <div style={{ color: T.textMuted, fontSize: 10, marginBottom: 2 }}>Status</div>
                <div style={{ color: conn.enabled ? "#12B76A" : T.textDim, fontWeight: 600 }}>{conn.enabled ? "Active" : "Disabled"}</div>
              </div>
            </div>

            {/* Recent sync jobs */}
            {conn.recentJobs && conn.recentJobs.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Recent Syncs</div>
                {conn.recentJobs.slice(0, 3).map(job => (
                  <div key={job.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", fontSize: 11, borderBottom: `1px solid ${T.border}` }}>
                    <span style={{ color: job.status === 'completed' ? "#12B76A" : job.status === 'failed' ? "#F04438" : T.textMuted, fontWeight: 500 }}>
                      {job.status === 'completed' ? '\u{2705}' : job.status === 'failed' ? '\u{274C}' : '\u{23F3}'} {job.signals_new || 0} new / {job.signals_pulled || 0} total
                    </span>
                    <span style={{ color: T.textDim, fontSize: 10 }}>{job.completed_at ? new Date(job.completed_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                  </div>
                ))}
              </div>
            )}

            {isAdmin && (
              <button onClick={() => handleSync(conn.id)} disabled={syncingId === conn.id || !conn.enabled}
                style={{
                  width: "100%", padding: "8px 0", borderRadius: 8, border: `1px solid ${T.border}`,
                  background: syncingId === conn.id ? (isDark ? "rgba(127,86,217,0.15)" : "#F4EBFF") : T.surface,
                  color: !conn.enabled ? T.textDim : syncingId === conn.id ? "#7F56D9" : T.textTitle,
                  fontSize: 12, fontWeight: 600, cursor: !conn.enabled ? "default" : "pointer",
                  opacity: !conn.enabled ? 0.5 : 1, fontFamily: "inherit", transition: "all 0.2s",
                }}>
                {syncingId === conn.id ? "Syncing..." : "Sync Now"}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Activity Feed */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: T.shadow, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.textTitle }}>Activity Feed</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: eventStream.connected ? "#12B76A" : "#F04438" }} />
            <span style={{ fontSize: 10, color: T.textMuted }}>{eventStream.connected ? "Live" : "Reconnecting"}</span>
          </div>
        </div>
        <ActivityFeed activities={allActivities} T={T} isMobile={isMobile} />
      </div>
    </div>
  );
}

// ─── MAIN APP ───────────────────────────────────────────────────────────────
function AuthenticatedApp({ orgId, isAdmin }) {
  const eventStream = useEventStream(orgId);
  const { themes: THEMES, loading, error } = useThemes(orgId, eventStream);
  const [activePage, setActivePage] = useState("dashboard");
  const [viewBy, setViewBy] = useState("Confidence Score");
  const [openThemes, setOpenThemes] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef(null);
  useEffect(() => {
    if (!showFilters) return;
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilters(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFilters]);
  const [filters, setFilters] = useState({
    biasOnly: false, biasTypes: new Set(),
    revenueMin: 0, revenueMax: 500, scoreMin: 0, scoreMax: 100,
  });
  const [isDark, setIsDark] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [displayMode, setDisplayMode] = useState("list");
  const [datePreset, setDatePreset] = useState("7");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const datePickerRef = useRef(null);
  useEffect(() => {
    if (!showDatePicker) return;
    const handleClick = (e) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target)) setShowDatePicker(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showDatePicker]);
  const T = isDark ? darkTheme : lightTheme;
  const W = useWindowWidth();
  const isMobile = W < 640;
  const isTablet = W >= 640 && W < 1024;
  const px = isMobile ? 16 : 36;
  const toggleTheme = (id) => {
    setOpenThemes(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };
  const scored = useMemo(() =>
    THEMES.map(t => ({ ...t, score: computeScore(t) })).sort((a, b) => b.score - a.score),
  [THEMES]);
  const hasActiveFilters = filters.biasOnly || filters.biasTypes.size > 0 ||
    filters.revenueMin > 0 || filters.revenueMax < 500 ||
    filters.scoreMin > 0 || filters.scoreMax < 100;
  const filtered = useMemo(() => {
    let result = scored;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => {
        if (t.name.toLowerCase().includes(q)) return true;
        if (t.description.toLowerCase().includes(q)) return true;
        if (t.productArea.toLowerCase().includes(q)) return true;
        if (t.strategicGoal.toLowerCase().includes(q)) return true;
        if (t.pm.toLowerCase().includes(q)) return true;
        return t.signals.some(s => {
          if (s.type === "gong") {
            if (s.account && s.account.toLowerCase().includes(q)) return true;
            if (s.speaker && s.speaker.toLowerCase().includes(q)) return true;
            if (s.quote && s.quote.toLowerCase().includes(q)) return true;
            if (s.tag && s.tag.toLowerCase().includes(q)) return true;
            if (s.id && s.id.toLowerCase().includes(q)) return true;
            if (s.competitors && s.competitors.some(c => c.toLowerCase().includes(q))) return true;
          }
          if (s.type === "canny") {
            if (s.title && s.title.toLowerCase().includes(q)) return true;
            if (s.category && s.category.toLowerCase().includes(q)) return true;
          }
          return false;
        });
      });
    }
    if (filters.biasOnly) result = result.filter(t => t.signals.some(s => s.tag && s.tag !== "CLEAN"));
    if (filters.biasTypes.size > 0) result = result.filter(t => t.signals.some(s => s.tag && filters.biasTypes.has(s.tag)));
    if (filters.revenueMin > 0) result = result.filter(t => t.influencedARR / 1000 >= filters.revenueMin);
    if (filters.revenueMax < 500) result = result.filter(t => t.influencedARR / 1000 <= filters.revenueMax);
    if (filters.scoreMin > 0) result = result.filter(t => computeScore(t) >= filters.scoreMin);
    if (filters.scoreMax < 100) result = result.filter(t => computeScore(t) <= filters.scoreMax);
    return result;
  }, [scored, searchQuery, filters]);
  const grouped = useMemo(() => {
    if (viewBy === "Confidence Score") return null;
    if (viewBy === "Customer") {
      const map = {};
      filtered.forEach(t => {
        const accounts = new Set();
        t.signals.forEach(s => { if (s.type === "gong" && s.account) accounts.add(s.account); });
        accounts.forEach(acct => {
          if (!map[acct]) map[acct] = { themes: [], totalARR: 0 };
          if (!map[acct].themes.find(x => x.id === t.id)) map[acct].themes.push(t);
          const sig = t.signals.find(s => s.type === "gong" && s.account === acct);
          if (sig && sig.arr) map[acct].totalARR = Math.max(map[acct].totalARR, sig.arr);
        });
      });
      return Object.entries(map).map(([name, data]) => [name, data.themes, data.totalARR]).sort((a, b) => b[2] - a[2]);
    }
    if (viewBy === "Competitor") {
      const map = {};
      filtered.forEach(t => {
        const comps = new Set();
        t.signals.forEach(s => { if (s.competitors) s.competitors.forEach(c => comps.add(c)); });
        comps.forEach(comp => {
          if (!map[comp]) map[comp] = { themes: [], mentions: 0 };
          if (!map[comp].themes.find(x => x.id === t.id)) map[comp].themes.push(t);
          map[comp].mentions += t.signals.filter(s => s.competitors && s.competitors.includes(comp)).length;
        });
      });
      return Object.entries(map).map(([name, data]) => [name, data.themes, data.mentions]).sort((a, b) => b[2] - a[2]);
    }
    const key = viewBy === "Product Area" ? "productArea" : viewBy === "Strategic Pillar" ? "strategicGoal" : "pm";
    const map = {};
    filtered.forEach(t => { const k = t[key]; if (!map[k]) map[k] = []; map[k].push(t); });
    return Object.entries(map).sort((a, b) => {
      const aMax = Math.max(...a[1].map(x => x.score));
      const bMax = Math.max(...b[1].map(x => x.score));
      return bMax - aMax;
    });
  }, [viewBy, filtered]);
  const totalSignals = 42 + 4329;
  const totalCannySignals = 4329;
  const totalGongSignals = 42;
  const totalThemes = THEMES.length;
  const uniqueGongCustomers = useMemo(() => {
    const accounts = new Set();
    THEMES.forEach(t => t.signals.forEach(s => { if (s.account) accounts.add(s.account); }));
    return accounts.size;
  }, [THEMES]);
  const totalInfluencedARR = useMemo(() => THEMES.reduce((sum, t) => sum + t.influencedARR, 0), [THEMES]);
  const viewOptions = ["Confidence Score", ...VIEW_OPTIONS];
  const bubbleThemes = useMemo(() => {
    if (viewBy === "Competitor") {
      const map = {};
      filtered.forEach(t => {
        const comps = new Set();
        t.signals.forEach(s => { if (s.competitors) s.competitors.forEach(c => comps.add(c)); });
        comps.forEach(comp => {
          if (!map[comp]) map[comp] = { themes: [], signals: [], mentions: 0 };
          if (!map[comp].themes.find(x => x.id === t.id)) {
            map[comp].themes.push(t);
          }
          const compSignals = t.signals.filter(s => s.competitors && s.competitors.includes(comp));
          map[comp].signals.push(...compSignals);
          map[comp].mentions += compSignals.length;
        });
      });
      return Object.entries(map).map(([comp, data]) => {
        const n = data.themes.length;
        return {
          id: `comp-${comp}`,
          name: comp,
          influencedARR: data.themes.reduce((s, t) => s + t.influencedARR, 0),
          revenueImpact: Math.round(data.themes.reduce((s, t) => s + t.revenueImpact, 0) / n),
          strategicFit: Math.round(data.themes.reduce((s, t) => s + t.strategicFit, 0) / n),
          competitiveDiff: Math.round(data.themes.reduce((s, t) => s + t.competitiveDiff, 0) / n),
          signalFrequency: Math.round(data.themes.reduce((s, t) => s + t.signalFrequency, 0) / n),
          signals: data.signals,
          productArea: `${n} theme${n > 1 ? "s" : ""} · ${data.mentions} mention${data.mentions > 1 ? "s" : ""}`,
        };
      });
    }
    if (viewBy === "Strategic Pillar") {
      const map = {};
      filtered.forEach(t => {
        const key = t.strategicGoal;
        if (!map[key]) map[key] = [];
        map[key].push(t);
      });
      return Object.entries(map).map(([pillar, themes]) => {
        const n = themes.length;
        const allSignals = themes.flatMap(t => t.signals);
        return {
          id: `pillar-${pillar}`,
          name: pillar,
          influencedARR: themes.reduce((s, t) => s + t.influencedARR, 0),
          revenueImpact: Math.round(themes.reduce((s, t) => s + t.revenueImpact, 0) / n),
          strategicFit: Math.round(themes.reduce((s, t) => s + t.strategicFit, 0) / n),
          competitiveDiff: Math.round(themes.reduce((s, t) => s + t.competitiveDiff, 0) / n),
          signalFrequency: Math.round(themes.reduce((s, t) => s + t.signalFrequency, 0) / n),
          signals: allSignals,
          productArea: `${n} theme${n > 1 ? "s" : ""}`,
        };
      });
    }
    if (viewBy === "Customer") {
      const map = {};
      filtered.forEach(t => {
        const accounts = new Set();
        t.signals.forEach(s => { if (s.type === "gong" && s.account) accounts.add(s.account); });
        accounts.forEach(acct => {
          if (!map[acct]) map[acct] = { themes: [], signals: [], totalARR: 0 };
          if (!map[acct].themes.find(x => x.id === t.id)) {
            map[acct].themes.push(t);
            map[acct].signals.push(...t.signals);
          }
          const sig = t.signals.find(s => s.type === "gong" && s.account === acct);
          if (sig && sig.arr) map[acct].totalARR = Math.max(map[acct].totalARR, sig.arr);
        });
      });
      return Object.entries(map).map(([customer, data]) => {
        const n = data.themes.length;
        return {
          id: `customer-${customer}`,
          name: customer,
          influencedARR: data.totalARR,
          revenueImpact: Math.round(data.themes.reduce((s, t) => s + t.revenueImpact, 0) / n),
          strategicFit: Math.round(data.themes.reduce((s, t) => s + t.strategicFit, 0) / n),
          competitiveDiff: Math.round(data.themes.reduce((s, t) => s + t.competitiveDiff, 0) / n),
          signalFrequency: Math.round(data.themes.reduce((s, t) => s + t.signalFrequency, 0) / n),
          signals: data.signals,
          productArea: `${n} theme${n > 1 ? "s" : ""}`,
        };
      });
    }
    if (viewBy === "Product Area") {
      const map = {};
      filtered.forEach(t => {
        const key = t.productArea;
        if (!map[key]) map[key] = [];
        map[key].push(t);
      });
      return Object.entries(map).map(([area, themes]) => {
        const n = themes.length;
        const allSignals = themes.flatMap(t => t.signals);
        return {
          id: `area-${area}`,
          name: area,
          influencedARR: themes.reduce((s, t) => s + t.influencedARR, 0),
          revenueImpact: Math.round(themes.reduce((s, t) => s + t.revenueImpact, 0) / n),
          strategicFit: Math.round(themes.reduce((s, t) => s + t.strategicFit, 0) / n),
          competitiveDiff: Math.round(themes.reduce((s, t) => s + t.competitiveDiff, 0) / n),
          signalFrequency: Math.round(themes.reduce((s, t) => s + t.signalFrequency, 0) / n),
          signals: allSignals,
          productArea: `${n} theme${n > 1 ? "s" : ""}`,
        };
      });
    }
    return filtered;
  }, [viewBy, filtered]);
  const getDateRange = () => {
    const today = new Date();
    const fmt = (d) => `${d.toLocaleString("default", { month: "short" })} ${d.getDate()}, ${d.getFullYear()}`;
    if (datePreset === "custom") {
      if (customDateFrom && customDateTo) {
        return `${fmt(new Date(customDateFrom + "T00:00:00"))} – ${fmt(new Date(customDateTo + "T00:00:00"))}`;
      }
      return "Select dates";
    }
    const days = parseInt(datePreset);
    const from = new Date(today);
    from.setDate(from.getDate() - days);
    return `${fmt(from)} – ${fmt(today)}`;
  };
  const datePresetLabel = {
    "7": "Last 7 days", "14": "Last 14 days", "30": "Last 30 days",
    "60": "Last 60 days", "90": "Last 90 days", "180": "Last 180 days",
    "custom": "Custom",
  };
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: T.bg, color: T.fg, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 18 }}>Loading themes...</div>;
  if (error) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: T.bg, color: '#F04438', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 18 }}>Error: {error}</div>;
  return (
    <div style={{
      minHeight: "100vh", display: "flex", background: T.bg, color: T.text,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      transition: "background 0.35s ease, color 0.35s ease",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: transparent; border-radius: 4px; }
        *:hover::-webkit-scrollbar-thumb { background: ${T.scrollThumb}; }
        html { scrollbar-width: thin; scrollbar-color: ${T.scrollThumb} transparent; }
        button:focus-visible { outline: 2px solid #7F56D9; outline-offset: 2px; }
        button:focus:not(:focus-visible) { outline: none; }
        input[type="range"] { height: 6px; }
        select option { background: ${T.surface}; color: ${T.textTitle}; }
        @media (max-width: 639px) {
          ::-webkit-scrollbar { display: none; }
          html { scrollbar-width: none; }
        }
      `}</style>
      {/* Sidebar — desktop & tablet */}
      {!isMobile && (() => {
        const collapsed = isTablet || sidebarCollapsed;
        return (
        <aside style={{
          width: collapsed ? 60 : 220, flexShrink: 0, background: T.surface,
          borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column",
          position: "sticky", top: 0, height: "100vh", overflowY: "auto", overflowX: "hidden",
          transition: "width 0.3s ease, background 0.35s ease",
        }}>
          {/* Logo */}
          <div style={{ padding: collapsed ? "16px 0" : "16px 16px", display: "flex", alignItems: "center", gap: 10, justifyContent: collapsed ? "center" : "flex-start", marginBottom: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: "#F4EBFF", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15, fontWeight: 800, color: "#7F56D9", border: "1px solid #E9D7FE",
            }}>S</div>
            {!collapsed && (
              <>
                <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.textTitle, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>Sift</h1>
                <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 8px", borderRadius: 16, background: "#F4EBFF", color: "#7F56D9", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>Beta</span>
              </>
            )}
          </div>
          {/* Nav Items */}
          <nav style={{ flex: 1, padding: "0 8px" }}>
            {[
              { key: "dashboard", label: "Dashboard", icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
              )},
              { key: "review", label: "Signals", icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              )},
              { key: "connectors", label: "Connectors", icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                </svg>
              )},
            ].map(item => (
              <button key={item.key} onClick={() => setActivePage(item.key)} title={collapsed ? item.label : undefined} style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: collapsed ? "10px 0" : "10px 12px", margin: "2px 0", borderRadius: 8,
                border: "none", cursor: "pointer", fontFamily: "inherit",
                justifyContent: collapsed ? "center" : "flex-start",
                background: activePage === item.key ? (isDark ? "#6941C620" : "#F4EBFF") : "transparent",
                color: activePage === item.key ? "#7F56D9" : T.textMuted,
                fontSize: 13, fontWeight: activePage === item.key ? 600 : 500,
                transition: "all 0.2s ease", whiteSpace: "nowrap", overflow: "hidden",
              }}
                onMouseEnter={e => { if (activePage !== item.key) e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"; }}
                onMouseLeave={e => { if (activePage !== item.key) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ flexShrink: 0, display: "flex" }}>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </button>
            ))}
          </nav>
          {/* Bottom section */}
          <div style={{ padding: collapsed ? "12px 0" : "12px 16px", borderTop: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 12, alignItems: collapsed ? "center" : "stretch" }}>
            {/* SSE indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: collapsed ? "center" : "flex-start" }} title={eventStream.connected ? "Live updates active" : "Reconnecting..."}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: eventStream.connected ? "#12B76A" : "#F04438", transition: "background 0.3s", boxShadow: eventStream.connected ? "0 0 4px #12B76A60" : "none", flexShrink: 0 }} />
              {!collapsed && <span style={{ fontSize: 11, color: eventStream.connected ? "#12B76A" : "#F04438", fontWeight: 600, whiteSpace: "nowrap" }}>{eventStream.connected ? "Live" : "Reconnecting..."}</span>}
            </div>
            {/* Dark/Light toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: collapsed ? "center" : "flex-start" }}>
              <button onClick={() => setIsDark(!isDark)} style={{
                width: 44, height: 24, borderRadius: 12, border: `1px solid ${T.border}`,
                background: isDark ? T.pill : T.barBg, cursor: "pointer", position: "relative",
                transition: "background 0.3s ease, border-color 0.3s ease", flexShrink: 0, padding: 0,
              }} title={isDark ? "Switch to light mode" : "Switch to dark mode"}>
                <div style={{
                  width: 20, height: 20, borderRadius: 10, background: "#FFFFFF",
                  position: "absolute", top: 1, left: isDark ? 1 : 21,
                  transition: "left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11,
                  boxShadow: "0px 1px 3px rgba(16, 24, 40, 0.1), 0px 1px 2px rgba(16, 24, 40, 0.06)",
                }}>
                  {isDark ? "🌙" : "☀️"}
                </div>
              </button>
              {!collapsed && <span style={{ fontSize: 11, color: T.textMuted, whiteSpace: "nowrap" }}>{isDark ? "Dark" : "Light"}</span>}
            </div>
            {clerkAvailable && UserButton && <div style={{ display: "flex", justifyContent: collapsed ? "center" : "flex-start" }}><UserButton /></div>}
            {/* Collapse/Expand toggle — hidden on tablet since it auto-collapses */}
            {!isTablet && (
              <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                width: "100%", padding: "8px 0", border: "none", borderRadius: 6,
                background: "transparent", cursor: "pointer", color: T.textDim,
                fontSize: 11, fontFamily: "inherit", transition: "color 0.2s",
              }}
                onMouseEnter={e => e.currentTarget.style.color = T.textMuted}
                onMouseLeave={e => e.currentTarget.style.color = T.textDim}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: collapsed ? "rotate(180deg)" : "none", transition: "transform 0.3s ease" }}>
                  <polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/>
                </svg>
                {!collapsed && <span>Collapse</span>}
              </button>
            )}
          </div>
        </aside>
        );
      })()}
      {/* Main Content */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", paddingBottom: isMobile ? 64 : 0 }}>
      {/* Header */}
      <div style={{
        padding: `${isMobile ? 12 : 16}px ${px}px 0`,
        background: T.surface, borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isMobile ? 12 : 16, gap: 12 }}>
          {/* Mobile: logo + page title */}
          {isMobile ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: "#F4EBFF", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 800, color: "#7F56D9", border: "1px solid #E9D7FE", flexShrink: 0,
              }}>S</div>
              <span style={{ fontSize: 15, fontWeight: 700, color: T.textTitle, letterSpacing: "-0.02em" }}>
                {activePage === "review" ? "Signals" : activePage === "connectors" ? "Connectors" : "Dashboard"}
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: eventStream.connected ? "#12B76A" : "#F04438", transition: "background 0.3s", boxShadow: eventStream.connected ? "0 0 4px #12B76A60" : "none" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: T.textTitle }}>
                {activePage === "review" ? "Signals" : activePage === "connectors" ? "Connectors" : "Dashboard"}
              </span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12 }}>
            {/* Auth controls */}
            {clerkAvailable && OrganizationSwitcher && (
              <OrganizationSwitcher appearance={{ elements: { rootBox: { fontSize: 12 } } }} />
            )}
            {/* Date Range Picker */}
            <div ref={datePickerRef} style={{ position: "relative" }}>
              <button onClick={() => setShowDatePicker(!showDatePicker)} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 12px", border: `1px solid ${showDatePicker ? "#7F56D9" : T.border}`,
                borderRadius: 8, cursor: "pointer",
                background: showDatePicker ? (isDark ? "#6941C615" : "#F4EBFF") : T.surface,
                color: T.textTitle, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap",
                transition: "all 0.2s ease", boxShadow: T.shadow, fontFamily: "inherit",
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={showDatePicker ? "#7F56D9" : T.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {!isMobile && <span>{datePresetLabel[datePreset]}</span>}
                <svg width="10" height="10" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M6 8l4 4 4-4" stroke={T.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {showDatePicker && (
                <div style={{
                  position: "absolute", top: "100%", right: 0, marginTop: 8,
                  background: T.surface, border: `1px solid ${T.border}`,
                  borderRadius: 12, padding: 0, zIndex: 50, width: 280,
                  boxShadow: T.shadowLg, overflow: "hidden",
                }}>
                  {/* Date range display */}
                  <div style={{
                    padding: "12px 16px", borderBottom: `1px solid ${T.border}`,
                    fontSize: 11, color: T.textMuted, fontWeight: 500,
                  }}>
                    <div style={{ fontSize: 10, color: T.textDim, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Date Range</div>
                    <div style={{ color: T.textTitle, fontSize: 12, fontWeight: 600 }}>{getDateRange()}</div>
                  </div>
                  {/* Preset options */}
                  <div style={{ padding: "6px 0" }}>
                    {["7", "14", "30", "60", "90", "180", "custom"].map(preset => (
                      <button key={preset} onClick={() => {
                        setDatePreset(preset);
                        if (preset !== "custom") setShowDatePicker(false);
                      }} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        width: "100%", padding: "8px 16px", border: "none", cursor: "pointer",
                        background: datePreset === preset ? (isDark ? "#6941C615" : "#F9F5FF") : "transparent",
                        color: datePreset === preset ? "#7F56D9" : T.textBody,
                        fontSize: 12, fontWeight: datePreset === preset ? 600 : 400,
                        fontFamily: "inherit", textAlign: "left",
                        transition: "background 0.15s ease",
                      }}
                        onMouseEnter={e => { if (datePreset !== preset) e.currentTarget.style.background = isDark ? T.surfaceAlt : "#F9FAFB"; }}
                        onMouseLeave={e => { if (datePreset !== preset) e.currentTarget.style.background = "transparent"; }}
                      >
                        <span>{datePresetLabel[preset]}</span>
                        {datePreset === preset && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7F56D9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                  {/* Custom date inputs */}
                  {datePreset === "custom" && (
                    <div style={{
                      padding: "12px 16px", borderTop: `1px solid ${T.border}`,
                      display: "flex", flexDirection: "column", gap: 10,
                    }}>
                      <div>
                        <div style={{ fontSize: 10, color: T.textDim, marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Start Date</div>
                        <input type="date" value={customDateFrom} onChange={e => setCustomDateFrom(e.target.value)} style={{
                          width: "100%", padding: "7px 10px", borderRadius: 8,
                          border: `1px solid ${T.border}`, background: T.inputBg,
                          color: T.textTitle, fontSize: 12, fontFamily: "inherit", outline: "none",
                        }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: T.textDim, marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>End Date</div>
                        <input type="date" value={customDateTo} onChange={e => setCustomDateTo(e.target.value)} style={{
                          width: "100%", padding: "7px 10px", borderRadius: 8,
                          border: `1px solid ${T.border}`, background: T.inputBg,
                          color: T.textTitle, fontSize: 12, fontFamily: "inherit", outline: "none",
                        }} />
                      </div>
                      <button onClick={() => { if (customDateFrom && customDateTo) setShowDatePicker(false); }} style={{
                        padding: "8px 14px", borderRadius: 8, border: "none",
                        background: customDateFrom && customDateTo ? "#7F56D9" : T.pill,
                        color: customDateFrom && customDateTo ? "#fff" : T.textDim,
                        fontSize: 12, fontWeight: 600, cursor: customDateFrom && customDateTo ? "pointer" : "default",
                        fontFamily: "inherit", transition: "background 0.2s ease",
                      }}>
                        Apply
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Mobile-only controls (sidebar has these on desktop) */}
            {isMobile && (
              <>
                <button onClick={() => setIsDark(!isDark)} style={{
                  width: 44, height: 24, borderRadius: 12, border: `1px solid ${T.border}`,
                  background: isDark ? T.pill : T.barBg, cursor: "pointer", position: "relative",
                  transition: "background 0.3s ease, border-color 0.3s ease", flexShrink: 0, padding: 0,
                }} title={isDark ? "Switch to light mode" : "Switch to dark mode"}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 10, background: "#FFFFFF",
                    position: "absolute", top: 1, left: isDark ? 1 : 21,
                    transition: "left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11,
                    boxShadow: "0px 1px 3px rgba(16, 24, 40, 0.1), 0px 1px 2px rgba(16, 24, 40, 0.06)",
                  }}>
                    {isDark ? "🌙" : "☀️"}
                  </div>
                </button>
                {clerkAvailable && UserButton && <UserButton />}
              </>
            )}
          </div>
        </div>
        {/* Summary Cards */}
        <div style={{ display: "flex", gap: isMobile ? 8 : 10, marginBottom: isMobile ? 10 : 14, overflowX: isMobile ? "auto" : "visible", WebkitOverflowScrolling: "touch" }}>
          {[
            { label: "Signals Ingested", value: totalSignals.toLocaleString(), sub: `${totalGongSignals} Gong · ${totalCannySignals.toLocaleString()} feature requests`, bg: "#7F56D9",
              icon: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7F56D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>) },
            { label: "Customers", value: uniqueGongCustomers, sub: "193,398 users", bg: "#7F56D9",
              icon: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7F56D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>) },
            { label: "Themes", value: totalThemes, sub: "3 opportunities discovered", bg: "#7F56D9",
              icon: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7F56D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>) },
            { label: "Influenced Revenue", value: totalInfluencedARR >= 1000000 ? `$${(totalInfluencedARR / 1000000).toFixed(2)}M` : `$${(totalInfluencedARR / 1000).toFixed(0)}K`, sub: "20 customers · 22 prospects", bg: "#7F56D9",
              icon: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7F56D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>) },
            { label: "Market Signals", value: `${THEMES.reduce((s, t) => s + t.signals.filter(x => x.competitors && x.competitors.length > 0).length, 0)}`, sub: "7 competitors · 5 gaps", bg: "#7F56D9",
              icon: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7F56D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>) },
          ].map((card, i) => (
            <div key={i} style={{
              background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10,
              padding: isMobile ? "10px 12px" : "12px 14px",
              transition: "background 0.3s ease, border-color 0.3s ease",
              boxShadow: T.shadow, flex: isMobile ? "0 0 140px" : 1, minWidth: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: `${card.bg}10`, border: `1px solid ${card.bg}18`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{card.icon}</div>
                <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 500, lineHeight: 1.2 }}>{card.label}</div>
              </div>
              <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: T.textTitle, letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 2 }}>{card.value}</div>
              <div style={{ fontSize: 10, color: T.textMuted, lineHeight: 1.3 }}>{card.sub}</div>
            </div>
          ))}
        </div>
      </div>
      {activePage === "review" ? (
        <ReviewQueuePage T={T} isDark={isDark} isMobile={isMobile} isAdmin={isAdmin} orgId={orgId} eventStream={eventStream} />
      ) : activePage === "connectors" ? (
        <ConnectorsPage T={T} isDark={isDark} isMobile={isMobile} isAdmin={isAdmin} orgId={orgId} eventStream={eventStream} />
      ) : (
      <>
      {/* Controls Bar */}
      <div style={{
        padding: `${isMobile ? 10 : 12}px ${px}px`,
        display: "flex", alignItems: "center", gap: isMobile ? 8 : 12,
        flexWrap: isMobile ? "wrap" : "nowrap",
        borderBottom: `1px solid ${T.border}`,
        position: "sticky", top: 0, zIndex: 10,
        background: T.stickyBg, backdropFilter: "blur(12px)",
        transition: "background 0.3s ease",
      }}>
        {/* View By Dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 500, whiteSpace: "nowrap" }}>View by:</span>
          <div style={{ position: "relative" }}>
            <select
              value={viewBy}
              onChange={e => setViewBy(e.target.value)}
              style={{
                appearance: "none", WebkitAppearance: "none",
                padding: "6px 28px 6px 10px", border: `1px solid ${T.border}`,
                borderRadius: 8, fontSize: 12, fontWeight: 500,
                background: T.surface, color: T.textTitle,
                cursor: "pointer", fontFamily: "inherit",
                boxShadow: T.shadow, outline: "none",
              }}
            >
              {viewOptions.map(opt => (
                <option key={opt} value={opt}>
                  {opt === "Confidence Score" ? "Theme" : opt}
                </option>
              ))}
            </select>
            <svg width="12" height="12" viewBox="0 0 20 20" fill={T.textMuted} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
              <path d="M6 8l4 4 4-4" fill="none" stroke={T.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          {!isMobile && (
            <>
              <div style={{ width: 1, height: 16, background: T.border, margin: "0 2px" }} />
              {[
                { key: "list", icon: (<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="1" y="2" width="14" height="2" rx="1" fill="currentColor"/><rect x="1" y="7" width="14" height="2" rx="1" fill="currentColor"/><rect x="1" y="12" width="14" height="2" rx="1" fill="currentColor"/></svg>), title: "List view" },
                { key: "bubble", icon: (<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="9" r="4.5" stroke="currentColor" strokeWidth="1.5" fill="none"/><circle cx="11.5" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" fill="none"/><circle cx="3.5" cy="4" r="1.5" fill="currentColor"/></svg>), title: "Bubble chart" },
              ].map(m => (
                <button key={m.key} onClick={() => setDisplayMode(m.key)} title={m.title} style={{
                  width: 26, height: 26, border: "none", borderRadius: 6,
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                  background: displayMode === m.key ? (isDark ? "#6941C622" : "#6941C618") : "transparent",
                  color: displayMode === m.key ? "#7F56D9" : T.textDim, transition: "all 0.2s ease",
                }}>{m.icon}</button>
              ))}
            </>
          )}
        </div>
        {/* Search */}
        <div style={{ position: "relative", flex: isMobile ? "1 1 100%" : "1 1 auto" }}>
          <input type="text" placeholder="Search themes..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
            style={{
              padding: "7px 12px 7px 32px", background: T.inputBg,
              border: `1px solid ${searchFocused ? "#7F56D9" : T.border}`,
              borderRadius: 8, color: T.text, fontSize: 13, width: "100%", fontFamily: "inherit",
              transition: "border-color 0.2s ease, box-shadow 0.2s ease", outline: "none",
              boxShadow: searchFocused ? "0 0 0 3px #F4EBFF, 0 1px 2px rgba(16,24,40,0.05)" : T.shadow,
            }}
          />
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.textMuted }}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="9" cy="9" r="6"/><path d="M13.5 13.5L17 17"/></svg>
          </span>
        </div>
        {/* Filters */}
        <div ref={filterRef} style={{ position: "relative", flexShrink: 0 }}>
          <button onClick={() => setShowFilters(!showFilters)} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 12px", border: `1px solid ${showFilters || hasActiveFilters ? "#7F56D9" : T.border}`,
            borderRadius: 8, cursor: "pointer",
            background: showFilters ? "#F4EBFF" : T.surface,
            color: showFilters || hasActiveFilters ? "#7F56D9" : T.textBody,
            fontSize: 12, fontWeight: 500, whiteSpace: "nowrap",
            transition: "all 0.2s ease", boxShadow: T.shadow,
          }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1.5 3h13M3.5 6.5h9M5.5 10h5M7 13.5h2" strokeLinecap="round"/>
            </svg>
            {!isMobile && "Filters"}
            {hasActiveFilters && <span style={{ width: 6, height: 6, borderRadius: 3, background: "#7F56D9", flexShrink: 0 }} />}
          </button>
          {showFilters && (
            <div style={{
              position: isMobile ? "fixed" : "absolute",
              top: isMobile ? "auto" : "100%", bottom: isMobile ? 0 : "auto",
              left: isMobile ? 0 : "auto", right: isMobile ? 0 : 0,
              marginTop: isMobile ? 0 : 8,
              background: T.surface, border: `1px solid ${T.border}`,
              borderRadius: isMobile ? "16px 16px 0 0" : 12,
              padding: isMobile ? 24 : 20, zIndex: 50,
              width: isMobile ? "100%" : 360, maxHeight: isMobile ? "70vh" : "auto",
              overflowY: "auto", boxShadow: T.shadowLg,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.textTitle }}>Filters</span>
                <button onClick={() => setFilters({ biasOnly: false, biasTypes: new Set(), revenueMin: 0, revenueMax: 500, scoreMin: 0, scoreMax: 100 })}
                  style={{ border: "none", background: "transparent", color: "#7F56D9", fontSize: 11, fontWeight: 600, cursor: "pointer", padding: "2px 6px", borderRadius: 4, opacity: hasActiveFilters ? 1 : 0.4, pointerEvents: hasActiveFilters ? "auto" : "none", transition: "opacity 0.2s ease" }}>
                  Reset all
                </button>
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.textTitle, marginBottom: 10 }}>Bias Signals</div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 10, fontSize: 12, color: T.textBody }}>
                  <input type="checkbox" checked={filters.biasOnly} onChange={e => setFilters(f => ({ ...f, biasOnly: e.target.checked }))} style={{ accentColor: "#7F56D9" }} />
                  Show only themes with bias signals
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {Object.entries(BIAS_TAG_INFO).map(([tag, info]) => {
                    const active = filters.biasTypes.has(tag);
                    return (
                      <button key={tag} onClick={() => { setFilters(f => { const next = new Set(f.biasTypes); active ? next.delete(tag) : next.add(tag); return { ...f, biasTypes: next }; }); }}
                        style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 16, fontSize: 12, fontWeight: 500, cursor: "pointer", border: `1px solid ${active ? info.color + "60" : T.border}`, background: active ? info.color + "12" : "transparent", color: active ? info.color : T.textMuted, transition: "all 0.15s ease" }}>
                        <span style={{ fontSize: 11 }}>{info.icon}</span> {info.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.textTitle, marginBottom: 10 }}>Influenced Revenue</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: T.textFaint, marginBottom: 4 }}>Min ($K)</div>
                    <input type="range" min="0" max="500" step="10" value={filters.revenueMin} onChange={e => setFilters(f => ({ ...f, revenueMin: +e.target.value }))} style={{ width: "100%", accentColor: "#7F56D9" }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.textTitle, minWidth: 50, textAlign: "center" }}>${filters.revenueMin}K</span>
                  <span style={{ color: T.textFaint }}>–</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.textTitle, minWidth: 50, textAlign: "center" }}>${filters.revenueMax}K</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: T.textFaint, marginBottom: 4 }}>Max ($K)</div>
                    <input type="range" min="0" max="500" step="10" value={filters.revenueMax} onChange={e => setFilters(f => ({ ...f, revenueMax: +e.target.value }))} style={{ width: "100%", accentColor: "#7F56D9" }} />
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.textTitle, marginBottom: 10 }}>Confidence Score</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: T.textFaint, marginBottom: 4 }}>Min</div>
                    <input type="range" min="0" max="100" step="5" value={filters.scoreMin} onChange={e => setFilters(f => ({ ...f, scoreMin: +e.target.value }))} style={{ width: "100%", accentColor: "#7F56D9" }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.textBody, fontFamily: "'Inter', sans-serif", minWidth: 28, textAlign: "center" }}>{filters.scoreMin}</span>
                  <span style={{ color: T.textFaint }}>–</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.textBody, fontFamily: "'Inter', sans-serif", minWidth: 28, textAlign: "center" }}>{filters.scoreMax}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: T.textFaint, marginBottom: 4 }}>Max</div>
                    <input type="range" min="0" max="100" step="5" value={filters.scoreMax} onChange={e => setFilters(f => ({ ...f, scoreMax: +e.target.value }))} style={{ width: "100%", accentColor: "#7F56D9" }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Theme List */}
      <div style={{ padding: `${isMobile ? 10 : 16}px ${px}px 40px` }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", color: T.textMuted, fontSize: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: T.surfaceAlt, border: `1px solid ${T.border}`, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke={T.textMuted} strokeWidth="1.5" strokeLinecap="round"><circle cx="9" cy="9" r="6"/><path d="M13.5 13.5L17 17"/></svg>
            </div>
            <div style={{ fontWeight: 600, marginBottom: 4, color: T.textTitle }}>
              {searchQuery ? `No themes match "${searchQuery}"` : "No themes match current filters"}
            </div>
            <div style={{ fontSize: 13, color: T.textMuted }}>
              {hasActiveFilters ? "Try adjusting your filters or clearing them" : "Try searching by account name, keyword, bias tag, or quote"}
            </div>
          </div>
        ) : displayMode === "bubble" ? (
          <BubbleChart themes={bubbleThemes} T={T} isDark={isDark} onSelect={(id) => { setDisplayMode("list"); setOpenThemes(new Set([id])); }}
            sizeMetric={(viewBy === "Customer" || viewBy === "Competitor") ? "signals" : "customers"}
            sizeLabel={(viewBy === "Customer" || viewBy === "Competitor") ? "# signals" : "# customers"} />
        ) : viewBy === "Confidence Score" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.map((theme, i) => (
                <ThemeRow key={theme.id} theme={theme} rank={i + 1} isOpen={openThemes.has(theme.id)} onToggle={() => toggleTheme(theme.id)} T={T} isMobile={isMobile} isDark={isDark} />
              ))}
            </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {grouped && grouped.map(([group, themes, extra]) => (
              <div key={group}>
                <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12, flexWrap: "wrap", marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${T.borderLight}` }}>
                  {viewBy === "Competitor" && <span style={{ fontSize: 14 }}>⚔</span>}
                  <h3 style={{ margin: 0, fontSize: isMobile ? 14 : 16, fontWeight: 600, color: T.textTitle }}>{group}</h3>
                  <span style={{ fontSize: 12, padding: "2px 10px", borderRadius: 16, background: T.pill, color: T.textMuted, fontWeight: 500 }}>
                    {themes.length} {themes.length === 1 ? "theme" : "themes"}
                  </span>
                  {viewBy === "Competitor" ? (
                    <span style={{ fontSize: 12, color: "#F04438", fontWeight: 500 }}>{extra} {extra === 1 ? "mention" : "mentions"}</span>
                  ) : viewBy === "Customer" && extra > 0 ? (
                    <span style={{ fontSize: 12, color: "#12B76A", fontWeight: 500 }}>
                      {extra >= 1000000 ? `$${(extra / 1000000).toFixed(2)}M` : `$${(extra / 1000).toFixed(0)}K`} ARR
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: T.textMuted }}>
                      {(() => { const v = themes.reduce((s, t) => s + t.influencedARR, 0); return v >= 1000000 ? `$${(v / 1000000).toFixed(2)}M` : `$${(v / 1000).toFixed(0)}K`; })()} influenced
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {themes.map((theme) => {
                    const globalRank = scored.findIndex(s => s.id === theme.id) + 1;
                    return <ThemeRow key={theme.id} theme={theme} rank={globalRank} isOpen={openThemes.has(theme.id)} onToggle={() => toggleTheme(theme.id)} T={T} isMobile={isMobile} isDark={isDark} />;
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Footer */}
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
          Sources: 42 Gong Transcripts · 4,329 Canny Feature Requests · Competitive Analysis
        </div>
      </div>
      </>
      )}
      </div>
      {/* Mobile bottom navigation */}
      {isMobile && (
        <nav style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
          background: T.surface, borderTop: `1px solid ${T.border}`,
          display: "flex", justifyContent: "space-around", padding: "8px 0 env(safe-area-inset-bottom, 8px)",
          boxShadow: "0 -2px 8px rgba(0,0,0,0.08)",
        }}>
          {[
            { key: "dashboard", label: "Dashboard", icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            )},
            { key: "review", label: "Signals", icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            )},
            { key: "connectors", label: "Connectors", icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
              </svg>
            )},
          ].map(item => (
            <button key={item.key} onClick={() => setActivePage(item.key)} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              border: "none", background: "transparent", cursor: "pointer", padding: "4px 12px",
              color: activePage === item.key ? "#7F56D9" : T.textMuted,
              fontSize: 10, fontWeight: activePage === item.key ? 600 : 500,
              fontFamily: "inherit", transition: "color 0.2s",
            }}>
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

export default function App() {
  if (!clerkAvailable) {
    // No Clerk configured — render without auth (dev mode)
    return <AuthenticatedApp orgId="org_default" isAdmin={true} />;
  }

  return (
    <>
      <SignedOut>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#0C111D" }}>
          <SignIn />
        </div>
      </SignedOut>
      <SignedIn>
        <AppWithAuth />
      </SignedIn>
    </>
  );
}

function AppWithAuth() {
  const { getToken } = useAuth();
  const { organization, membership } = useOrganization();
  const orgId = organization?.id || "org_default";
  const isAdmin = membership?.role === "org:admin";

  useEffect(() => {
    setAuthTokenProvider(getToken);
  }, [getToken]);

  if (!organization) {
    return (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#0C111D", color: "#fff", gap: 16 }}>
        <h2 style={{ margin: 0 }}>Select an Organization</h2>
        <p style={{ margin: 0, color: "#98A2B3" }}>Please select or create an organization to continue.</p>
        <OrganizationSwitcher />
      </div>
    );
  }

  return <AuthenticatedApp orgId={orgId} isAdmin={isAdmin} />;
}
