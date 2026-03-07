import crypto from 'crypto';
import { db } from '../db/index.js';
import { signals, reviewQueue } from '../db/schema.js';
import { eq, and, isNotNull } from 'drizzle-orm';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

function metadataScore(signal) {
  let score = 0;
  if (signal.content || signal.title) score += 0.3;
  if (signal.account) score += 0.2;
  if (signal.arr > 0 || signal.votes > 0) score += 0.2;
  if (signal.speaker) score += 0.15;
  if (signal.externalId) score += 0.15;
  return score;
}

export function calculateCompositeConfidence(classificationConfidence, biasConfidence, signal) {
  const classPart = (classificationConfidence || 0) * 0.5;
  const biasPart = (biasConfidence || 0) * 0.3;
  const metaPart = metadataScore(signal) * 0.2;
  return Math.round((classPart + biasPart + metaPart) * 100) / 100;
}

export async function flagLowConfidence(pipelineRunId, orgId) {
  const threshold = config.pipeline.lowConfidenceThreshold;
  const now = new Date();

  // Get all classified signals that aren't already flagged
  const allSignals = await db.select().from(signals)
    .where(and(isNotNull(signals.classifiedAt), eq(signals.needsReview, false), eq(signals.orgId, orgId)));

  let flagged = 0;

  await db.transaction(async (tx) => {
    for (const signal of allSignals) {
      const composite = calculateCompositeConfidence(
        signal.aiConfidence,
        signal.biasConfidence,
        signal
      );

      // Update the composite confidence on the signal
      if (composite !== signal.aiConfidence) {
        await tx.update(signals).set({ aiConfidence: composite })
          .where(eq(signals.id, signal.id));
      }

      if (composite < threshold) {
        // Check if review already exists
        const [existingReview] = await tx.select({ id: reviewQueue.id })
          .from(reviewQueue)
          .where(and(eq(reviewQueue.signalId, signal.id), eq(reviewQueue.reviewType, 'low_confidence'), eq(reviewQueue.status, 'pending')));

        if (!existingReview) {
          await tx.update(signals).set({ aiConfidence: composite, needsReview: true })
            .where(eq(signals.id, signal.id));
          await tx.insert(reviewQueue).values({
            id: crypto.randomUUID(),
            signalId: signal.id,
            pipelineRunId,
            reviewType: 'low_confidence',
            status: 'pending',
            aiConfidence: composite,
            orgId,
            createdAt: now,
          });
          flagged++;
        }
      }
    }
  });

  logger.info(`Confidence flagging complete: ${flagged} signals below threshold ${threshold}`);
  return flagged;
}
