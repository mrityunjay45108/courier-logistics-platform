import { Router } from 'express';
import { getTracking } from './tracking.controller';

const router = Router();

router.get('/:trackingNumber', getTracking);

export default router;
