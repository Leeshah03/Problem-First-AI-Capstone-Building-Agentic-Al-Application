import { BIAS_TAG_INFO } from "../data/themes";

export function BiasTag({ tag }) {
  const info = BIAS_TAG_INFO[tag];
  if (!info) return null;
  return (
    <span
      title={info.desc}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        fontSize: 10, fontWeight: 500, letterSpacing: "0.03em",
        padding: "2px 8px", borderRadius: 16,
        background: info.color + "12", color: info.color,
        border: `1px solid ${info.color}25`,
        textTransform: "uppercase", cursor: "help", whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: 11 }}>{info.icon}</span> {info.label}
    </span>
  );
}
