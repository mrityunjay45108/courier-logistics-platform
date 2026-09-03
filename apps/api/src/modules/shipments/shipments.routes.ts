import { Router, Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { authenticate, authorize } from '../../middleware/auth.middleware';

const router = Router();

// Placeholders for future phases
router.get('/', authenticate, (req: Request, res: Response) => {
  // Empty state foundation
  sendSuccess(res, { shipments: [], total: 0 }, 'Shipments module active. No shipments found.');
});

export default router;
