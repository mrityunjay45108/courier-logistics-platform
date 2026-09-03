import { Router } from 'express';
import { getLiveness, getReadiness, getVersion } from './health.controller';

const router = Router();

router.get('/health', getLiveness);
router.get('/ready', getReadiness);
router.get('/version', getVersion);

export default router;
