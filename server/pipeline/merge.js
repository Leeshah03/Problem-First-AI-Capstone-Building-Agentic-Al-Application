import crypto from 'crypto';
import { config } from '../config.js';
import { db } from '../db/index.js';
import { themes, themeSignals, reviewQueue } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { getEmbeddings } from '../db/vectorStore.js';
import { logger } from '../utils/logger.js';

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function averageEmbeddings(embeddings) {
  if (embeddings.length === 0) return null;
  const dim = embeddings[0].length;
  const avg = new Array(dim).fill(0);
  for (const emb of embeddings) {
    for (let i = 0; i < dim; i++) avg[i] += emb[i];
  }
  for (let i = 0; i < dim; i++) avg[i] /= embeddings.length;
  return avg;
}

export async function mergeThemeClusters(pipelineRunId, orgId) {
  const threshold = config.pipeline.similarityThreshold;
  const now = new Date();

  // Get all themes with their signal IDs
  const allThemes = await db.select({ id: themes.id, name: themes.name })
    .from(themes).where(eq(themes.orgId, orgId));
  const allThemeSignals = await db.select({
    themeId: themeSignals.themeId,
    signalId: themeSignals.signalId,
  }).from(themeSignals).where(eq(themeSignals.orgId, orgId));

  const signalsByTheme = {};
  for (const ts of allThemeSignals) {
    if (!signalsByTheme[ts.themeId]) signalsByTheme[ts.themeId] = [];
    signalsByTheme[ts.themeId].push(ts.signalId);
  }

  // Get embeddings from pgvector for each theme's signals
  const themeCentroids = [];

  for (const theme of allThemes) {
    const signalIds = signalsByTheme[theme.id] || [];
    if (signalIds.length === 0) continue;

    try {
      const embeddings = await getEmbeddings(signalIds);
      if (embeddings.length > 0) {
        const centroid = averageEmbeddings(embeddings.map(e => e.embedding));
        if (centroid) {
          themeCentroids.push({ themeId: theme.id, themeName: theme.name, centroid, signalCount: signalIds.length });
        }
      }
    } catch {
      // Some signals may not be embedded yet
      continue;
    }
  }

  // Pairwise comparison
  const mergeCandidates = [];

  for (let i = 0; i < themeCentroids.length; i++) {
    for (let j = i + 1; j < themeCentroids.length; j++) {
      const sim = cosineSimilarity(themeCentroids[i].centroid, themeCentroids[j].centroid);
      if (sim > threshold) {
        mergeCandidates.push({
          themeA: themeCentroids[i],
          themeB: themeCentroids[j],
          similarity: sim,
        });

        // Use the smaller theme's first signal as the review entry anchor
        const anchorSignals = signalsByTheme[themeCentroids[j].themeId] || [];
        if (anchorSignals.length > 0) {
          await db.insert(reviewQueue).values({
            id: crypto.randomUUID(),
            signalId: anchorSignals[0],
            pipelineRunId,
            reviewType: 'new_theme',
            status: 'pending',
            aiSuggestedThemes: [
              { themeId: themeCentroids[i].themeId, themeName: themeCentroids[i].themeName },
              { themeId: themeCentroids[j].themeId, themeName: themeCentroids[j].themeName },
            ],
            aiConfidence: sim,
            orgId,
            createdAt: now,
          });
        }
      }
    }
  }

  logger.info(`Theme merge analysis: ${mergeCandidates.length} candidates found above ${threshold} threshold`);
  return mergeCandidates;
}
