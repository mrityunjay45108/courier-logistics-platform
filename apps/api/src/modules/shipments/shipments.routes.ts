import { Router } from 'express';
import {
  createShipment,
  listShipments,
  getShipmentById,
  cancelShipment,
  updateShipmentStatus,
} from './shipments.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validation.middleware';
import { createShipmentSchema } from '@courier/shared';

const router = Router();

router.use(authenticate);

router.post('/', validateBody(createShipmentSchema), createShipment);
router.get('/', listShipments);
router.get('/:id', getShipmentById);
router.patch('/:id/cancel', cancelShipment);

// Admin/Ops status override
router.patch('/:id/status', authorize('ADMIN', 'OPERATIONS'), updateShipmentStatus);

export default router;
