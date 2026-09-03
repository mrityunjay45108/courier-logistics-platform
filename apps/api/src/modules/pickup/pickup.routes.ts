import { Router } from 'express';
import {
  schedulePickup,
  reschedulePickup,
  recordAttempt,
  listPickups,
} from './pickup.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validation.middleware';
import { schedulePickupSchema, recordPickupAttemptSchema } from '@courier/shared';

const router = Router();

router.use(authenticate);

router.post('/schedule', validateBody(schedulePickupSchema), schedulePickup);
router.patch('/:id/reschedule', reschedulePickup);
router.post('/:id/attempts', authorize('ADMIN', 'OPERATIONS', 'DELIVERY_PARTNER'), validateBody(recordPickupAttemptSchema), recordAttempt);
router.get('/', authorize('ADMIN', 'OPERATIONS'), listPickups);

export default router;
