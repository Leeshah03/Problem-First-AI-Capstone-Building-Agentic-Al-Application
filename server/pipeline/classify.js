import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';
import { config } from '../config.js';
import { db } from '../db/index.js';
import { signals, themeSignals } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { buildClassificationPrompt } from './prompts.js';
import { validateClassificationBatch } from './validators.js';
import { logger } from '../utils/logger.js';

let anthropicClient = null;

function getClient() {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: config.anthropicApiKey });
  }
  return anthropicClient;
}

export async function classifyBatch(signalRows, existingThemes, orgId) {
  const client = getClient();
  const prompt = buildClassificationPrompt(signalRows, existingThemes);

  logger.info(`Classifying batch of ${signalRows.length} signals`);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text;
  const results = validateClassificationBatch(text);

  const now = new Date();

  // Check for existing AI-assigned theme_signals to avoid duplicates
  const existingAssignments = await db.select({
    signalId: themeSignals.signalId,
    themeId: themeSignals.themeId,
  }).from(themeSignals).where(eq(themeSignals.assignedBy, 'ai-classify'));
  const assignmentSet = new Set(existingAssignments.map(a => `${a.signalId}:${a.themeId}`));

  await db.transaction(async (tx) => {
    for (const result of results) {
      await tx.update(signals).set({
        aiSummary: result.summary,
        aiConfidence: result.confidence,
        classificationReasoning: result.reasoning || null,
        classifiedAt: now,
      }).where(eq(signals.id, result.signalId));

      for (const assignment of result.themeAssignments) {
        const key = `${result.signalId}:${assignment.themeId}`;
        if (!assignmentSet.has(key)) {
          await tx.insert(themeSignals).values({
            id: crypto.randomUUID(),
            themeId: assignment.themeId,
            signalId: result.signalId,
            relevance: assignment.relevance,
            assignedBy: 'ai-classify',
            orgId,
            createdAt: now,
          });
          assignmentSet.add(key);
        }
      }
    }
  });

  logger.info(`Classification complete: ${results.length} signals processed`);
  return results;
}
