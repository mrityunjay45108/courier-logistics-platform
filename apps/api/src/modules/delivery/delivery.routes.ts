import { Router } from 'express';
import {
  scheduleDelivery,
  recordAttempt,
  listDeliveries,
} from './delivery.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validation.middleware';
import { scheduleDeliverySchema, recordDeliveryAttemptSchema } from '@courier/shared';

const router = Router();

router.use(authenticate);

router.post('/schedule', authorize('ADMIN', 'OPERATIONS'), validateBody(scheduleDeliverySchema), scheduleDelivery);
router.post('/:id/attempts', authorize('ADMIN', 'OPERATIONS', 'DELIVERY_PARTNER'), validateBody(recordDeliveryAttemptSchema), recordAttempt);
router.get('/', authorize('ADMIN', 'OPERATIONS'), listDeliveries);

export default router;
