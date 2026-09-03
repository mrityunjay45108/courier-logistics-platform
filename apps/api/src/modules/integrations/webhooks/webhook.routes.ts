import { Router } from 'express';
import {
  createSubscription,
  listSubscriptions,
  deleteSubscription,
  sendTestWebhook,
} from './webhook.controller';
import { authenticateUserOrApiClient } from '../../../middleware/auth.middleware';
import { validateBody } from '../../../middleware/validation.middleware';
import { createWebhookSubscriptionSchema } from '@courier/shared';

const router = Router();

router.use(authenticateUserOrApiClient);

router.post('/subscriptions', validateBody(createWebhookSubscriptionSchema), createSubscription);
router.get('/subscriptions', listSubscriptions);
router.delete('/subscriptions/:id', deleteSubscription);
router.post('/test', sendTestWebhook);

export default router;
