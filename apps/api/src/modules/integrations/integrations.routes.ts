import { Router } from 'express';
import webhookRoutes from './webhooks/webhook.routes';
import reconciliationRoutes from './reconciliation/reconciliation.routes';

const router = Router();

router.use('/webhooks', webhookRoutes);
router.use('/shipments', reconciliationRoutes);

export default router;
