import { Router } from 'express';
import {
  createPaymentOrder,
  verifyPayment,
  handleWebhook,
  recordCodCollection,
  requestRefund,
  listPaymentOrders,
  listCodOrders,
} from './payments.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validation.middleware';
import {
  createPaymentOrderSchema,
  verifyPaymentSchema,
  codCollectionSchema,
  refundRequestSchema,
} from '@courier/shared';

const router = Router();

// Public webhook endpoint
router.post('/webhook', handleWebhook);

// Authenticated user routes
router.use(authenticate);

router.post('/orders', validateBody(createPaymentOrderSchema), createPaymentOrder);
router.post('/verify', validateBody(verifyPaymentSchema), verifyPayment);

// Delivery partner COD collection
router.post('/cod/:shipmentId/collect', authorize('DELIVERY_PARTNER', 'ADMIN', 'OPERATIONS'), validateBody(codCollectionSchema), recordCodCollection);

// Admin financial management
router.get('/admin/orders', authorize('ADMIN', 'OPERATIONS'), listPaymentOrders);
router.get('/admin/cod', authorize('ADMIN', 'OPERATIONS'), listCodOrders);
router.post('/admin/refund', authorize('ADMIN', 'OPERATIONS'), validateBody(refundRequestSchema), requestRefund);

export default router;
