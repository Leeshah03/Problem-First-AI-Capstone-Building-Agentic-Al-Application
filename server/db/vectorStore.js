import { pool } from './index.js';
import { logger } from '../utils/logger.js';

export async function ensureVectorTable() {
  const client = await pool.connect();
  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS vector');
    await client.query(`
      CREATE TABLE IF NOT EXISTS signal_embeddings (
        signal_id TEXT PRIMARY KEY REFERENCES signals(id),
        embedding vector(1536) NOT NULL,
        metadata JSONB DEFAULT '{}',
        content TEXT,
        org_id TEXT NOT NULL DEFAULT 'org_default',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_signal_embeddings_org ON signal_embeddings(org_id)');
    logger.info('Vector table ensured');
  } finally {
    client.release();
  }
}

export async function upsertEmbeddings(entries) {
  if (entries.length === 0) return;
  const client = await pool.connect();
  try {
    for (const entry of entries) {
      const vectorStr = `[${entry.embedding.join(',')}]`;
      await client.query(
        `INSERT INTO signal_embeddings (signal_id, embedding, metadata, content, org_id, updated_at)
         VALUES ($1, $2::vector, $3, $4, $5, NOW())
         ON CONFLICT (signal_id) DO UPDATE SET
           embedding = EXCLUDED.embedding,
           metadata = EXCLUDED.metadata,
           content = EXCLUDED.content,
           updated_at = NOW()`,
        [entry.signalId, vectorStr, JSON.stringify(entry.metadata), entry.content, entry.orgId]
      );
    }
  } finally {
    client.release();
  }
}

export async function findSimilar(embedding, limit = 5, orgId = null) {
  const vectorStr = `[${embedding.join(',')}]`;
  let query = `
    SELECT signal_id, 1 - (embedding <=> $1::vector) as similarity, metadata, content
    FROM signal_embeddings
  `;
  const params = [vectorStr];

  if (orgId) {
    query += ' WHERE org_id = $2';
    params.push(orgId);
    query += ` ORDER BY embedding <=> $1::vector LIMIT $3`;
    params.push(limit);
  } else {
    query += ` ORDER BY embedding <=> $1::vector LIMIT $2`;
    params.push(limit);
  }

  const result = await pool.query(query, params);
  return result.rows;
}

export async function getEmbeddings(signalIds) {
  if (signalIds.length === 0) return [];
  const placeholders = signalIds.map((_, i) => `$${i + 1}`).join(',');
  const result = await pool.query(
    `SELECT signal_id, embedding::text, metadata, content FROM signal_embeddings WHERE signal_id IN (${placeholders})`,
    signalIds
  );
  return result.rows.map(row => ({
    ...row,
    embedding: JSON.parse(row.embedding),
  }));
}
