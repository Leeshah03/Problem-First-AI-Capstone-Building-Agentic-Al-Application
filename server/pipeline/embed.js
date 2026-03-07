import OpenAI from 'openai';
import crypto from 'crypto';
import { config } from '../config.js';
import { db } from '../db/index.js';
import { signals, embeddingTracking, reviewQueue } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { upsertEmbeddings, findSimilar } from '../db/vectorStore.js';
import { contentHash } from '../utils/hash.js';
import { logger } from '../utils/logger.js';

let openaiClient = null;

function getOpenAI() {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: config.openaiApiKey });
  }
  return openaiClient;
}

function buildEmbeddingText(signal) {
  return [signal.title, signal.content, signal.account, signal.category]
    .filter(Boolean)
    .join(' ');
}

export async function embedBatch(signalRows, pipelineRunId, orgId) {
  const now = new Date();

  // Filter to signals that need (re)embedding
  const signalsToEmbed = [];

  for (const signal of signalRows) {
    const text = buildEmbeddingText(signal);
    if (!text.trim()) continue;

    const hash = contentHash(text);
    const [existing] = await db.select({ signalId: embeddingTracking.signalId, contentHash: embeddingTracking.contentHash })
      .from(embeddingTracking).where(eq(embeddingTracking.signalId, signal.id));

    if (!existing || existing.contentHash !== hash) {
      signalsToEmbed.push({ ...signal, embeddingText: text, hash });
    }
  }

  if (signalsToEmbed.length === 0) {
    logger.info('No signals need embedding (all up to date)');
    return { embedded: 0, duplicates: [] };
  }

  logger.info(`Embedding ${signalsToEmbed.length} signals (${signalRows.length - signalsToEmbed.length} skipped)`);

  // Sub-batch OpenAI calls (max 100 per request)
  const allEmbeddings = [];
  const openai = getOpenAI();

  for (let i = 0; i < signalsToEmbed.length; i += 100) {
    const subBatch = signalsToEmbed.slice(i, i + 100);
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: subBatch.map(s => s.embeddingText),
    });
    for (let j = 0; j < response.data.length; j++) {
      allEmbeddings.push({
        signal: subBatch[j],
        embedding: response.data[j].embedding,
      });
    }
  }

  // Upsert into pgvector
  const entries = allEmbeddings.map(e => ({
    signalId: e.signal.id,
    embedding: e.embedding,
    source: e.signal.source,
    account: e.signal.account || '',
    orgId,
  }));
  await upsertEmbeddings(entries);

  // Track in embedding_tracking table
  await db.transaction(async (tx) => {
    for (const e of allEmbeddings) {
      const [existing] = await tx.select({ id: embeddingTracking.id })
        .from(embeddingTracking).where(eq(embeddingTracking.signalId, e.signal.id));

      if (existing) {
        await tx.update(embeddingTracking).set({
          contentHash: e.signal.hash,
          embeddedAt: now,
        }).where(eq(embeddingTracking.signalId, e.signal.id));
      } else {
        await tx.insert(embeddingTracking).values({
          id: crypto.randomUUID(),
          signalId: e.signal.id,
          embeddingModel: 'text-embedding-3-small',
          chromadbId: e.signal.id,
          contentHash: e.signal.hash,
          orgId,
          embeddedAt: now,
          createdAt: now,
        });
      }
    }
  });

  // Find near-duplicates using pgvector
  const duplicates = [];
  for (const e of allEmbeddings) {
    const similar = await findSimilar(e.embedding, 5, orgId);
    for (const match of similar) {
      if (match.signalId !== e.signal.id && match.similarity > 0.95) {
        duplicates.push({ signalId: e.signal.id, duplicateOf: match.signalId, similarity: match.similarity });
        await db.update(signals).set({ duplicateOf: match.signalId })
          .where(eq(signals.id, e.signal.id));
        await db.insert(reviewQueue).values({
          id: crypto.randomUUID(),
          signalId: e.signal.id,
          pipelineRunId,
          reviewType: 'duplicate_candidate',
          status: 'pending',
          aiConfidence: match.similarity,
          orgId,
          createdAt: now,
        });
        break; // Only flag the top duplicate
      }
    }
  }

  logger.info(`Embedding complete: ${allEmbeddings.length} embedded, ${duplicates.length} duplicates found`);
  return { embedded: allEmbeddings.length, duplicates };
}

export async function findSimilarSignals(signalId, limit = 10, orgId) {
  const { getEmbeddings } = await import('../db/vectorStore.js');
  const embeddings = await getEmbeddings([signalId]);
  if (embeddings.length === 0) return [];

  const results = await findSimilar(embeddings[0].embedding, limit + 1, orgId);
  return results.filter(r => r.signalId !== signalId).slice(0, limit);
}
