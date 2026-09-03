import { Request, Response, NextFunction } from 'express';
import { shipmentsService } from './shipments.service';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export async function createShipment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId, role } = (req as AuthenticatedRequest).user!;
    const shipment = await shipmentsService.createShipment(req.body, userId, role);
    sendSuccess(res, shipment, 'Shipment booked successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function listShipments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId, role } = (req as AuthenticatedRequest).user!;
    const { page, limit, search, status, shipmentType, startDate, endDate } = req.query;

    const result = await shipmentsService.listShipments({
      userId,
      role,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      search: search as string,
      status: status as any,
      shipmentType: shipmentType as any,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    sendSuccess(res, result, 'Shipments retrieved successfully');
  } catch (error) {
    next(error);
  }
}

export async function getShipmentById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId, role } = (req as AuthenticatedRequest).user!;
    const shipment = await shipmentsService.getShipmentById(req.params.id, userId, role);
    sendSuccess(res, shipment, 'Shipment retrieved successfully');
  } catch (error) {
    next(error);
  }
}

export async function cancelShipment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId, role } = (req as AuthenticatedRequest).user!;
    const shipment = await shipmentsService.cancelShipment(req.params.id, userId, role, req.body?.reason);
    sendSuccess(res, shipment, 'Shipment cancelled successfully');
  } catch (error) {
    next(error);
  }
}

export async function updateShipmentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminUserId = (req as AuthenticatedRequest).user!.userId;
    const { status, description, location } = req.body;
    const shipment = await shipmentsService.updateStatus(req.params.id, status, adminUserId, description, location);
    sendSuccess(res, shipment, 'Shipment status updated successfully');
  } catch (error) {
    next(error);
  }
}
