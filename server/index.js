import express from 'express';
import cors from 'cors';
import * as Sentry from '@sentry/node';
import { config } from './config.js';
import { runMigrations } from './db/migrate.js';
import { ensureVectorTable } from './db/vectorStore.js';
import apiRoutes from './api/routes.js';
import { startScheduler } from './scheduler/index.js';
import { clerkAuth, requireAuthenticated } from './middleware/auth.js';
import { ensureDefaultConnectors } from './connectors/registry.js';

// Init Sentry
if (config.sentryDsn) {
  Sentry.init({ dsn: config.sentryDsn, environment: config.nodeEnv });
}

const app = express();

app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));
app.use(express.json());

// Clerk auth middleware
app.use(clerkAuth);

// Mount API routes (all require authentication + active org)
app.use('/api', requireAuthenticated, apiRoutes);

// Sentry error handler (must be after routes)
if (config.sentryDsn) {
  Sentry.setupExpressErrorHandler(app);
}

// Async startup
async function start() {
  await runMigrations();
  await ensureVectorTable();
  await ensureDefaultConnectors(config.defaultOrgId);

  app.listen(config.port, () => {
    console.log(`Sift API server running on http://localhost:${config.port}`);

    // Start pipeline scheduler
    if (config.nodeEnv !== 'test') {
      startScheduler();
    }
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
