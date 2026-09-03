import { Request, Response, NextFunction } from 'express';
import { trackingService } from './tracking.service';
import { sendSuccess } from '../../utils/response';

export async function getTracking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { trackingNumber } = req.params;
    const result = await trackingService.getShipmentTracking(trackingNumber);
    sendSuccess(res, result, 'Tracking information retrieved');
  } catch (error) {
    next(error);
  }
}
