import crypto from 'crypto';
import { db } from '../db/index.js';
import { pipelineRuns, reviewQueue } from '../db/schema.js';
import { eq, and, desc, count } from 'drizzle-orm';
import { runPipeline } from '../pipeline/orchestrator.js';
import { logger } from '../utils/logger.js';

export async function triggerPipeline(req, res) {
  const { batchSize, unclassifiedOnly } = req.body || {};

  try {
    const pipelineRunId = crypto.randomUUID();
    const now = new Date();

    await db.insert(pipelineRuns).values({
      id: pipelineRunId,
      status: 'pending',
      startedAt: now,
      config: { batchSize, unclassifiedOnly },
      orgId: req.orgId,
      createdAt: now,
    });

    res.json({ pipelineRunId, status: 'started' });

    runPipeline({ batchSize, unclassifiedOnly, orgId: req.orgId }).catch(err => {
      logger.error('Background pipeline failed:', err.message);
    });
  } catch (err) {
    console.error('Error triggering pipeline:', err);
    res.status(500).json({ error: 'Failed to trigger pipeline' });
  }
}

export async function getPipelineStatus(req, res) {
  try {
    const [run] = await db.select().from(pipelineRuns)
      .where(and(eq(pipelineRuns.id, req.params.id), eq(pipelineRuns.orgId, req.orgId)));
    if (!run) return res.status(404).json({ error: 'Pipeline run not found' });

    const reviewCounts = await db.select({
      reviewType: reviewQueue.reviewType,
      value: count(),
    }).from(reviewQueue)
      .where(and(eq(reviewQueue.pipelineRunId, req.params.id), eq(reviewQueue.orgId, req.orgId)))
      .groupBy(reviewQueue.reviewType);

    res.json({
      id: run.id,
      status: run.status,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      totalSignals: run.totalSignals,
      classifiedSignals: run.classifiedSignals,
      biasDetectedSignals: run.biasDetectedSignals,
      embeddedSignals: run.embeddedSignals,
      error: run.error,
      config: run.config,
      reviewItems: Object.fromEntries(reviewCounts.map(r => [r.reviewType, r.value])),
    });
  } catch (err) {
    console.error('Error fetching pipeline status:', err);
    res.status(500).json({ error: 'Failed to fetch pipeline status' });
  }
}

export async function getPipelineRuns(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit || '20'), 100);
    const runs = await db.select().from(pipelineRuns)
      .where(eq(pipelineRuns.orgId, req.orgId))
      .orderBy(desc(pipelineRuns.createdAt))
      .limit(limit);

    res.json(runs.map(r => ({
      id: r.id,
      status: r.status,
      startedAt: r.startedAt,
      completedAt: r.completedAt,
      totalSignals: r.totalSignals,
      classifiedSignals: r.classifiedSignals,
      biasDetectedSignals: r.biasDetectedSignals,
      embeddedSignals: r.embeddedSignals,
      error: r.error,
    })));
  } catch (err) {
    console.error('Error fetching pipeline runs:', err);
    res.status(500).json({ error: 'Failed to fetch pipeline runs' });
  }
}
