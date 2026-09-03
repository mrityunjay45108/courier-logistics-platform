import { Router, Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, (req: Request, res: Response) => {
  sendSuccess(res, { notifications: [], unreadCount: 0 }, 'Notifications placeholder');
});

export default router;
