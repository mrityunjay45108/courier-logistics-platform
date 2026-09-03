import { Request, Response, NextFunction } from 'express';
import { pickupService } from './pickup.service';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export async function schedulePickup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId, role } = (req as AuthenticatedRequest).user!;
    const pickup = await pickupService.schedulePickup({
      ...req.body,
      userId,
      role,
    });
    sendSuccess(res, pickup, 'Pickup scheduled successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function reschedulePickup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = (req as AuthenticatedRequest).user!;
    const pickup = await pickupService.reschedulePickup({
      pickupId: req.params.id,
      ...req.body,
      userId,
    });
    sendSuccess(res, pickup, 'Pickup rescheduled successfully');
  } catch (error) {
    next(error);
  }
}

export async function recordAttempt(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = (req as AuthenticatedRequest).user!;
    const result = await pickupService.recordAttempt({
      pickupId: req.params.id,
      ...req.body,
      userId,
    });
    sendSuccess(res, result, 'Pickup attempt recorded');
  } catch (error) {
    next(error);
  }
}

export async function listPickups(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, status } = req.query;
    const result = await pickupService.listPickups({
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      status: status as any,
    });
    sendSuccess(res, result, 'Pickups retrieved successfully');
  } catch (error) {
    next(error);
  }
}
