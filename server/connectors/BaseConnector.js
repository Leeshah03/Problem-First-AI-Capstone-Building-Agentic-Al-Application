import crypto from 'crypto';
import { db } from '../db/index.js';
import { connectors, syncJobs, signals } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { eventBus } from '../events/eventBus.js';
import { logger } from '../utils/logger.js';

export class BaseConnector {
  constructor({ connectorId, name, type, orgId }) {
    this.connectorId = connectorId;
    this.name = name;
    this.type = type;
    this.orgId = orgId;
  }

  // Subclasses must implement: returns { signals: [...], newCursor: string }
  async fetchSignals(_cursor) {
    throw new Error('fetchSignals() must be implemented by subclass');
  }

  async sync() {
    const syncJobId = crypto.randomUUID();
    const now = new Date();

    const [connector] = await db.select({ syncCursor: connectors.syncCursor })
      .from(connectors)
      .where(and(eq(connectors.id, this.connectorId), eq(connectors.orgId, this.orgId)));
    const cursor = connector?.syncCursor || null;

    await db.insert(syncJobs).values({
      id: syncJobId,
      connectorId: this.connectorId,
      status: 'running',
      startedAt: now,
      orgId: this.orgId,
      createdAt: now,
    });

    eventBus.emitSyncStarted({
      connectorId: this.connectorId,
      connectorName: this.name,
      connectorType: this.type,
      syncJobId,
      orgId: this.orgId,
    });

    try {
      const { signals: fetchedSignals, newCursor } = await this.fetchSignals(cursor);

      let newCount = 0;
      await db.transaction(async (tx) => {
        for (const signal of fetchedSignals) {
          const [existing] = await tx.select({ id: signals.id })
            .from(signals)
            .where(and(eq(signals.externalId, signal.externalId), eq(signals.source, this.type), eq(signals.orgId, this.orgId)));
          if (existing) continue;

          await tx.insert(signals).values({
            id: crypto.randomUUID(),
            externalId: signal.externalId,
            source: this.type,
            connectorId: this.connectorId,
            title: signal.title || null,
            content: signal.content || null,
            account: signal.account || null,
            speaker: signal.speaker || null,
            arr: signal.arr || 0,
            votes: signal.votes || 0,
            category: signal.category || null,
            competitors: signal.competitors || [],
            rawData: signal.rawData || {},
            sourceUrl: signal.sourceUrl || null,
            syncJobId,
            ingestedAt: now,
            orgId: this.orgId,
            createdAt: now,
          });
          newCount++;
        }
      });

      await db.update(connectors).set({
        syncCursor: newCursor,
        lastSyncAt: now,
        updatedAt: now,
      }).where(eq(connectors.id, this.connectorId));

      await db.update(syncJobs).set({
        status: 'completed',
        completedAt: new Date(),
        signalsPulled: fetchedSignals.length,
        signalsNew: newCount,
        cursor: newCursor,
      }).where(eq(syncJobs.id, syncJobId));

      eventBus.emitSyncCompleted({
        connectorId: this.connectorId,
        connectorName: this.name,
        connectorType: this.type,
        syncJobId,
        signalsPulled: fetchedSignals.length,
        signalsNew: newCount,
        orgId: this.orgId,
      });

      if (newCount > 0) {
        eventBus.emitSignalsIngested({
          connectorType: this.type,
          count: newCount,
          syncJobId,
          orgId: this.orgId,
        });
      }

      logger.info(`[${this.name}] Sync complete: ${fetchedSignals.length} pulled, ${newCount} new`);
      return { syncJobId, pulled: fetchedSignals.length, new: newCount };

    } catch (err) {
      await db.update(syncJobs).set({
        status: 'failed',
        error: err.message,
        completedAt: new Date(),
      }).where(eq(syncJobs.id, syncJobId));

      eventBus.emitSyncFailed({
        connectorId: this.connectorId,
        connectorName: this.name,
        connectorType: this.type,
        syncJobId,
        error: err.message,
        orgId: this.orgId,
      });

      logger.error(`[${this.name}] Sync failed: ${err.message}`);
      throw err;
    }
  }
}
