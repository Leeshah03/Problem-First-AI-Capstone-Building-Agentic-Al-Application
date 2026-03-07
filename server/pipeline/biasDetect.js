import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';
import { config } from '../config.js';
import { db } from '../db/index.js';
import { signals, reviewQueue } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { buildBiasDetectionPrompt } from './prompts.js';
import { validateBiasBatch } from './validators.js';
import { logger } from '../utils/logger.js';

let anthropicClient = null;

function getClient() {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: config.anthropicApiKey });
  }
  return anthropicClient;
}

export async function detectBiasBatch(signalRows, pipelineRunId, orgId) {
  const client = getClient();
  const prompt = buildBiasDetectionPrompt(signalRows);

  logger.info(`Detecting bias for batch of ${signalRows.length} signals`);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text;
  const results = validateBiasBatch(text);

  const now = new Date();
  let conflictCount = 0;

  await db.transaction(async (tx) => {
    for (const result of results) {
      const [existing] = await tx.select({ id: signals.id, biasTag: signals.biasTag })
        .from(signals).where(eq(signals.id, result.signalId));

      if (existing && existing.biasTag && existing.biasTag !== result.biasTag) {
        // Conflict: AI suggests different bias than existing manual tag
        await tx.insert(reviewQueue).values({
          id: crypto.randomUUID(),
          signalId: result.signalId,
          pipelineRunId,
          reviewType: 'bias_conflict',
          status: 'pending',
          aiSuggestedBias: result.biasTag,
          aiConfidence: result.confidence,
          orgId,
          createdAt: now,
        });
        // Still update confidence and reasoning, but don't overwrite the tag
        await tx.update(signals).set({
          biasConfidence: result.confidence,
          biasReasoning: result.reasoning,
        }).where(eq(signals.id, result.signalId));
        conflictCount++;
      } else {
        // No conflict: apply the AI-detected bias
        await tx.update(signals).set({
          biasTag: sql`CASE WHEN ${signals.biasTag} IS NULL OR ${signals.biasTag} = '' THEN ${result.biasTag} ELSE ${signals.biasTag} END`,
          biasConfidence: result.confidence,
          biasReasoning: result.reasoning,
        }).where(eq(signals.id, result.signalId));
      }
    }
  });

  logger.info(`Bias detection complete: ${results.length} signals, ${conflictCount} conflicts`);
  return { results, conflictCount };
}
