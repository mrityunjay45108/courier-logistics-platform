import { Request, Response, NextFunction } from 'express';
import { returnsService } from './returns.service';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export async function createReturn(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = (req as AuthenticatedRequest).user!;
    const returnOrder = await returnsService.createCustomerReturn({
      ...req.body,
      userId,
    });
    sendSuccess(res, returnOrder, 'Return request submitted successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function approveReturn(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminUserId = (req as AuthenticatedRequest).user!.userId;
    const result = await returnsService.approveReturn(req.params.id, adminUserId);
    sendSuccess(res, result, 'Return approved');
  } catch (error) {
    next(error);
  }
}

export async function rejectReturn(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminUserId = (req as AuthenticatedRequest).user!.userId;
    const result = await returnsService.rejectReturn(req.params.id, req.body.reason, adminUserId);
    sendSuccess(res, result, 'Return rejected');
  } catch (error) {
    next(error);
  }
}

export async function recordInspection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminUserId = (req as AuthenticatedRequest).user!.userId;
    const result = await returnsService.recordInspection({
      returnId: req.params.id,
      ...req.body,
      inspectedBy: adminUserId,
    });
    sendSuccess(res, result, 'Inspection recorded');
  } catch (error) {
    next(error);
  }
}

export async function initiateRTO(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminUserId = (req as AuthenticatedRequest).user!.userId;
    const rto = await returnsService.initiateRTO(req.params.shipmentId, req.body.reason, adminUserId);
    sendSuccess(res, rto, 'RTO initiated successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function listReturns(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId, role } = (req as AuthenticatedRequest).user!;
    const { page, limit, type, status } = req.query;
    const result = await returnsService.listReturns({
      userId,
      role,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      type: type as any,
      status: status as any,
    });
    sendSuccess(res, result, 'Returns retrieved successfully');
  } catch (error) {
    next(error);
  }
}

export async function getReturnById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const returnOrder = await returnsService.getReturnById(req.params.id);
    sendSuccess(res, returnOrder, 'Return details retrieved');
  } catch (error) {
    next(error);
  }
}
