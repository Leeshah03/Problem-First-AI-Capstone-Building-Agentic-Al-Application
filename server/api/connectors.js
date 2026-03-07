import { db } from '../db/index.js';
import { connectors, syncJobs, pipelineRuns } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { triggerConnectorSync } from '../scheduler/index.js';
import { logger } from '../utils/logger.js';

export async function listConnectors(req, res) {
  try {
    const allConnectors = await db.select().from(connectors)
      .where(eq(connectors.orgId, req.orgId))
      .orderBy(connectors.type);

    const result = [];
    for (const c of allConnectors) {
      const recentJobs = await db.select({
        id: syncJobs.id,
        status: syncJobs.status,
        startedAt: syncJobs.startedAt,
        completedAt: syncJobs.completedAt,
        signalsPulled: syncJobs.signalsPulled,
        signalsNew: syncJobs.signalsNew,
        error: syncJobs.error,
      }).from(syncJobs)
        .where(and(eq(syncJobs.connectorId, c.id), eq(syncJobs.orgId, req.orgId)))
        .orderBy(desc(syncJobs.createdAt))
        .limit(5);

      result.push({
        id: c.id,
        name: c.name,
        type: c.type,
        enabled: c.enabled,
        syncFrequency: c.syncFrequency,
        lastSyncAt: c.lastSyncAt,
        syncCursor: c.syncCursor,
        recentJobs,
      });
    }

    res.json(result);
  } catch (err) {
    logger.error('Failed to fetch connectors:', err.message);
    res.status(500).json({ error: 'Failed to fetch connectors' });
  }
}

export async function updateConnector(req, res) {
  try {
    const { enabled, syncFrequency } = req.body;
    const updates = { updatedAt: new Date() };

    if (enabled !== undefined) updates.enabled = enabled;
    if (syncFrequency) updates.syncFrequency = syncFrequency;

    await db.update(connectors).set(updates)
      .where(and(eq(connectors.id, req.params.id), eq(connectors.orgId, req.orgId)));

    res.json({ success: true });
  } catch (err) {
    logger.error('Failed to update connector:', err.message);
    res.status(500).json({ error: 'Failed to update connector' });
  }
}

export async function manualSync(req, res) {
  try {
    res.json({ status: 'started', message: 'Sync triggered' });
    triggerConnectorSync(req.params.id, req.orgId).catch(err => {
      logger.error('Manual sync failed:', err.message);
    });
  } catch (err) {
    logger.error('Failed to trigger sync:', err.message);
    res.status(500).json({ error: 'Failed to trigger sync' });
  }
}

export async function getActivity(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit || '20'), 50);

    const jobs = await db.select({
      id: syncJobs.id,
      status: syncJobs.status,
      startedAt: syncJobs.startedAt,
      completedAt: syncJobs.completedAt,
      signalsPulled: syncJobs.signalsPulled,
      signalsNew: syncJobs.signalsNew,
      error: syncJobs.error,
      createdAt: syncJobs.createdAt,
      connectorName: connectors.name,
      connectorType: connectors.type,
    }).from(syncJobs)
      .innerJoin(connectors, eq(connectors.id, syncJobs.connectorId))
      .where(eq(syncJobs.orgId, req.orgId))
      .orderBy(desc(syncJobs.createdAt))
      .limit(limit);

    const runs = await db.select().from(pipelineRuns)
      .where(eq(pipelineRuns.orgId, req.orgId))
      .orderBy(desc(pipelineRuns.createdAt))
      .limit(limit);

    const activities = [
      ...jobs.map(j => ({
        type: 'sync',
        id: j.id,
        connectorName: j.connectorName,
        connectorType: j.connectorType,
        status: j.status,
        signalsPulled: j.signalsPulled,
        signalsNew: j.signalsNew,
        error: j.error,
        timestamp: j.startedAt || j.createdAt,
      })),
      ...runs.map(r => ({
        type: 'pipeline',
        id: r.id,
        status: r.status,
        totalSignals: r.totalSignals,
        classifiedSignals: r.classifiedSignals,
        timestamp: r.startedAt || r.createdAt,
      })),
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);

    res.json(activities);
  } catch (err) {
    logger.error('Failed to fetch activity:', err.message);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
}
