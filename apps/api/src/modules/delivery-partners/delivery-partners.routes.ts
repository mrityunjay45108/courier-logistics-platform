import { Router } from 'express';
import {
  getMyProfile,
  updateAvailability,
  listMyTasks,
  updateTaskStatus,
  listAllPartners,
  assignTask,
} from './delivery-partners.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validation.middleware';
import { assignTaskSchema, updateAvailabilitySchema } from '@courier/shared';

const router = Router();

router.use(authenticate);

// Rider portal self-service
router.get('/me', getMyProfile);
router.patch('/availability', validateBody(updateAvailabilitySchema), updateAvailability);
router.get('/tasks', listMyTasks);
router.get('/manifest', authorize('DELIVERY_PARTNER'), listMyTasks);
router.patch('/tasks/:id', updateTaskStatus);

// Operations & Admin management
router.get('/admin', authorize('ADMIN', 'OPERATIONS'), listAllPartners);
router.post('/admin/assign', authorize('ADMIN', 'OPERATIONS'), validateBody(assignTaskSchema), assignTask);

export default router;
