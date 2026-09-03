import { Router } from 'express';
import {
  getQuote,
  checkPincode,
  listZones,
  listRateCards,
  listServiceability,
} from './pricing.controller';
import { validateBody } from '../../middleware/validation.middleware';
import { quoteQuerySchema } from '@courier/shared';
import { authenticate, authorize, optionalAuthenticateUserOrApiClient } from '../../middleware/auth.middleware';

const router = Router();

// Public / Authenticated quote calculation (supports JWT and X-Api-Key)
router.post('/quote', optionalAuthenticateUserOrApiClient, validateBody(quoteQuerySchema), getQuote);
router.get('/serviceability/:pincode', optionalAuthenticateUserOrApiClient, checkPincode);

// Admin pricing management
router.get('/admin/zones', authenticate, authorize('ADMIN', 'OPERATIONS'), listZones);
router.get('/admin/rate-cards', authenticate, authorize('ADMIN', 'OPERATIONS'), listRateCards);
router.get('/admin/serviceability', authenticate, authorize('ADMIN', 'OPERATIONS'), listServiceability);

export default router;
