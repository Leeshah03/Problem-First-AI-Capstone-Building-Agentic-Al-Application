import crypto from 'crypto';
import { db } from '../db/index.js';
import { connectors } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { GongConnector } from './GongConnector.js';
import { CannyConnector } from './CannyConnector.js';
import { PendoConnector } from './PendoConnector.js';
import { SalesforceConnector } from './SalesforceConnector.js';
import { JiraConnector } from './JiraConnector.js';
import { logger } from '../utils/logger.js';

const CONNECTOR_TYPES = {
  gong:       { class: GongConnector,       name: 'Gong',       defaultFrequency: '1h'  },
  canny:      { class: CannyConnector,      name: 'Canny',      defaultFrequency: '24h' },
  pendo:      { class: PendoConnector,      name: 'Pendo',      defaultFrequency: '6h'  },
  salesforce: { class: SalesforceConnector, name: 'Salesforce',  defaultFrequency: '6h'  },
  jira:       { class: JiraConnector,       name: 'Jira',        defaultFrequency: '1h'  },
};

export function createConnectorInstance(connectorRow) {
  const config = CONNECTOR_TYPES[connectorRow.type];
  if (!config) throw new Error(`Unknown connector type: ${connectorRow.type}`);
  return new config.class({
    connectorId: connectorRow.id,
    orgId: connectorRow.orgId,
  });
}

export async function ensureDefaultConnectors(orgId) {
  const now = new Date();

  for (const [type, config] of Object.entries(CONNECTOR_TYPES)) {
    const [existing] = await db.select({ id: connectors.id })
      .from(connectors)
      .where(and(eq(connectors.type, type), eq(connectors.orgId, orgId)));

    if (!existing) {
      await db.insert(connectors).values({
        id: crypto.randomUUID(),
        name: config.name,
        type,
        enabled: true,
        syncFrequency: config.defaultFrequency,
        orgId,
        createdAt: now,
        updatedAt: now,
      });
      logger.info(`Created default ${type} connector for org ${orgId}`);
    }
  }
}

export async function getEnabledConnectors(orgId) {
  return db.select().from(connectors)
    .where(and(eq(connectors.enabled, true), eq(connectors.orgId, orgId)));
}

export { CONNECTOR_TYPES };
