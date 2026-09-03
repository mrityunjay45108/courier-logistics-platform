import { Router } from 'express';
import {
  createShipment,
  listShipments,
  getShipmentById,
  getShipmentByExternalOrder,
  getShipmentByTracking,
  getShippingLabel,
  cancelShipment,
  cancelByExternalOrder,
  updateShipmentStatus,
} from './shipments.controller';
import { authenticateUserOrApiClient, authorize } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validation.middleware';
import { createShipmentSchema } from '@courier/shared';

const router = Router();

// Dual authentication: supports Bearer JWT (user) and X-Api-Key (machine)
router.use(authenticateUserOrApiClient);

// E-Commerce specific named lookups (must precede /:id)
router.get('/by-external-order/:externalOrderId', getShipmentByExternalOrder);
router.get('/by-external-order/:externalOrderId/label', getShippingLabel);
router.patch('/by-external-order/:externalOrderId/cancel', cancelByExternalOrder);
router.get('/by-tracking/:trackingNumber', getShipmentByTracking);

// Standard CRUD
router.post('/', validateBody(createShipmentSchema), createShipment);
router.get('/', listShipments);
router.get('/:id', getShipmentById);
router.get('/:id/label', getShippingLabel);
router.patch('/:id/cancel', cancelShipment);

// Admin/Ops status override
router.patch('/:id/status', authorize('ADMIN', 'OPERATIONS'), updateShipmentStatus);

export default router;
