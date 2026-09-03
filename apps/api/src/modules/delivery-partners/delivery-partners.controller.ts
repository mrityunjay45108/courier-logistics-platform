import { Request, Response, NextFunction } from 'express';
import { deliveryPartnersService } from './delivery-partners.service';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export async function getMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = (req as AuthenticatedRequest).user!;
    const partner = await deliveryPartnersService.getPartnerByUserId(userId);
    sendSuccess(res, partner, 'Partner profile retrieved');
  } catch (error) {
    next(error);
  }
}

export async function updateAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = (req as AuthenticatedRequest).user!;
    const updated = await deliveryPartnersService.updateAvailability(userId, req.body.availabilityStatus);
    sendSuccess(res, updated, 'Availability updated');
  } catch (error) {
    next(error);
  }
}

export async function listMyTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = (req as AuthenticatedRequest).user!;
    const { page, limit, status, taskType } = req.query;
    const result = await deliveryPartnersService.listPartnerTasks({
      userId,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      status: status as any,
      taskType: taskType as any,
    });
    sendSuccess(res, result, 'Tasks retrieved successfully');
  } catch (error) {
    next(error);
  }
}

export async function updateTaskStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = (req as AuthenticatedRequest).user!;
    const { status, rejectionReason, notes, podRecipientName } = req.body;
    const updated = await deliveryPartnersService.updateTaskStatus({
      taskId: req.params.id,
      userId,
      targetStatus: status,
      rejectionReason,
      notes,
      podRecipientName,
    });
    sendSuccess(res, updated, 'Task updated successfully');
  } catch (error) {
    next(error);
  }
}

// Admin handlers
export async function listAllPartners(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, availability } = req.query;
    const partners = await deliveryPartnersService.listAllPartners({
      status: status as any,
      availability: availability as any,
    });
    sendSuccess(res, partners, 'Partners retrieved');
  } catch (error) {
    next(error);
  }
}

export async function assignTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminUserId = (req as AuthenticatedRequest).user!.userId;
    const task = await deliveryPartnersService.assignTask({
      ...req.body,
      adminUserId,
    });
    sendSuccess(res, task, 'Task assigned successfully', 201);
  } catch (error) {
    next(error);
  }
}
