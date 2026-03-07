import { db } from '../db/index.js';
import { themes, signals, themeSignals } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

function transformSignalRow(row) {
  if (row.source === 'gong') {
    const signal = {
      type: 'gong',
      id: row.externalId,
      tag: row.biasTag,
      account: row.account,
      arr: row.arr,
      quote: row.content,
      speaker: row.speaker,
    };
    if (row.competitors && row.competitors.length > 0) {
      signal.competitors = row.competitors;
    }
    if (row.aiSummary) signal.aiSummary = row.aiSummary;
    if (row.aiConfidence != null) signal.aiConfidence = row.aiConfidence;
    if (row.biasConfidence != null) signal.biasConfidence = row.biasConfidence;
    if (row.needsReview) signal.needsReview = true;
    if (row.classifiedAt) signal.classifiedAt = row.classifiedAt;
    return signal;
  } else if (row.source === 'canny') {
    const cannySignal = {
      type: 'canny',
      title: row.title,
      votes: row.votes,
      category: row.category,
    };
    if (row.aiSummary) cannySignal.aiSummary = row.aiSummary;
    if (row.aiConfidence != null) cannySignal.aiConfidence = row.aiConfidence;
    if (row.needsReview) cannySignal.needsReview = true;
    return cannySignal;
  }
  return null;
}

export async function getThemes(req, res) {
  try {
    const allThemes = await db.select().from(themes).where(eq(themes.orgId, req.orgId));

    const allRows = await db.select({
      signal: signals,
      themeId: themeSignals.themeId,
      relevance: themeSignals.relevance,
    }).from(signals)
      .innerJoin(themeSignals, eq(themeSignals.signalId, signals.id))
      .where(eq(signals.orgId, req.orgId));

    const signalsByTheme = {};
    for (const row of allRows) {
      const s = row.signal;
      if (!signalsByTheme[row.themeId]) signalsByTheme[row.themeId] = [];
      const transformed = transformSignalRow(s);
      if (transformed) signalsByTheme[row.themeId].push(transformed);
    }

    const result = allThemes.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      productArea: t.productArea,
      strategicGoal: t.strategicGoal,
      pm: t.pm,
      ...(t.jiraKey && { jiraKey: t.jiraKey }),
      ...(t.jiraStatus && { jiraStatus: t.jiraStatus }),
      revenueImpact: t.revenueImpact,
      strategicFit: t.strategicFit,
      competitiveDiff: t.competitiveDiff,
      signalFrequency: t.signalFrequency,
      influencedARR: t.influencedARR,
      signals: signalsByTheme[t.id] || [],
      prototype: t.prototype,
    }));

    res.json(result);
  } catch (err) {
    console.error('Error fetching themes:', err);
    res.status(500).json({ error: 'Failed to fetch themes' });
  }
}

export async function getThemeById(req, res) {
  try {
    const [theme] = await db.select().from(themes)
      .where(and(eq(themes.id, req.params.id), eq(themes.orgId, req.orgId)));
    if (!theme) return res.status(404).json({ error: 'Theme not found' });

    const rows = await db.select({
      signal: signals,
      relevance: themeSignals.relevance,
    }).from(signals)
      .innerJoin(themeSignals, eq(themeSignals.signalId, signals.id))
      .where(and(eq(themeSignals.themeId, req.params.id), eq(signals.orgId, req.orgId)));

    const transformedSignals = rows.map(row => {
      const s = row.signal;
      if (s.source === 'gong') {
        const signal = {
          type: 'gong',
          id: s.externalId,
          tag: s.biasTag,
          account: s.account,
          arr: s.arr,
          quote: s.content,
          speaker: s.speaker,
        };
        if (s.competitors && s.competitors.length > 0) {
          signal.competitors = s.competitors;
        }
        return signal;
      } else {
        return {
          type: 'canny',
          title: s.title,
          votes: s.votes,
          category: s.category,
        };
      }
    });

    res.json({
      id: theme.id,
      name: theme.name,
      description: theme.description,
      productArea: theme.productArea,
      strategicGoal: theme.strategicGoal,
      pm: theme.pm,
      ...(theme.jiraKey && { jiraKey: theme.jiraKey }),
      ...(theme.jiraStatus && { jiraStatus: theme.jiraStatus }),
      revenueImpact: theme.revenueImpact,
      strategicFit: theme.strategicFit,
      competitiveDiff: theme.competitiveDiff,
      signalFrequency: theme.signalFrequency,
      influencedARR: theme.influencedARR,
      signals: transformedSignals,
      prototype: theme.prototype,
    });
  } catch (err) {
    console.error('Error fetching theme:', err);
    res.status(500).json({ error: 'Failed to fetch theme' });
  }
}
