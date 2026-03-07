import { BaseConnector } from './BaseConnector.js';

const COMPANIES = [
  'StreamForce Media', 'Digital Voices Inc.', 'ContentScale Co.',
  'AudioPrime Studios', 'NarrativeAI', 'ClickStream Productions',
  'VidCraft Solutions', 'SoundWave Digital', 'StoryLab Creative',
  'FrameRate Studios', 'PodFlow Networks', 'EditPoint Media',
];

const REVIEW_TITLES = [
  'Great for podcasts, needs work on video editing',
  'Best transcription tool, but missing pro features',
  'Solid all-in-one, but competitors are catching up',
  'Perfect for small teams, struggles at scale',
  'Love the AI features, hate the export times',
  'Good value but reliability issues with recording',
  'Switched from Adobe, mostly happy',
  'Excellent for content repurposing workflows',
  'The script-based editing is unique and powerful',
  'Growing pains with collaboration features',
  'AI clip detection needs significant improvement',
  'Best onboarding experience in the category',
];

const REVIEW_TEMPLATES = [
  'We switched to Descript from {competitor} six months ago. The transcript-based editing is genuinely innovative, but {pain_point}. Overall {rating_text} for our use case.',
  'Our team of {size} uses Descript daily for podcast production. The good: {strength}. The bad: {pain_point}. Would recommend for smaller teams.',
  'After evaluating {competitor} and Descript, we went with Descript because {strength}. However, {pain_point}. {rating_text} overall.',
  'Descript has been our primary editing tool for {months} months. {strength}, which saves us hours. But {pain_point}. Hoping the next update addresses this.',
  'We produce {count} videos per week using Descript. {strength} is the killer feature. The main drawback is {pain_point}. {rating_text} for content teams.',
];

const STRENGTHS = [
  'the AI transcription is accurate enough for our needs',
  'script-based editing dramatically speeds up rough cuts',
  'the filler word removal saves us 30 minutes per episode',
  'Studio Sound noise removal is surprisingly good',
  'the learning curve is much gentler than Premiere',
  'multitrack editing works well for interview formats',
];

const PAIN_POINTS = [
  'the timeline becomes unusable with more than 15 tracks',
  'recording reliability is still not where it needs to be',
  'collaboration features are too basic for our workflow',
  'export times have gotten worse with recent updates',
  'the template library is lacking compared to Canva',
  'no API means we can\'t integrate into our automated pipeline',
  'AI clip detection misses the best moments half the time',
  'noise reduction is all-or-nothing with no fine-tuning',
  'custom vocabulary doesn\'t persist across projects',
  'version control is basically nonexistent',
];

const COMPETITORS_LIST = ['Adobe Premiere', 'Riverside', 'Canva', 'CapCut', 'DaVinci Resolve', 'Vizard.ai', 'Frame.io'];

const RATING_TEXTS = ['Solid 4/5', 'A strong 3.5/5', 'Impressive 4.5/5', 'Decent 3/5', 'Reliable 4/5'];

function fillReview(template) {
  return template
    .replace('{competitor}', COMPETITORS_LIST[Math.floor(Math.random() * COMPETITORS_LIST.length)])
    .replace('{pain_point}', PAIN_POINTS[Math.floor(Math.random() * PAIN_POINTS.length)])
    .replace('{strength}', STRENGTHS[Math.floor(Math.random() * STRENGTHS.length)])
    .replace('{rating_text}', RATING_TEXTS[Math.floor(Math.random() * RATING_TEXTS.length)])
    .replace('{size}', String(5 + Math.floor(Math.random() * 50)))
    .replace('{months}', String(3 + Math.floor(Math.random() * 18)))
    .replace('{count}', String(5 + Math.floor(Math.random() * 30)));
}

export class G2Connector extends BaseConnector {
  constructor({ connectorId, orgId }) {
    super({ connectorId, name: 'G2 Reviews', type: 'g2', orgId });
  }

  async fetchSignals(cursor) {
    const lastId = parseInt(cursor || '0');
    const count = 1 + Math.floor(Math.random() * 3); // 1-3 signals
    const signals = [];

    for (let i = 0; i < count; i++) {
      const seqId = lastId + i + 1;
      const title = REVIEW_TITLES[Math.floor(Math.random() * REVIEW_TITLES.length)];
      const template = REVIEW_TEMPLATES[Math.floor(Math.random() * REVIEW_TEMPLATES.length)];
      const content = fillReview(template);
      const company = COMPANIES[Math.floor(Math.random() * COMPANIES.length)];
      const rating = 3 + Math.floor(Math.random() * 3); // 3-5 stars

      const competitors = Math.random() < 0.4
        ? [COMPETITORS_LIST[Math.floor(Math.random() * COMPETITORS_LIST.length)]]
        : [];

      signals.push({
        externalId: `G2-${String(seqId).padStart(4, '0')}`,
        title,
        content,
        account: company,
        sourceUrl: `https://www.g2.com/products/descript/reviews/review-${seqId}`,
        competitors,
        rawData: { rating, reviewDate: new Date().toISOString() },
      });
    }

    return { signals, newCursor: String(lastId + count) };
  }
}
