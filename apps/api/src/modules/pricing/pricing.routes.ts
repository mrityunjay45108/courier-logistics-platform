import { Router, Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';

const router = Router();

router.get('/estimate', (req: Request, res: Response) => {
  sendSuccess(res, { rateCards: [], notice: 'Pricing engine will be active in Phase 2' }, 'Pricing module placeholder');
});

export default router;
