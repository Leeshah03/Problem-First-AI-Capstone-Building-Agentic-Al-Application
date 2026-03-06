import { useRef, useState } from "react";
import { useClickOutside } from "../hooks/useClickOutside";
import { THEMES } from "../data/themes";
import { DATE_PRESET_LABELS } from "../data/themes";
import { computeScore, formatARR, getDateRange } from "../utils/scoring";

export function Header({
  T, isDark, setIsDark, isMobile,
  datePreset, setDatePreset,
  customDateFrom, setCustomDateFrom,
  customDateTo, setCustomDateTo,
  px,
}) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef(null);

  useClickOutside(datePickerRef, showDatePicker, () => setShowDatePicker(false));

  const uniqueGongCustomers = (() => {
    const accounts = new Set();
    THEMES.forEach(t => t.signals.forEach(s => { if (s.type === "gong" && s.account) accounts.add(s.account); }));
    return accounts.size;
  })();

  const totalInfluencedARR = THEMES.reduce((sum, t) => sum + t.influencedARR, 0);
  const totalSignals = 42 + 4329;
  const totalThemes = THEMES.length;

  const summaryCards = [
    { label: "Signals Ingested", value: totalSignals.toLocaleString(), sub: "42 Gong \u00B7 4,329 feature requests", bg: "#7F56D9",
      icon: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7F56D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>) },
    { label: "Customers", value: uniqueGongCustomers, sub: "193,398 users", bg: "#7F56D9",
      icon: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7F56D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>) },
    { label: "Themes", value: totalThemes, sub: "3 opportunities discovered", bg: "#7F56D9",
      icon: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7F56D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>) },
    { label: "Influenced Revenue", value: formatARR(totalInfluencedARR), sub: "20 customers \u00B7 22 prospects", bg: "#7F56D9",
      icon: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7F56D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>) },
    { label: "Market Signals", value: `${THEMES.reduce((s, t) => s + t.signals.filter(x => x.competitors && x.competitors.length > 0).length, 0)}`, sub: "7 competitors \u00B7 5 gaps", bg: "#7F56D9",
      icon: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7F56D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>) },
  ];

  return (
    <div style={{
      padding: `${isMobile ? 12 : 16}px ${px}px 0`,
      background: T.surface, borderBottom: `1px solid ${T.border}`,
    }}>
      <div style={{ display: "flex", alignItems: isMobile ? "center" : "flex-start", justifyContent: "space-between", marginBottom: isMobile ? 12 : 16, gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 10, marginBottom: 4 }}>
            <div style={{
              width: isMobile ? 28 : 32, height: isMobile ? 28 : 32, borderRadius: 8,
              background: "#F4EBFF", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: isMobile ? 13 : 15, fontWeight: 800, color: "#7F56D9",
              border: "1px solid #E9D7FE", flexShrink: 0,
            }}>S</div>
            <h1 style={{ margin: 0, fontSize: isMobile ? 16 : 20, fontWeight: 700, color: T.textTitle, letterSpacing: "-0.02em" }}>Project Sift</h1>
            <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 8px", borderRadius: 16, background: "#F4EBFF", color: "#7F56D9", letterSpacing: "0.02em" }}>Beta</span>
          </div>
          {!isMobile && (
            <p style={{ margin: 0, fontSize: 13, color: T.textMuted, maxWidth: 520, lineHeight: 1.4 }}>
              AI-driven prioritization weighted by revenue impact, strategic fit, competitive differentiation, and signal frequency.
            </p>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12 }}>
          <DateRangePicker
            ref={datePickerRef}
            T={T} isDark={isDark} isMobile={isMobile}
            datePreset={datePreset} setDatePreset={setDatePreset}
            customDateFrom={customDateFrom} setCustomDateFrom={setCustomDateFrom}
            customDateTo={customDateTo} setCustomDateTo={setCustomDateTo}
            showDatePicker={showDatePicker} setShowDatePicker={setShowDatePicker}
          />
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
              {isDark ? "\uD83C\uDF19" : "\u2600\uFE0F"}
            </div>
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: isMobile ? 8 : 10, marginBottom: isMobile ? 10 : 14, overflowX: isMobile ? "auto" : "visible", WebkitOverflowScrolling: "touch" }}>
        {summaryCards.map((card, i) => (
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
  );
}

import { forwardRef } from "react";

const DateRangePicker = forwardRef(function DateRangePicker({
  T, isDark, isMobile,
  datePreset, setDatePreset,
  customDateFrom, setCustomDateFrom,
  customDateTo, setCustomDateTo,
  showDatePicker, setShowDatePicker,
}, ref) {
  return (
    <div ref={ref} style={{ position: "relative" }}>
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
        {!isMobile && <span>{DATE_PRESET_LABELS[datePreset]}</span>}
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
          <div style={{
            padding: "12px 16px", borderBottom: `1px solid ${T.border}`,
            fontSize: 11, color: T.textMuted, fontWeight: 500,
          }}>
            <div style={{ fontSize: 10, color: T.textDim, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Date Range</div>
            <div style={{ color: T.textTitle, fontSize: 12, fontWeight: 600 }}>{getDateRange(datePreset, customDateFrom, customDateTo)}</div>
          </div>

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
                <span>{DATE_PRESET_LABELS[preset]}</span>
                {datePreset === preset && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7F56D9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            ))}
          </div>

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
  );
});
