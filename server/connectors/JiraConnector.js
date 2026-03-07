import { BaseConnector } from './BaseConnector.js';

const ISSUE_TYPES = ['Bug', 'Feature Request', 'Improvement', 'Customer Escalation'];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const COMPONENTS = [
  'Transcription Engine', 'Timeline Editor', 'Recording Studio', 'AI Pipeline',
  'Export/Render', 'Collaboration', 'Templates', 'Media Library',
  'Script Editor', 'Captions', 'API', 'Auth/Permissions',
];

const BUG_TITLES = [
  'Timeline freezes when adding 15+ audio tracks',
  'Recording drops without warning on unstable connections',
  'Undo/redo stack corrupted after split operation on grouped clips',
  'Export fails silently for videos longer than 2 hours',
  'Custom vocabulary resets when switching between projects',
  'Filler word removal deletes valid words in fast speech',
  'Studio Sound makes voices sound robotic at high settings',
  'Collaboration cursor position desyncs after 10 minutes',
  'Template fonts not rendering on Windows after save/reload',
  'AI clip detection timeout on projects with 50+ clips',
  'Caption positioning lost when changing aspect ratio',
  'Green screen artifacts on dark-colored clothing',
];

const FEATURE_TITLES = [
  'Add RBAC with configurable role permissions',
  'Support real-time co-editing with conflict resolution',
  'Multi-track audio mixing with per-track EQ',
  'API endpoints for programmatic project management',
  'Batch export with queue management',
  'Advanced search across all project transcripts',
  'Keyboard shortcut customization panel',
  'Version history with visual diff',
  'Automated accessibility compliance checker',
  'Frame-accurate commenting for review workflows',
  'Snap-to-beat alignment for music editing',
  'AI-powered auto-chaptering for long-form content',
];

const ESCALATION_DESCRIPTIONS = [
  'Enterprise customer {account} threatening churn due to recording reliability. 3 failed recordings this week.',
  '{account} reporting data loss — project edits not saving intermittently. Affecting 12 team members.',
  'Production team at {account} blocked: export queue stuck for 4+ hours. Deadline tomorrow.',
  '{account} escalation: SSO requirement for security compliance. Blocking $120K renewal.',
  '{account} VP emailed CEO directly about timeline performance. Projects >1hr unusable.',
  '{account} flagged GDPR concern — no option for EU data residency.',
];

const ACCOUNTS = [
  'MediaStack Inc.', 'Quantum Studios', 'Apex Digital', 'CloudNine Media',
  'EchoVerse Productions', 'Catalyst Media Group', 'Silverline Studios',
  'Luminary Content', 'PixelForge Media', 'NarrativeAI',
];

const REPORTERS = [
  'alex.kim', 'jordan.lee', 'sam.patel', 'chris.wong',
  'taylor.chen', 'morgan.davis', 'casey.johnson', 'riley.park',
];

export class JiraConnector extends BaseConnector {
  constructor({ connectorId, orgId }) {
    super({ connectorId, name: 'Jira', type: 'jira', orgId });
  }

  async fetchSignals(cursor) {
    const lastId = parseInt(cursor || '0');
    const count = 2 + Math.floor(Math.random() * 5); // 2-6 signals
    const signals = [];

    for (let i = 0; i < count; i++) {
      const seqId = lastId + i + 1;
      const issueType = ISSUE_TYPES[Math.floor(Math.random() * ISSUE_TYPES.length)];
      const priority = PRIORITIES[Math.floor(Math.random() * PRIORITIES.length)];
      const component = COMPONENTS[Math.floor(Math.random() * COMPONENTS.length)];
      const reporter = REPORTERS[Math.floor(Math.random() * REPORTERS.length)];
      const account = ACCOUNTS[Math.floor(Math.random() * ACCOUNTS.length)];

      let title, content;

      if (issueType === 'Bug') {
        title = BUG_TITLES[Math.floor(Math.random() * BUG_TITLES.length)];
        content = `[${priority}] ${title}. Reported by ${reporter}. Component: ${component}. Affecting ${Math.floor(Math.random() * 50 + 5)} users.`;
      } else if (issueType === 'Customer Escalation') {
        const template = ESCALATION_DESCRIPTIONS[Math.floor(Math.random() * ESCALATION_DESCRIPTIONS.length)];
        content = template.replace(/\{account\}/g, account);
        title = `ESCALATION: ${account} — ${component}`;
      } else {
        title = FEATURE_TITLES[Math.floor(Math.random() * FEATURE_TITLES.length)];
        content = `${issueType}: ${title}. Priority: ${priority}. Component: ${component}. ${Math.floor(Math.random() * 20 + 1)} customer votes.`;
      }

      signals.push({
        externalId: `DSCRPT-${1000 + seqId}`,
        title,
        content,
        account: issueType === 'Customer Escalation' ? account : null,
        category: component,
        rawData: {
          issueType,
          priority,
          component,
          reporter,
          status: ['Open', 'In Progress', 'In Review', 'Backlog'][Math.floor(Math.random() * 4)],
          created: new Date().toISOString(),
        },
      });
    }

    return { signals, newCursor: String(lastId + count) };
  }
}
