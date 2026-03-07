import cron from 'node-cron';
import { db } from '../db/index.js';
import { signals, connectors } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { runPipeline } from '../pipeline/orchestrator.js';
import { createConnectorInstance, ensureDefaultConnectors, getEnabledConnectors } from '../connectors/registry.js';
import { logger } from '../utils/logger.js';

const FREQUENCY_TO_CRON = {
  '1h':   '0 * * * *',
  '6h':   '0 */6 * * *',
  '24h':  '0 0 * * *',
  '168h': '0 0 * * 1',
};

const activeJobs = new Map();

function frequencyToCron(freq) {
  return FREQUENCY_TO_CRON[freq] || FREQUENCY_TO_CRON['6h'];
}

async function syncAndProcess(connectorRow) {
  const connector = createConnectorInstance(connectorRow);
  try {
    const result = await connector.sync();

    if (result.new > 0) {
      logger.info(`[Scheduler] ${result.new} new signals from ${connectorRow.name}, triggering pipeline`);

      const pipelineResult = await runPipeline({
        unclassifiedOnly: true,
        orgId: connectorRow.orgId,
        triggeredBy: `connector:${connectorRow.type}`,
      });

      logger.info(`[Scheduler] Pipeline for org ${connectorRow.orgId} completed`, pipelineResult);
    }
  } catch (err) {
    logger.error(`[Scheduler] Sync failed for ${connectorRow.name}: ${err.message}`);
  }
}

export async function startScheduler() {
  const orgs = await db.selectDistinct({ orgId: signals.orgId }).from(signals);
  const orgIds = new Set(orgs.map(o => o.orgId));
  orgIds.add('org_default');

  for (const orgId of orgIds) {
    await ensureDefaultConnectors(orgId);
  }

  for (const orgId of orgIds) {
    const enabledConnectors = await getEnabledConnectors(orgId);
    for (const conn of enabledConnectors) {
      const cronExpr = frequencyToCron(conn.syncFrequency);
      const job = cron.schedule(cronExpr, () => syncAndProcess(conn));
      activeJobs.set(conn.id, job);
      logger.info(`Scheduled ${conn.name} (${conn.type}) for org ${orgId}: ${cronExpr}`);
    }
  }

  logger.info(`Scheduler started: ${activeJobs.size} connector jobs registered`);
}

export async function triggerConnectorSync(connectorId, orgId) {
  const [connectorRow] = await db.select().from(connectors)
    .where(and(eq(connectors.id, connectorId), eq(connectors.orgId, orgId)));

  if (!connectorRow) throw new Error('Connector not found');
  return syncAndProcess(connectorRow);
}

export function stopScheduler() {
  for (const [, job] of activeJobs) {
    job.stop();
  }
  activeJobs.clear();
}
