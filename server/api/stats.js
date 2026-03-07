import { db } from '../db/index.js';
import { themes, signals, connectors, reviewQueue, pipelineRuns } from '../db/schema.js';
import { eq, and, count, sum, isNotNull, desc } from 'drizzle-orm';

export async function getStats(req, res) {
  try {
    const orgId = req.orgId;

    const [themeCount] = await db.select({ value: count() }).from(themes).where(eq(themes.orgId, orgId));
    const [signalCount] = await db.select({ value: count() }).from(signals).where(eq(signals.orgId, orgId));
    const [gongCount] = await db.select({ value: count() }).from(signals).where(and(eq(signals.source, 'gong'), eq(signals.orgId, orgId)));
    const [cannyCount] = await db.select({ value: count() }).from(signals).where(and(eq(signals.source, 'canny'), eq(signals.orgId, orgId)));
    const [pendoCount] = await db.select({ value: count() }).from(signals).where(and(eq(signals.source, 'pendo'), eq(signals.orgId, orgId)));
    const [salesforceCount] = await db.select({ value: count() }).from(signals).where(and(eq(signals.source, 'salesforce'), eq(signals.orgId, orgId)));
    const [jiraCount] = await db.select({ value: count() }).from(signals).where(and(eq(signals.source, 'jira'), eq(signals.orgId, orgId)));
    const [totalARR] = await db.select({ value: sum(themes.influencedARR) }).from(themes).where(eq(themes.orgId, orgId));
    const [connectorCount] = await db.select({ value: count() }).from(connectors).where(eq(connectors.orgId, orgId));

    const [pendingReviews] = await db.select({ value: count() }).from(reviewQueue).where(and(eq(reviewQueue.status, 'pending'), eq(reviewQueue.orgId, orgId)));
    const [lowConfidenceCount] = await db.select({ value: count() }).from(signals).where(and(eq(signals.needsReview, true), eq(signals.orgId, orgId)));
    const [classifiedCount] = await db.select({ value: count() }).from(signals).where(and(isNotNull(signals.classifiedAt), eq(signals.orgId, orgId)));

    const [lastPipelineRun] = await db.select().from(pipelineRuns).where(eq(pipelineRuns.orgId, orgId)).orderBy(desc(pipelineRuns.createdAt)).limit(1);

    res.json({
      themes: themeCount.value,
      signals: signalCount.value,
      signalsBySource: { gong: gongCount.value, canny: cannyCount.value, pendo: pendoCount.value, salesforce: salesforceCount.value, jira: jiraCount.value },
      totalInfluencedARR: totalARR.value || 0,
      connectors: connectorCount.value,
      pendingReviews: pendingReviews.value,
      lowConfidenceSignals: lowConfidenceCount.value,
      classifiedSignals: classifiedCount.value,
      lastPipelineRun: lastPipelineRun ? {
        id: lastPipelineRun.id,
        status: lastPipelineRun.status,
        completedAt: lastPipelineRun.completedAt,
      } : null,
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
}
