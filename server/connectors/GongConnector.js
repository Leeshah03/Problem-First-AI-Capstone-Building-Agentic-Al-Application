import { BaseConnector } from './BaseConnector.js';

const ACCOUNTS = [
  { name: 'Quantum Studios', arr: 72000 },
  { name: 'PixelForge Media', arr: 36000 },
  { name: 'EchoVerse Productions', arr: 54000 },
  { name: 'Luminary Content', arr: 42000 },
  { name: 'Apex Digital', arr: 90000 },
  { name: 'Waveform Audio', arr: 28000 },
  { name: 'CloudNine Media', arr: 66000 },
  { name: 'Silverline Studios', arr: 48000 },
  { name: 'RedShift Creative', arr: 30000 },
  { name: 'Clearview Productions', arr: 84000 },
  { name: 'MediaStack Inc.', arr: 120000 },
  { name: 'Horizon Films', arr: 18000 },
  { name: 'TrueNorth Audio', arr: 36000 },
  { name: 'Catalyst Media Group', arr: 60000 },
  { name: 'Prism Podcasts', arr: 24000 },
];

const ROLES = [
  'Head of Production', 'VP Content', 'Creative Director',
  'Audio Engineer', 'Product Manager', 'Editor-in-Chief',
  'Senior Editor', 'Producer', 'Operations Manager',
  'Content Strategist', 'Post-Production Lead',
];

const FIRST_NAMES = [
  'James', 'Maria', 'David', 'Sarah', 'Michael', 'Lisa',
  'Robert', 'Jennifer', 'Daniel', 'Amanda', 'Kevin', 'Rachel',
  'Thomas', 'Emily', 'Marcus', 'Yuki', 'Priya', 'Chen',
];

const LAST_NAMES = [
  'Chen', 'Johnson', 'Williams', 'Park', 'Rodriguez', 'Kim',
  'Anderson', 'Taylor', 'Martinez', 'Nakamura', 'Patel', 'Wilson',
  'Thompson', 'Garcia', 'Lee', 'Okafor', 'Svensson', 'Dubois',
];

const QUOTES = [
  { area: 'Transcription', quotes: [
    "The transcription keeps mangling our product names. We've tried adding them to custom vocabulary but it doesn't stick across projects.",
    "Overlapping dialogue in our panel discussions creates a mess. Two people talk at once and the transcript just becomes word salad.",
    "We record in Japanese and English. The language switching mid-sentence throws the transcription off completely.",
    "Our legal team reviews transcripts before publishing. The error rate on technical terms means they're basically rewriting 30% of it.",
  ]},
  { area: 'Recorder', quotes: [
    "Lost a full hour of recording yesterday. No warning, no backup. Guest had flown in from Chicago for the interview.",
    "The recording quality drops when bandwidth dips but there's no indicator during the session. We only find out in post.",
    "We need local recording fallback. When the internet hiccups, we lose everything. Riverside handles this better.",
    "Audio levels between participants are wildly inconsistent. One person is barely audible while another is clipping.",
  ]},
  { area: 'AI', quotes: [
    "The AI clip finder missed the most viral moment in our last episode. Our intern found it manually in 10 minutes.",
    "We need AI to scan across all our episodes and find every mention of a specific topic. Currently impossible without watching everything.",
    "The auto-generated highlights feel generic. They pick dramatic moments but miss the genuinely insightful ones.",
  ]},
  { area: 'Collaboration', quotes: [
    "My client sent feedback on the wrong version because there's no clear version management. We wasted two days of revisions.",
    "Three editors working on the same project and we keep overwriting each other's changes. Need real-time conflict resolution.",
    "Can't set up an approval workflow. Clients should only be able to comment, not edit. But they keep accidentally moving things.",
  ]},
  { area: 'Timeline', quotes: [
    "The timeline becomes unusable after 15 tracks. Scrolling lags, playback stutters. We have to split into sub-projects.",
    "Undo doesn't always work correctly on timeline operations. Sometimes undoing a trim also undoes three other edits.",
    "Export times have gotten worse with recent updates. A 30-minute video now takes 45 minutes to export.",
  ]},
  { area: 'Templates', quotes: [
    "We produce 20 videos a week for the same client. Setting up brand colors and fonts from scratch every time is painful.",
    "Need template locking. Our junior editors keep accidentally resizing the logo or moving the lower third off-brand.",
  ]},
  { area: 'Effects', quotes: [
    "The noise reduction is too aggressive. It removes background noise but also makes voices sound tinny and robotic.",
    "We need at minimum a 3-band EQ. Just high/mid/low with adjustable crossover points would save us from exporting to Audition.",
  ]},
  { area: 'Accessibility', quotes: [
    "Section 508 compliance review takes us 2 hours per video. An automated pre-flight check would be transformative.",
    "Our captions fail WCAG contrast requirements on certain backgrounds. Need automatic contrast adjustment.",
  ]},
];

const COMPETITORS = ['Riverside', 'Vizard.ai', 'CapCut', 'Canva', 'Frame.io', 'ElevenLabs', 'Adobe Premiere', 'DaVinci Resolve'];

export class GongConnector extends BaseConnector {
  constructor({ connectorId, orgId }) {
    super({ connectorId, name: 'Gong', type: 'gong', orgId });
  }

  async fetchSignals(cursor) {
    const lastId = parseInt(cursor || '0');
    const count = 2 + Math.floor(Math.random() * 4); // 2-5 signals
    const signals = [];

    for (let i = 0; i < count; i++) {
      const seqId = lastId + i + 1;
      const account = ACCOUNTS[Math.floor(Math.random() * ACCOUNTS.length)];
      const role = ROLES[Math.floor(Math.random() * ROLES.length)];
      const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
      const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
      const areaGroup = QUOTES[Math.floor(Math.random() * QUOTES.length)];
      const quote = areaGroup.quotes[Math.floor(Math.random() * areaGroup.quotes.length)];

      const competitors = Math.random() < 0.2
        ? [COMPETITORS[Math.floor(Math.random() * COMPETITORS.length)]]
        : [];

      signals.push({
        externalId: `G-${String(seqId).padStart(4, '0')}`,
        content: quote,
        account: account.name,
        speaker: `${firstName} ${lastName}, ${role}`,
        arr: account.arr,
        competitors,
        rawData: {
          callId: `call_${seqId}`,
          duration: 30 + Math.floor(Math.random() * 30),
          date: new Date().toISOString(),
        },
      });
    }

    return { signals, newCursor: String(lastId + count) };
  }
}
