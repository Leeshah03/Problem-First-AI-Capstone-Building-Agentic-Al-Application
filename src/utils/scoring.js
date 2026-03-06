export function computeScore(theme) {
  return Math.round(
    theme.revenueImpact * 0.4 +
    theme.strategicFit * 0.2 +
    theme.competitiveDiff * 0.2 +
    theme.signalFrequency * 0.2
  );
}

export function getCustomerCount(theme) {
  const gongAccounts = new Set(
    theme.signals
      .filter(s => s.type === "gong" && s.account)
      .map(s => s.account)
  ).size;
  const cannyVotes = theme.signals
    .filter(s => s.type === "canny")
    .reduce((sum, s) => sum + (s.votes || 0), 0);
  return gongAccounts + cannyVotes;
}

export function getSignalCount(theme) {
  return theme.signals.length;
}

export function getScoreColor(score) {
  if (score >= 80) return "#12B76A";
  if (score >= 65) return "#F79009";
  return "#F04438";
}

export function formatARR(value) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  return `$${(value / 1000).toFixed(0)}K`;
}

export function getDateRange(datePreset, customDateFrom, customDateTo) {
  const today = new Date();
  const fmt = (d) => `${d.toLocaleString("default", { month: "short" })} ${d.getDate()}, ${d.getFullYear()}`;
  if (datePreset === "custom") {
    if (customDateFrom && customDateTo) {
      return `${fmt(new Date(customDateFrom + "T00:00:00"))} \u2013 ${fmt(new Date(customDateTo + "T00:00:00"))}`;
    }
    return "Select dates";
  }
  const days = parseInt(datePreset);
  const from = new Date(today);
  from.setDate(from.getDate() - days);
  return `${fmt(from)} \u2013 ${fmt(today)}`;
}
