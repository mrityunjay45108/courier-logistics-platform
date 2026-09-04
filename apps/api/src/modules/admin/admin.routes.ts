import { Router } from 'express';
import {
  getDashboardSummary,
  globalSearch,
  listExceptions,
  resolveException,
  listActivity,
  getSystemHealth,
} from './admin.controller';
import {
  getKafkaStats,
  getKafkaOutboxStats,
  listKafkaFailedEvents,
  getKafkaFailedEvent,
  replayKafkaFailedEvent,
  resolveKafkaFailedEvent,
  ignoreKafkaFailedEvent,
  getIntegrationsStats,
} from './admin-kafka.controller';
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

// Production Observability & Kafka Operations
router.get('/kafka/stats', getKafkaStats);
router.get('/kafka/outbox/stats', getKafkaOutboxStats);
router.get('/kafka/failed-events', listKafkaFailedEvents);
router.get('/kafka/failed-events/:id', getKafkaFailedEvent);
router.post('/kafka/failed-events/:id/replay', replayKafkaFailedEvent);
router.post('/kafka/failed-events/:id/resolve', resolveKafkaFailedEvent);
router.post('/kafka/failed-events/:id/ignore', ignoreKafkaFailedEvent);
router.get('/integrations/stats', getIntegrationsStats);

export default router;

