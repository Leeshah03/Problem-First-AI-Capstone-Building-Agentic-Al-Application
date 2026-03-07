import { Router } from 'express';
import { getThemes, getThemeById } from './themes.js';
import { getStats } from './stats.js';
import { getReviewQueue, reviewItem, batchReview } from './review.js';
import { triggerPipeline, getPipelineStatus, getPipelineRuns } from './pipeline.js';
import { sseHandler } from './events.js';
import { listConnectors, updateConnector, manualSync, getActivity } from './connectors.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

// SSE — any authenticated user
router.get('/events', sseHandler);

// Read routes — any authenticated user
router.get('/themes', getThemes);
router.get('/themes/:id', getThemeById);
router.get('/stats', getStats);
router.get('/review', getReviewQueue);
router.get('/connectors', listConnectors);
router.get('/activity', getActivity);
router.get('/pipeline/status/:id', getPipelineStatus);
router.get('/pipeline/runs', getPipelineRuns);

// Write routes — admin only
router.patch('/review/:id', requireRole('admin'), reviewItem);
router.post('/review/batch', requireRole('admin'), batchReview);
router.post('/pipeline/run', requireRole('admin'), triggerPipeline);
router.patch('/connectors/:id', requireRole('admin'), updateConnector);
router.post('/connectors/:id/sync', requireRole('admin'), manualSync);

export default router;
