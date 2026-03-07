import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || process.env.API_PORT || '3001'),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/sift',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  clerkSecretKey: process.env.CLERK_SECRET_KEY || '',
  clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY || '',
  defaultOrgId: process.env.DEFAULT_ORG_ID || 'org_default',
  sentryDsn: process.env.SENTRY_DSN || '',
  pipeline: {
    batchSize: parseInt(process.env.PIPELINE_BATCH_SIZE || '250'),
    similarityThreshold: parseFloat(process.env.SIMILARITY_THRESHOLD || '0.85'),
    lowConfidenceThreshold: parseFloat(process.env.LOW_CONFIDENCE_THRESHOLD || '0.6'),
  },
};
