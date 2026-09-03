import { Router, Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';

const router = Router();

router.get('/methods', (req: Request, res: Response) => {
  sendSuccess(res, { supported: ['PREPAID', 'COD'] }, 'Payment module placeholder');
});

export default router;
