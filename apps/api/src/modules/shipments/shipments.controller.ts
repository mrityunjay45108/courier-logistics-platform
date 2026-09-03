import { Request, Response, NextFunction } from 'express';
import { shipmentsService } from './shipments.service';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { executeIdempotent } from '../../lib/idempotency';

export async function createShipment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { userId, role } = authReq.user!;
    const idempotencyKey = (req.headers['idempotency-key'] as string)?.trim();
    const clientId = authReq.apiClient?.id || userId;
    const isApiClient = Boolean(authReq.apiClient);

    if (idempotencyKey) {
      const idempotentResult = await executeIdempotent(
        clientId,
        idempotencyKey,
        req.body,
        'Shipment',
        async () => {
          const created = await shipmentsService.createShipment(req.body, userId, role);
          const responsePayload = isApiClient
            ? shipmentsService.formatIntegrationResponse(created)
            : created;
          return {
            status: 201,
            data: responsePayload,
          };
        }
      );

      sendSuccess(
        res,
        idempotentResult.data,
        idempotentResult.cached ? 'Shipment retrieved (idempotent replay)' : 'Shipment booked successfully',
        idempotentResult.status
      );
      return;
    }

    const shipment = await shipmentsService.createShipment(req.body, userId, role);
    const responsePayload = isApiClient
      ? shipmentsService.formatIntegrationResponse(shipment)
      : shipment;

    sendSuccess(res, responsePayload, 'Shipment booked successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function listShipments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { userId, role } = authReq.user!;
    const { page, limit, search, status, shipmentType, startDate, endDate, externalOrderId } = req.query;

    // If externalOrderId filter is passed directly to list
    const searchTerm = externalOrderId ? String(externalOrderId) : (search as string);

    const result = await shipmentsService.listShipments({
      userId,
      role,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      search: searchTerm,
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
    const authReq = req as AuthenticatedRequest;
    const { userId, role } = authReq.user!;
    const isApiClient = Boolean(authReq.apiClient);

    const shipment = await shipmentsService.getShipmentById(req.params.id, userId, role);
    const responsePayload = isApiClient
      ? shipmentsService.formatIntegrationResponse(shipment)
      : shipment;

    sendSuccess(res, responsePayload, 'Shipment retrieved successfully');
  } catch (error) {
    next(error);
  }
}

export async function getShipmentByExternalOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { userId, role } = authReq.user!;
    const sellerId = authReq.apiClient?.sellerId || (role === 'SELLER' ? userId : null);

    const shipment = await shipmentsService.getByExternalOrderId(
      req.params.externalOrderId,
      userId,
      role,
      sellerId
    );

    sendSuccess(res, shipmentsService.formatIntegrationResponse(shipment), 'Shipment retrieved by external order ID');
  } catch (error) {
    next(error);
  }
}

export async function getShipmentByTracking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { userId, role } = authReq.user!;
    const sellerId = authReq.apiClient?.sellerId || (role === 'SELLER' ? userId : null);

    const shipment = await shipmentsService.getByTrackingNumber(
      req.params.trackingNumber,
      userId,
      role,
      sellerId
    );

    sendSuccess(res, shipmentsService.formatIntegrationResponse(shipment), 'Shipment retrieved by tracking number');
  } catch (error) {
    next(error);
  }
}

export async function getShippingLabel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { userId, role } = authReq.user!;
    const sellerId = authReq.apiClient?.sellerId || (role === 'SELLER' ? userId : null);

    const identifier = req.params.id || req.params.externalOrderId;
    const label = await shipmentsService.getShippingLabel(identifier, userId, role, sellerId);

    sendSuccess(res, label, 'Shipping label retrieved');
  } catch (error) {
    next(error);
  }
}

export async function cancelShipment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { userId, role } = authReq.user!;
    const isApiClient = Boolean(authReq.apiClient);

    const shipment = await shipmentsService.cancelShipment(req.params.id, userId, role, req.body?.reason);
    const responsePayload = isApiClient
      ? shipmentsService.formatIntegrationResponse(shipment)
      : shipment;

    sendSuccess(res, responsePayload, 'Shipment cancelled successfully');
  } catch (error) {
    next(error);
  }
}

export async function cancelByExternalOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { userId, role } = authReq.user!;
    const sellerId = authReq.apiClient?.sellerId || (role === 'SELLER' ? userId : null);

    const existing = await shipmentsService.getByExternalOrderId(
      req.params.externalOrderId,
      userId,
      role,
      sellerId
    );

    const cancelled = await shipmentsService.cancelShipment(existing.id, userId, role, req.body?.reason);
    sendSuccess(res, shipmentsService.formatIntegrationResponse(cancelled), 'Shipment cancelled successfully');
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
