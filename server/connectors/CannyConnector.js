import { BaseConnector } from './BaseConnector.js';

const CATEGORIES = [
  'Transcription', 'Recorder', 'Sharing/Collaboration', 'AI',
  'Exporting/Publishing', 'Layouts (fka Templates)', 'Timeline',
  'Effects', 'Script', 'Animation', 'Media Libraries',
  'Integrations', 'AI Speech',
];

const TITLE_TEMPLATES = {
  'Transcription': [
    'Support for {lang} transcription',
    'Better accuracy for {domain} terminology',
    'Auto-detect language switching mid-sentence',
    'Batch transcription for multiple files',
    'Custom vocabulary per project',
    'Punctuation accuracy improvements',
  ],
  'Recorder': [
    'Recording backup when connection drops',
    'Per-participant audio level monitoring',
    'Support for {count}-person recordings',
    'Automatic silence removal during recording',
    'Record at higher bitrate for music podcasts',
    'Pre-recording sound check wizard',
  ],
  'Sharing/Collaboration': [
    'Guest review links with commenting only',
    'Approval workflow for enterprise teams',
    'Real-time co-editing with presence indicators',
    'Shared team media library',
    'Comment threads on specific timestamps',
  ],
  'AI': [
    'AI-powered chapter markers for long videos',
    'Automatic B-roll suggestions from stock libraries',
    'AI scene detection and smart splitting',
    'Content repurposing suggestions across platforms',
    'AI-generated social media captions from video',
  ],
  'Exporting/Publishing': [
    'One-click publish to {platform}',
    'Scheduled publishing queue',
    'Export presets per social platform',
    'Batch export multiple formats simultaneously',
    'Auto-optimize bitrate for file size targets',
  ],
  'Layouts (fka Templates)': [
    'Community template marketplace',
    'Brand kit with saved color palettes',
    'Template categories by industry',
    'Animated lower third templates',
    'Thumbnail generator from video frames',
  ],
  'Timeline': [
    'Customizable track heights',
    'Ripple edit across all tracks',
    'Snap-to-beat for music sync',
    'Multi-track selection and group move',
    'Timeline zoom to selection shortcut',
  ],
  'Effects': [
    'Background blur for video calls',
    'Color grading presets library',
    'Audio ducking improvements',
    'Transition presets between scenes',
    'Speed ramping with easing curves',
  ],
  'Script': [
    'Script diff view after re-recording',
    'Script versioning with rollback',
    'Teleprompter mode for recording',
    'Script collaboration with suggestions mode',
  ],
  'Animation': [
    'Keyframe animation for text elements',
    'Motion path editor for objects',
    'Preset entrance/exit animations',
    'Animated callout boxes',
  ],
  'Media Libraries': [
    'Global search across all projects',
    'Tag and organize media assets',
    'Favorites and collections for clips',
    'Auto-categorize media by type',
  ],
  'Integrations': [
    'Zapier/Make integration support',
    'Slack notifications for project updates',
    'Google Drive auto-backup',
    'Webhook support for render completion',
  ],
  'AI Speech': [
    'More natural AI voice pacing',
    'Emotion control for AI narration',
    'Multi-language AI voice support',
    'Voice cloning from shorter samples',
  ],
};

const FILL_WORDS = {
  '{lang}': ['Mandarin', 'Hindi', 'Arabic', 'Portuguese', 'Korean', 'Thai', 'Vietnamese', 'Polish'],
  '{domain}': ['medical', 'legal', 'financial', 'engineering', 'scientific', 'pharmaceutical'],
  '{count}': ['8', '10', '12', '16', '20'],
  '{platform}': ['TikTok', 'LinkedIn', 'Spotify', 'Vimeo', 'Twitter/X', 'Threads'],
};

function fillTemplate(template) {
  let result = template;
  for (const [placeholder, values] of Object.entries(FILL_WORDS)) {
    if (result.includes(placeholder)) {
      result = result.replace(placeholder, values[Math.floor(Math.random() * values.length)]);
    }
  }
  return result;
}

export class CannyConnector extends BaseConnector {
  constructor({ connectorId, orgId }) {
    super({ connectorId, name: 'Canny', type: 'canny', orgId });
  }

  async fetchSignals(cursor) {
    const lastId = parseInt(cursor || '0');
    const count = 3 + Math.floor(Math.random() * 6); // 3-8 signals
    const signals = [];

    for (let i = 0; i < count; i++) {
      const seqId = lastId + i + 1;
      const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      const templates = TITLE_TEMPLATES[category] || TITLE_TEMPLATES['AI'];
      const title = fillTemplate(templates[Math.floor(Math.random() * templates.length)]);

      signals.push({
        externalId: `C-${String(seqId).padStart(4, '0')}`,
        title,
        votes: 5 + Math.floor(Math.random() * 200),
        category,
      });
    }

    return { signals, newCursor: String(lastId + count) };
  }
}
