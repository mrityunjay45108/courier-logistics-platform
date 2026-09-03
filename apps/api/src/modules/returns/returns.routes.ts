import { Router } from 'express';
import {
  createReturn,
  approveReturn,
  rejectReturn,
  recordInspection,
  initiateRTO,
  listReturns,
  getReturnById,
} from './returns.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validation.middleware';
import { createReturnSchema, recordInspectionSchema } from '@courier/shared';

const router = Router();

router.use(authenticate);

// Customer return submission & tracking
router.post('/', validateBody(createReturnSchema), createReturn);
router.get('/', listReturns);
router.get('/:id', getReturnById);

// Admin / Operations reverse logistics control
router.patch('/admin/:id/approve', authorize('ADMIN', 'OPERATIONS'), approveReturn);
router.patch('/admin/:id/reject', authorize('ADMIN', 'OPERATIONS'), rejectReturn);
router.post('/admin/:id/inspection', authorize('ADMIN', 'OPERATIONS'), validateBody(recordInspectionSchema), recordInspection);
router.post('/admin/shipments/:shipmentId/rto', authorize('ADMIN', 'OPERATIONS'), initiateRTO);

export default router;
