import { Router } from 'express';
import { getLiveness, getReadiness, getVersion } from './health.controller';

const router = Router();

// Standard health check endpoints
router.get('/health', getLiveness);
router.get('/health/live', getLiveness);
router.get('/health/ready', getReadiness);

// Cloud / Kubernetes compatibility aliases
router.get('/live', getLiveness);
router.get('/ready', getReadiness);
router.get('/version', getVersion);

export default router;
