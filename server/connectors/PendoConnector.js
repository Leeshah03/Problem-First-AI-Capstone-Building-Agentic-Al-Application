import { BaseConnector } from './BaseConnector.js';

const FEATURES = [
  'Transcript Editor', 'Timeline', 'AI Clip Finder', 'Studio Sound',
  'Filler Word Removal', 'Templates', 'Recording Studio', 'Script Editor',
  'Captions', 'Green Screen', 'Stock Media Library', 'Publish Flow',
  'Team Workspace', 'Brand Kit', 'AI Voices',
];

const NPS_COMMENTS = [
  "Love the transcript editing but wish the timeline was snappier with lots of tracks.",
  "Best tool for podcast production. Period. Just needs better collaboration.",
  "Switched from Premiere and haven't looked back. AI features are game-changing.",
  "The recording feature is unreliable for remote guests. Had to re-record twice this month.",
  "Template library is thin compared to Canva. Need more professional options.",
  "Filler word removal alone saves us 2 hours per episode. Worth every penny.",
  "Export times are getting worse with each update. 45 min for a 30 min video is unacceptable.",
  "AI clip detection is hit or miss. Finds funny moments but misses insightful ones.",
  "Custom vocabulary never sticks across projects. Retraining every time is frustrating.",
  "The script-based editing paradigm is brilliant but the learning curve is steep for my team.",
  "We need RBAC badly. Interns have the same access as producers right now.",
  "Noise reduction sounds robotic on voices. Need more fine-grained control.",
];

const GUIDE_NAMES = [
  'New User Onboarding', 'Advanced Timeline Tips', 'AI Features Tour',
  'Collaboration Walkthrough', 'Export Settings Guide', 'Recording Best Practices',
  'Template Customization', 'Keyboard Shortcuts', 'Brand Kit Setup',
];

const ACCOUNTS = [
  'Quantum Studios', 'PixelForge Media', 'EchoVerse Productions',
  'Luminary Content', 'Apex Digital', 'CloudNine Media',
  'Silverline Studios', 'MediaStack Inc.', 'Catalyst Media Group',
  'Prism Podcasts', 'RedShift Creative', 'Horizon Films',
];

export class PendoConnector extends BaseConnector {
  constructor({ connectorId, orgId }) {
    super({ connectorId, name: 'Pendo', type: 'pendo', orgId });
  }

  async fetchSignals(cursor) {
    const lastId = parseInt(cursor || '0');
    const count = 2 + Math.floor(Math.random() * 5); // 2-6 signals
    const signals = [];

    for (let i = 0; i < count; i++) {
      const seqId = lastId + i + 1;
      const signalType = Math.random();
      const account = ACCOUNTS[Math.floor(Math.random() * ACCOUNTS.length)];

      if (signalType < 0.4) {
        // NPS feedback
        const score = Math.floor(Math.random() * 11); // 0-10
        const comment = NPS_COMMENTS[Math.floor(Math.random() * NPS_COMMENTS.length)];
        signals.push({
          externalId: `PND-${String(seqId).padStart(4, '0')}`,
          title: `NPS ${score}/10 — ${score >= 9 ? 'Promoter' : score >= 7 ? 'Passive' : 'Detractor'}`,
          content: comment,
          account,
          category: 'NPS Feedback',
          rawData: { npsScore: score, surveyDate: new Date().toISOString() },
        });
      } else if (signalType < 0.7) {
        // Feature usage drop-off
        const feature = FEATURES[Math.floor(Math.random() * FEATURES.length)];
        const dropPct = 15 + Math.floor(Math.random() * 40);
        signals.push({
          externalId: `PND-${String(seqId).padStart(4, '0')}`,
          title: `${feature}: ${dropPct}% usage decline this month`,
          content: `Feature "${feature}" saw a ${dropPct}% drop in weekly active users compared to last month. ${Math.floor(Math.random() * 50 + 10)} accounts affected.`,
          account,
          category: 'Usage Analytics',
          rawData: { feature, dropPercent: dropPct, period: 'month' },
        });
      } else {
        // Guide interaction / low completion
        const guide = GUIDE_NAMES[Math.floor(Math.random() * GUIDE_NAMES.length)];
        const completionRate = 20 + Math.floor(Math.random() * 50);
        signals.push({
          externalId: `PND-${String(seqId).padStart(4, '0')}`,
          title: `Guide "${guide}": ${completionRate}% completion rate`,
          content: `The "${guide}" guide has a ${completionRate}% completion rate. Users are dropping off at step ${Math.floor(Math.random() * 4 + 2)} of ${Math.floor(Math.random() * 3 + 5)}.`,
          account,
          category: 'Product Guides',
          rawData: { guide, completionRate, totalViews: Math.floor(Math.random() * 500 + 50) },
        });
      }
    }

    return { signals, newCursor: String(lastId + count) };
  }
}
