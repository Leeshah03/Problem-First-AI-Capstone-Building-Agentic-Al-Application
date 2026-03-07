import crypto from 'crypto';
import { config } from '../config.js';
import { db } from '../db/index.js';
import { signals, themes, pipelineRuns } from '../db/schema.js';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { classifyBatch } from './classify.js';
import { detectBiasBatch } from './biasDetect.js';
import { embedBatch } from './embed.js';
import { mergeThemeClusters } from './merge.js';
import { flagLowConfidence } from './confidence.js';
import { eventBus } from '../events/eventBus.js';
import { logger } from '../utils/logger.js';

export async function runPipeline(options = {}) {
  const pipelineRunId = crypto.randomUUID();
  const batchSize = options.batchSize || config.pipeline.batchSize;
  const orgId = options.orgId || config.defaultOrgId;
  const now = new Date();

  // Create pipeline run record
  await db.insert(pipelineRuns).values({
    id: pipelineRunId,
    status: 'running',
    startedAt: now,
    config: { batchSize },
    orgId,
    createdAt: now,
  });

  // Fetch signals to process (org-scoped)
  let conditions = [eq(signals.orgId, orgId)];
  if (options.unclassifiedOnly !== false) {
    conditions.push(isNull(signals.classifiedAt));
  }
  const allSignals = await db.select().from(signals).where(and(...conditions));
  const allThemes = await db.select().from(themes).where(eq(themes.orgId, orgId));

  await db.update(pipelineRuns).set({ totalSignals: allSignals.length })
    .where(eq(pipelineRuns.id, pipelineRunId));

  if (allSignals.length === 0) {
    await db.update(pipelineRuns).set({ status: 'completed', completedAt: new Date() })
      .where(eq(pipelineRuns.id, pipelineRunId));
    logger.info('Pipeline: no signals to process');
    eventBus.emitPipelineCompleted({ pipelineRunId, total: 0, orgId });
    return { pipelineRunId, status: 'completed', total: 0 };
  }

  logger.info(`Pipeline started: ${allSignals.length} signals in batches of ${batchSize}`);
  eventBus.emitPipelineStarted({ pipelineRunId, total: allSignals.length, orgId });

  let totalClassified = 0;
  let totalBiasDetected = 0;
  let totalEmbedded = 0;

  try {
    for (let i = 0; i < allSignals.length; i += batchSize) {
      const batch = allSignals.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(allSignals.length / batchSize);
      logger.info(`Processing batch ${batchNum}/${totalBatches} (${batch.length} signals)`);

      // Pass 1: Classification
      try {
        const classResults = await classifyBatch(batch, allThemes, orgId);
        totalClassified += classResults.length;
      } catch (err) {
        logger.error(`Classification failed for batch ${batchNum}:`, err.message);
      }

      // Pass 2: Bias Detection
      try {
        const { results } = await detectBiasBatch(batch, pipelineRunId, orgId);
        totalBiasDetected += results.length;
      } catch (err) {
        logger.error(`Bias detection failed for batch ${batchNum}:`, err.message);
      }

      // Pass 3: Embeddings (re-fetch signals to get updated fields)
      try {
        const batchIds = batch.map(s => s.id);
        const updatedBatch = await db.select().from(signals)
          .where(inArray(signals.id, batchIds));

        const { embedded } = await embedBatch(updatedBatch, pipelineRunId, orgId);
        totalEmbedded += embedded;
      } catch (err) {
        logger.error(`Embedding failed for batch ${batchNum}:`, err.message);
      }

      // Update progress
      await db.update(pipelineRuns).set({
        classifiedSignals: totalClassified,
        biasDetectedSignals: totalBiasDetected,
        embeddedSignals: totalEmbedded,
      }).where(eq(pipelineRuns.id, pipelineRunId));

      eventBus.emitPipelineProgress({
        pipelineRunId,
        batchNum,
        totalBatches,
        classified: totalClassified,
        biasDetected: totalBiasDetected,
        embedded: totalEmbedded,
        orgId,
      });
    }

    // Post-batch: theme cluster merging
    try {
      await mergeThemeClusters(pipelineRunId, orgId);
    } catch (err) {
      logger.error('Theme merge failed:', err.message);
    }

    // Post-batch: flag low confidence
    try {
      const flaggedCount = await flagLowConfidence(pipelineRunId, orgId);
      if (flaggedCount > 0) {
        eventBus.emitReviewCreated({ pipelineRunId, count: flaggedCount, orgId });
      }
    } catch (err) {
      logger.error('Confidence flagging failed:', err.message);
    }

    // Mark complete
    await db.update(pipelineRuns).set({
      status: 'completed',
      completedAt: new Date(),
      classifiedSignals: totalClassified,
      biasDetectedSignals: totalBiasDetected,
      embeddedSignals: totalEmbedded,
    }).where(eq(pipelineRuns.id, pipelineRunId));

    logger.info(`Pipeline complete: ${totalClassified} classified, ${totalBiasDetected} bias detected, ${totalEmbedded} embedded`);

    eventBus.emitPipelineCompleted({
      pipelineRunId,
      total: allSignals.length,
      classified: totalClassified,
      biasDetected: totalBiasDetected,
      embedded: totalEmbedded,
      orgId,
    });

    return {
      pipelineRunId,
      status: 'completed',
      total: allSignals.length,
      classified: totalClassified,
      biasDetected: totalBiasDetected,
      embedded: totalEmbedded,
    };
  } catch (err) {
    await db.update(pipelineRuns).set({
      status: 'failed',
      error: err.message,
      completedAt: new Date(),
    }).where(eq(pipelineRuns.id, pipelineRunId));
    logger.error('Pipeline failed:', err.message);
    throw err;
  }
}
