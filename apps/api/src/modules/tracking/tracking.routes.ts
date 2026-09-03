import { Router } from 'express';
import { getTracking, streamTracking } from './tracking.controller';
import { trackingLimiter } from '../../middleware/rateLimiter.middleware';

const router = Router();

// Public tracking query & SSE stream
router.get('/:trackingNumber', trackingLimiter, getTracking);
router.get('/stream/:trackingNumber', streamTracking);

export default router;
