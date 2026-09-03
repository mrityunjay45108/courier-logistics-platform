import { Router, Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { authenticate, authorize } from '../../middleware/auth.middleware';

const router = Router();

router.get('/manifest', authenticate, authorize('ADMIN', 'OPERATIONS', 'DELIVERY_PARTNER'), (req: Request, res: Response) => {
  sendSuccess(res, { runsheets: [] }, 'Delivery Partner runsheet placeholder');
});

export default router;
