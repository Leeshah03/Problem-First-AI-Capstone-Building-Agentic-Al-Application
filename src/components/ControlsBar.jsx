import { useRef, useCallback } from "react";
import { useClickOutside } from "../hooks/useClickOutside";
import { BIAS_TAG_INFO } from "../data/themes";

export function ControlsBar({
  T, isDark, isMobile,
  viewBy, setViewBy, viewOptions,
  displayMode, setDisplayMode,
  searchQuery, setSearchQuery,
  searchFocused, setSearchFocused,
  filters, setFilters,
  showFilters, setShowFilters,
  hasActiveFilters,
  px,
}) {
  const filterRef = useRef(null);

  useClickOutside(filterRef, showFilters, useCallback(() => setShowFilters(false), [setShowFilters]));

  return (
    <div style={{
      padding: `${isMobile ? 10 : 12}px ${px}px`,
      display: "flex", alignItems: "center", gap: isMobile ? 8 : 12,
      flexWrap: isMobile ? "wrap" : "nowrap",
      borderBottom: `1px solid ${T.border}`,
      position: "sticky", top: 0, zIndex: 10,
      background: T.stickyBg, backdropFilter: "blur(12px)",
      transition: "background 0.3s ease",
    }}>
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
          <FilterPanel T={T} isDark={isDark} isMobile={isMobile} filters={filters} setFilters={setFilters} hasActiveFilters={hasActiveFilters} />
        )}
      </div>
    </div>
  );
}

function FilterPanel({ T, isDark, isMobile, filters, setFilters, hasActiveFilters }) {
  return (
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
          <span style={{ color: T.textFaint }}>\u2013</span>
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
          <span style={{ color: T.textFaint }}>\u2013</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.textBody, fontFamily: "'Inter', sans-serif", minWidth: 28, textAlign: "center" }}>{filters.scoreMax}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: T.textFaint, marginBottom: 4 }}>Max</div>
            <input type="range" min="0" max="100" step="5" value={filters.scoreMax} onChange={e => setFilters(f => ({ ...f, scoreMax: +e.target.value }))} style={{ width: "100%", accentColor: "#7F56D9" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
