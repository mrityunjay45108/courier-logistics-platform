import { Request, Response, NextFunction } from 'express';
import { deliveryService } from './delivery.service';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export async function scheduleDelivery(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = (req as AuthenticatedRequest).user!;
    const delivery = await deliveryService.scheduleDelivery({
      ...req.body,
      userId,
    });
    sendSuccess(res, delivery, 'Delivery scheduled successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function recordAttempt(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = (req as AuthenticatedRequest).user!;
    const result = await deliveryService.recordAttempt({
      deliveryId: req.params.id,
      ...req.body,
      userId,
    });
    sendSuccess(res, result, 'Delivery attempt recorded');
  } catch (error) {
    next(error);
  }
}

export async function listDeliveries(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, status } = req.query;
    const result = await deliveryService.listDeliveries({
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      status: status as any,
    });
    sendSuccess(res, result, 'Deliveries retrieved successfully');
  } catch (error) {
    next(error);
  }
}
