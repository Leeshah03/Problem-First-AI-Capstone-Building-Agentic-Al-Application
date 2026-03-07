import { BaseConnector } from './BaseConnector.js';

const ACCOUNTS = [
  { name: 'Quantum Studios', arr: 72000 },
  { name: 'PixelForge Media', arr: 36000 },
  { name: 'EchoVerse Productions', arr: 54000 },
  { name: 'Luminary Content', arr: 42000 },
  { name: 'Apex Digital', arr: 90000 },
  { name: 'CloudNine Media', arr: 66000 },
  { name: 'Silverline Studios', arr: 48000 },
  { name: 'MediaStack Inc.', arr: 120000 },
  { name: 'Catalyst Media Group', arr: 60000 },
  { name: 'NarrativeAI', arr: 84000 },
  { name: 'VidCraft Solutions', arr: 30000 },
  { name: 'StoryLab Creative', arr: 18000 },
];

const STAGES = ['Discovery', 'Evaluation', 'Negotiation', 'Closed Won', 'Closed Lost'];

const DEAL_NOTES = [
  'Customer evaluating {competitor} in parallel. Key differentiator needed on recording reliability.',
  'Expansion deal blocked by lack of RBAC. Cannot onboard new team members without role controls.',
  'Prospect needs SSO/SAML integration before procurement can approve. Timeline: 30 days.',
  'Renewal at risk — customer citing export performance issues. Multiple support tickets open.',
  'Champion left the account. New stakeholder evaluating {competitor} as alternative.',
  'Enterprise deal requires SOC 2 Type II compliance documentation.',
  'Customer requesting custom API integration for automated publishing workflow.',
  'Upsell opportunity: team growing from 5 to 25 seats. Need team management features.',
  'Competitive displacement attempt by {competitor}. Customer wants timeline improvements.',
  'POC successful but customer flagging transcription accuracy for medical terminology.',
];

const LOST_REASONS = [
  'Chose {competitor} — better collaboration features for large teams.',
  'Budget cut — consolidating tools. Moved back to {competitor}.',
  'Recording reliability concerns after failed demo session.',
  'Missing enterprise features: SSO, audit logs, data residency.',
  'Export times too slow for their daily production schedule.',
  'Template library insufficient for their brand requirements.',
];

const FEATURE_REQUESTS = [
  'API access for automated workflows',
  'SSO/SAML authentication',
  'Custom roles and permissions',
  'Advanced audio mixing controls',
  'White-label export options',
  'Bulk project management',
  'Priority support SLA',
  'On-premise deployment option',
  'Advanced analytics dashboard',
  'Multi-language support for AI features',
];

const COMPETITORS = ['Riverside', 'Adobe Premiere', 'CapCut', 'Canva', 'Frame.io', 'DaVinci Resolve'];

const REPS = [
  'Sarah Chen', 'Marcus Johnson', 'Priya Patel', 'David Kim',
  'Emily Rodriguez', 'James Taylor', 'Lisa Nakamura', 'Kevin Anderson',
];

export class SalesforceConnector extends BaseConnector {
  constructor({ connectorId, orgId }) {
    super({ connectorId, name: 'Salesforce', type: 'salesforce', orgId });
  }

  async fetchSignals(cursor) {
    const lastId = parseInt(cursor || '0');
    const count = 2 + Math.floor(Math.random() * 4); // 2-5 signals
    const signals = [];

    for (let i = 0; i < count; i++) {
      const seqId = lastId + i + 1;
      const account = ACCOUNTS[Math.floor(Math.random() * ACCOUNTS.length)];
      const rep = REPS[Math.floor(Math.random() * REPS.length)];
      const competitor = COMPETITORS[Math.floor(Math.random() * COMPETITORS.length)];
      const signalType = Math.random();

      if (signalType < 0.45) {
        // Deal note / opportunity update
        const stage = STAGES[Math.floor(Math.random() * STAGES.length)];
        const note = DEAL_NOTES[Math.floor(Math.random() * DEAL_NOTES.length)]
          .replace('{competitor}', competitor);
        const dealValue = account.arr * (1 + Math.floor(Math.random() * 3));

        signals.push({
          externalId: `SF-${String(seqId).padStart(4, '0')}`,
          title: `${account.name} — ${stage}`,
          content: note,
          account: account.name,
          speaker: rep,
          arr: dealValue,
          competitors: Math.random() < 0.5 ? [competitor] : [],
          category: 'Opportunity',
          rawData: { stage, dealValue, closeDate: new Date(Date.now() + Math.random() * 90 * 86400000).toISOString() },
        });
      } else if (signalType < 0.7) {
        // Lost deal
        const reason = LOST_REASONS[Math.floor(Math.random() * LOST_REASONS.length)]
          .replace('{competitor}', competitor);

        signals.push({
          externalId: `SF-${String(seqId).padStart(4, '0')}`,
          title: `Lost: ${account.name}`,
          content: reason,
          account: account.name,
          speaker: rep,
          arr: account.arr,
          competitors: [competitor],
          category: 'Closed Lost',
          rawData: { stage: 'Closed Lost', lostDate: new Date().toISOString() },
        });
      } else {
        // Feature request from opportunity
        const feature = FEATURE_REQUESTS[Math.floor(Math.random() * FEATURE_REQUESTS.length)];

        signals.push({
          externalId: `SF-${String(seqId).padStart(4, '0')}`,
          title: `Feature request: ${feature}`,
          content: `${account.name} (${rep}): Deal blocked pending "${feature}". ARR at stake: $${account.arr.toLocaleString()}.`,
          account: account.name,
          speaker: rep,
          arr: account.arr,
          category: 'Feature Request',
          rawData: { feature, priority: Math.random() < 0.3 ? 'critical' : 'high' },
        });
      }
    }

    return { signals, newCursor: String(lastId + count) };
  }
}
