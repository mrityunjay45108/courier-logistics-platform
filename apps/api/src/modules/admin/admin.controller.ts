import { Request, Response, NextFunction } from 'express';
import { adminService } from './admin.service';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export async function getDashboardSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { startDate, endDate } = req.query;
    const summary = await adminService.getDashboardSummary(startDate as string, endDate as string);
    sendSuccess(res, summary, 'Dashboard summary retrieved');
  } catch (error) {
    next(error);
  }
}

export async function globalSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = (req.query.q as string) || '';
    const results = await adminService.globalSearch(query);
    sendSuccess(res, results, 'Search results retrieved');
  } catch (error) {
    next(error);
  }
}

export async function listExceptions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, severity } = req.query;
    const exceptions = await adminService.listExceptions({
      status: status as any,
      severity: severity as any,
    });
    sendSuccess(res, exceptions, 'Exceptions retrieved');
  } catch (error) {
    next(error);
  }
}

export async function resolveException(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminUserId = (req as AuthenticatedRequest).user!.userId;
    await adminService.resolveException(req.params.id, req.body.resolutionNotes, adminUserId);
    sendSuccess(res, null, 'Exception resolved successfully');
  } catch (error) {
    next(error);
  }
}

export async function listActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 30;
    const activities = await adminService.listActivity(limit);
    sendSuccess(res, activities, 'Activity audit trail retrieved');
  } catch (error) {
    next(error);
  }
}

export async function getSystemHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const health = await adminService.getSystemHealth();
    sendSuccess(res, health, 'System health diagnostics retrieved');
  } catch (error) {
    next(error);
  }
}
