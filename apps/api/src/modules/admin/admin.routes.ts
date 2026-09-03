import { Router } from 'express';
import {
  getDashboardSummary,
  globalSearch,
  listExceptions,
  resolveException,
  listActivity,
  getSystemHealth,
} from './admin.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validation.middleware';
import { resolveExceptionSchema } from '@courier/shared';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'OPERATIONS'));

router.get('/dashboard/summary', getDashboardSummary);
router.get('/search', globalSearch);
router.get('/exceptions', listExceptions);
router.patch('/exceptions/:id/resolve', validateBody(resolveExceptionSchema), resolveException);
router.get('/activity', listActivity);
router.get('/system-health', getSystemHealth);

export default router;
