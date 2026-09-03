import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../../lib/prisma';
import { authenticateUserOrApiClient, AuthenticatedRequest } from '../../../middleware/auth.middleware';
import { sendSuccess } from '../../../utils/response';
import { ShipmentStatus } from '@prisma/client';

const router = Router();

router.use(authenticateUserOrApiClient);

/**
 * GET /api/integrations/shipments/reconciliation
 * Periodic sync endpoint for E-Commerce to recover missed webhooks
 */
router.get('/reconciliation', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { updatedAfter, updatedBefore, status, externalOrderId, trackingNumber, page, limit } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    // Build tenant-isolated where condition
    const where: any = {};

    // If caller is an API client, strictly isolate to client's sellerId
    if (authReq.apiClient?.sellerId) {
      where.sellerId = authReq.apiClient.sellerId;
    } else if (authReq.user?.role === 'SELLER') {
      where.sellerId = authReq.user.userId;
    } else if (authReq.user?.role === 'CUSTOMER') {
      where.customerId = authReq.user.userId;
    }
    // ADMIN / OPERATIONS can query across all sellers

    if (status && Object.values(ShipmentStatus).includes(status as ShipmentStatus)) {
      where.status = status as ShipmentStatus;
    }

    if (externalOrderId) {
      where.externalOrderId = String(externalOrderId).trim();
    }

    if (trackingNumber) {
      where.trackingNumber = String(trackingNumber).trim();
    }

    if (updatedAfter || updatedBefore) {
      where.updatedAt = {};
      if (updatedAfter) where.updatedAt.gte = new Date(updatedAfter as string);
      if (updatedBefore) where.updatedAt.lte = new Date(updatedBefore as string);
    }

    const [items, total] = await Promise.all([
      prisma.shipment.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { updatedAt: 'asc' },
        select: {
          id: true,
          externalOrderId: true,
          trackingNumber: true,
          status: true,
          shipmentType: true,
          shippingCost: true,
          codAmount: true,
          currency: true,
          deliveredAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.shipment.count({ where }),
    ]);

    const formatted = items.map((item) => ({
      shipmentId: item.id,
      externalOrderId: item.externalOrderId,
      trackingNumber: item.trackingNumber,
      status: item.status,
      shipmentType: item.shipmentType,
      shippingCost: Number(item.shippingCost),
      codAmount: Number(item.codAmount),
      currency: item.currency,
      deliveredAt: item.deliveredAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    sendSuccess(
      res,
      {
        items: formatted,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
      'Shipment reconciliation records retrieved'
    );
  } catch (error) {
    next(error);
  }
});

export default router;
