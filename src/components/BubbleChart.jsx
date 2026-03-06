import { useState } from "react";
import { computeScore, getCustomerCount, getSignalCount, formatARR } from "../utils/scoring";
import { BUBBLE_COLORS } from "../data/themes";

export function BubbleChart({ themes, T, isDark, onSelect, sizeMetric = "customers", sizeLabel = "# customers" }) {
  const [hovered, setHovered] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const chartW = 900, chartH = 480;
  const pad = { top: 40, right: 40, bottom: 56, left: 80 };
  const plotW = chartW - pad.left - pad.right;
  const plotH = chartH - pad.top - pad.bottom;
  const maxARR = Math.max(...themes.map(t => t.influencedARR));
  const getSize = sizeMetric === "signals" ? getSignalCount : getCustomerCount;
  const maxSize = Math.max(...themes.map(t => getSize(t)));
  const minScore = Math.min(...themes.map(t => computeScore(t)));
  const maxScore = Math.max(...themes.map(t => computeScore(t)));
  const scaleX = (score) => pad.left + ((score - (minScore - 5)) / ((maxScore + 5) - (minScore - 5))) * plotW;
  const scaleY = (arr) => pad.top + plotH - (arr / (maxARR * 1.15)) * plotH;
  const scaleR = (val) => 14 + (val / maxSize) * 30;
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
        <text x={chartW / 2} y={chartH - 4} textAnchor="middle" fill={T.textDim} fontSize={11} fontWeight={600} fontFamily="Inter, sans-serif">Confidence Score \u2192</text>
        <text x={14} y={chartH / 2} textAnchor="middle" fill={T.textDim} fontSize={11} fontWeight={600} fontFamily="Inter, sans-serif" transform={`rotate(-90, 14, ${chartH / 2})`}>Influenced Revenue \u2192</text>
        {themes.map((t, i) => {
          const score = computeScore(t);
          const cx = scaleX(score); const cy = scaleY(t.influencedARR);
          const r = scaleR(getSize(t));
          const color = BUBBLE_COLORS[i % BUBBLE_COLORS.length];
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
            <span style={{ color: T.textDim }}>ARR: <span style={{ color: "#6CE9A6", fontWeight: 700 }}>{formatARR(tooltip.theme.influencedARR)}</span></span>
            <span style={{ color: T.textDim }}>{sizeMetric === "signals" ? "Signals" : "Customers"}: <span style={{ color: "#F79009", fontWeight: 700 }}>{getSize(tooltip.theme)}</span></span>
          </div>
          <div style={{ fontSize: 10, color: T.textFaint, marginTop: 4 }}>{tooltip.theme.productArea}</div>
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 12, padding: "0 40px" }}>
        {themes.map((t, i) => (
          <div key={t.id} onMouseEnter={() => setHovered(t.id)} onMouseLeave={() => { setHovered(null); setTooltip(null); }} onClick={() => onSelect && onSelect(t.id)}
            style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: hovered === t.id ? T.textTitle : T.textDim, cursor: "pointer", padding: "3px 8px", borderRadius: 6, background: hovered === t.id ? `${BUBBLE_COLORS[i % BUBBLE_COLORS.length]}15` : "transparent", transition: "all 0.2s ease", fontWeight: 500 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: BUBBLE_COLORS[i % BUBBLE_COLORS.length], flexShrink: 0 }} />
            {t.name.length > 30 ? t.name.slice(0, 28) + "\u2026" : t.name}
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
