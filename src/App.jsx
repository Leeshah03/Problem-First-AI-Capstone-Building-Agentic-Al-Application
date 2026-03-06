import { useState, useMemo } from "react";
import { useWindowWidth } from "./hooks/useWindowWidth";
import { THEMES, VIEW_OPTIONS } from "./data/themes";
import { darkTheme, lightTheme } from "./styles/theme";
import { computeScore, formatARR } from "./utils/scoring";
import { Header } from "./components/Header";
import { ControlsBar } from "./components/ControlsBar";
import { ThemeRow } from "./components/ThemeRow";
import { BubbleChart } from "./components/BubbleChart";
import { Footer } from "./components/Footer";

export default function App() {
  const [viewBy, setViewBy] = useState("Confidence Score");
  const [openThemes, setOpenThemes] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    biasOnly: false, biasTypes: new Set(),
    revenueMin: 0, revenueMax: 500, scoreMin: 0, scoreMax: 100,
  });
  const [isDark, setIsDark] = useState(true);
  const [displayMode, setDisplayMode] = useState("list");
  const [datePreset, setDatePreset] = useState("7");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");

  const T = isDark ? darkTheme : lightTheme;
  const W = useWindowWidth();
  const isMobile = W < 640;
  const isTablet = W >= 640 && W < 1024;
  const px = isMobile ? 16 : 36;

  const toggleTheme = (id) => {
    setOpenThemes(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const scored = useMemo(() =>
    THEMES.map(t => ({ ...t, score: computeScore(t) })).sort((a, b) => b.score - a.score),
  []);

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

  const bubbleThemes = useMemo(() => {
    if (viewBy === "Competitor") {
      const map = {};
      filtered.forEach(t => {
        const comps = new Set();
        t.signals.forEach(s => { if (s.competitors) s.competitors.forEach(c => comps.add(c)); });
        comps.forEach(comp => {
          if (!map[comp]) map[comp] = { themes: [], signals: [], mentions: 0 };
          if (!map[comp].themes.find(x => x.id === t.id)) map[comp].themes.push(t);
          const compSignals = t.signals.filter(s => s.competitors && s.competitors.includes(comp));
          map[comp].signals.push(...compSignals);
          map[comp].mentions += compSignals.length;
        });
      });
      return Object.entries(map).map(([comp, data]) => {
        const n = data.themes.length;
        return {
          id: `comp-${comp}`, name: comp,
          influencedARR: data.themes.reduce((s, t) => s + t.influencedARR, 0),
          revenueImpact: Math.round(data.themes.reduce((s, t) => s + t.revenueImpact, 0) / n),
          strategicFit: Math.round(data.themes.reduce((s, t) => s + t.strategicFit, 0) / n),
          competitiveDiff: Math.round(data.themes.reduce((s, t) => s + t.competitiveDiff, 0) / n),
          signalFrequency: Math.round(data.themes.reduce((s, t) => s + t.signalFrequency, 0) / n),
          signals: data.signals,
          productArea: `${n} theme${n > 1 ? "s" : ""} \u00B7 ${data.mentions} mention${data.mentions > 1 ? "s" : ""}`,
        };
      });
    }
    if (viewBy === "Strategic Pillar") {
      const map = {};
      filtered.forEach(t => { const key = t.strategicGoal; if (!map[key]) map[key] = []; map[key].push(t); });
      return Object.entries(map).map(([pillar, themes]) => {
        const n = themes.length;
        return {
          id: `pillar-${pillar}`, name: pillar,
          influencedARR: themes.reduce((s, t) => s + t.influencedARR, 0),
          revenueImpact: Math.round(themes.reduce((s, t) => s + t.revenueImpact, 0) / n),
          strategicFit: Math.round(themes.reduce((s, t) => s + t.strategicFit, 0) / n),
          competitiveDiff: Math.round(themes.reduce((s, t) => s + t.competitiveDiff, 0) / n),
          signalFrequency: Math.round(themes.reduce((s, t) => s + t.signalFrequency, 0) / n),
          signals: themes.flatMap(t => t.signals),
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
          id: `customer-${customer}`, name: customer,
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
      filtered.forEach(t => { const key = t.productArea; if (!map[key]) map[key] = []; map[key].push(t); });
      return Object.entries(map).map(([area, themes]) => {
        const n = themes.length;
        return {
          id: `area-${area}`, name: area,
          influencedARR: themes.reduce((s, t) => s + t.influencedARR, 0),
          revenueImpact: Math.round(themes.reduce((s, t) => s + t.revenueImpact, 0) / n),
          strategicFit: Math.round(themes.reduce((s, t) => s + t.strategicFit, 0) / n),
          competitiveDiff: Math.round(themes.reduce((s, t) => s + t.competitiveDiff, 0) / n),
          signalFrequency: Math.round(themes.reduce((s, t) => s + t.signalFrequency, 0) / n),
          signals: themes.flatMap(t => t.signals),
          productArea: `${n} theme${n > 1 ? "s" : ""}`,
        };
      });
    }
    return filtered;
  }, [viewBy, filtered]);

  const viewOptions = ["Confidence Score", ...VIEW_OPTIONS];

  return (
    <div style={{
      minHeight: "100vh", background: T.bg, color: T.text,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      transition: "background 0.35s ease, color 0.35s ease",
    }}>
      <style>{`
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

      <Header
        T={T} isDark={isDark} setIsDark={setIsDark} isMobile={isMobile}
        datePreset={datePreset} setDatePreset={setDatePreset}
        customDateFrom={customDateFrom} setCustomDateFrom={setCustomDateFrom}
        customDateTo={customDateTo} setCustomDateTo={setCustomDateTo}
        px={px}
      />

      <ControlsBar
        T={T} isDark={isDark} isMobile={isMobile}
        viewBy={viewBy} setViewBy={setViewBy} viewOptions={viewOptions}
        displayMode={displayMode} setDisplayMode={setDisplayMode}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        searchFocused={searchFocused} setSearchFocused={setSearchFocused}
        filters={filters} setFilters={setFilters}
        showFilters={showFilters} setShowFilters={setShowFilters}
        hasActiveFilters={hasActiveFilters}
        px={px}
      />

      <div style={{ padding: `${isMobile ? 10 : 16}px ${px}px 40px` }}>
        {filtered.length === 0 ? (
          <EmptyState searchQuery={searchQuery} hasActiveFilters={hasActiveFilters} T={T} />
        ) : displayMode === "bubble" ? (
          <BubbleChart
            themes={bubbleThemes} T={T} isDark={isDark}
            onSelect={(id) => { setDisplayMode("list"); setOpenThemes(new Set([id])); }}
            sizeMetric={(viewBy === "Customer" || viewBy === "Competitor") ? "signals" : "customers"}
            sizeLabel={(viewBy === "Customer" || viewBy === "Competitor") ? "# signals" : "# customers"}
          />
        ) : viewBy === "Confidence Score" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((theme, i) => (
              <ThemeRow key={theme.id} theme={theme} rank={i + 1} isOpen={openThemes.has(theme.id)} onToggle={() => toggleTheme(theme.id)} T={T} isMobile={isMobile} />
            ))}
          </div>
        ) : (
          <GroupedView grouped={grouped} scored={scored} openThemes={openThemes} toggleTheme={toggleTheme} viewBy={viewBy} T={T} isMobile={isMobile} />
        )}
      </div>

      <Footer T={T} isMobile={isMobile} isTablet={isTablet} px={px} />
    </div>
  );
}

function EmptyState({ searchQuery, hasActiveFilters, T }) {
  return (
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
  );
}

function GroupedView({ grouped, scored, openThemes, toggleTheme, viewBy, T, isMobile }) {
  if (!grouped) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {grouped.map(([group, themes, extra]) => (
        <div key={group}>
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12, flexWrap: "wrap", marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${T.borderLight}` }}>
            {viewBy === "Competitor" && <span style={{ fontSize: 14 }}>{"\u2694"}</span>}
            <h3 style={{ margin: 0, fontSize: isMobile ? 14 : 16, fontWeight: 600, color: T.textTitle }}>{group}</h3>
            <span style={{ fontSize: 12, padding: "2px 10px", borderRadius: 16, background: T.pill, color: T.textMuted, fontWeight: 500 }}>
              {themes.length} {themes.length === 1 ? "theme" : "themes"}
            </span>
            {viewBy === "Competitor" ? (
              <span style={{ fontSize: 12, color: "#F04438", fontWeight: 500 }}>{extra} {extra === 1 ? "mention" : "mentions"}</span>
            ) : viewBy === "Customer" && extra > 0 ? (
              <span style={{ fontSize: 12, color: "#12B76A", fontWeight: 500 }}>
                {formatARR(extra)} ARR
              </span>
            ) : (
              <span style={{ fontSize: 12, color: T.textMuted }}>
                {formatARR(themes.reduce((s, t) => s + t.influencedARR, 0))} influenced
              </span>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {themes.map((theme) => {
              const globalRank = scored.findIndex(s => s.id === theme.id) + 1;
              return <ThemeRow key={theme.id} theme={theme} rank={globalRank} isOpen={openThemes.has(theme.id)} onToggle={() => toggleTheme(theme.id)} T={T} isMobile={isMobile} />;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
