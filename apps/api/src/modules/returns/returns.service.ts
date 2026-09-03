import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../utils/errors';
import { paymentsService } from '../payments/payments.service';
import {
  ReturnType,
  ReturnStatus,
  ReturnReason,
  InspectionStatus,
  ItemCondition,
  ShipmentStatus,
  PickupType,
  AuditAction,
  TaskType,
  TaskStatus,
} from '@prisma/client';

export class ReturnsService {
  /**
   * Customer initiates return request
   */
  async createCustomerReturn(params: {
    shipmentId: string;
    userId: string;
    reason: ReturnReason;
    comment?: string;
  }) {
    const shipment = await prisma.shipment.findUnique({
      where: { id: params.shipmentId },
      include: { addresses: true },
    });

    if (!shipment) throw new NotFoundError('Shipment not found');

    if (shipment.customerId !== params.userId) {
      throw new ForbiddenError('You can only request returns for your own shipments');
    }

    // Eligibility check: Must be DELIVERED
    if (shipment.status !== ShipmentStatus.DELIVERED) {
      throw new BadRequestError(
        `Returns can only be requested for delivered consignments. Current status: '${shipment.status}'`
      );
    }

    // Check return window (15 days default)
    const deliveryDate = shipment.deliveredAt || shipment.updatedAt;
    const windowDays = 15;
    const expiryDate = new Date(deliveryDate.getTime() + windowDays * 24 * 60 * 60 * 1000);
    if (new Date() > expiryDate) {
      throw new BadRequestError(`Return window of ${windowDays} days has expired for this shipment.`);
    }

    // Prevent duplicate active returns
    const activeReturn = await prisma.returnOrder.findFirst({
      where: {
        shipmentId: params.shipmentId,
        status: { notIn: [ReturnStatus.REJECTED, ReturnStatus.CANCELLED, ReturnStatus.FAILED] },
      },
    });

    if (activeReturn) {
      throw new BadRequestError(`An active return request (${activeReturn.returnNumber}) already exists for this shipment.`);
    }

    const returnNumber = `RET-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const returnOrder = await prisma.$transaction(async (tx) => {
      const created = await tx.returnOrder.create({
        data: {
          returnNumber,
          shipmentId: params.shipmentId,
          userId: params.userId,
          sellerId: shipment.sellerId,
          type: ReturnType.CUSTOMER_RETURN,
          status: ReturnStatus.REQUESTED,
          reason: params.reason,
          customerComment: params.comment || null,
        },
      });

      await tx.trackingEvent.create({
        data: {
          shipmentId: params.shipmentId,
          status: shipment.status,
          eventType: 'RETURN_REQUESTED',
          title: 'Return Requested',
          description: `Return request ${returnNumber} submitted: ${params.reason}`,
          isPublic: true,
          createdBy: params.userId,
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.RETURN_REQUESTED,
          userId: params.userId,
          details: { returnNumber, reason: params.reason, shipmentId: params.shipmentId },
        },
      });

      return created;
    });

    return returnOrder;
  }

  /**
   * Admin / Operations approves return and schedules reverse pickup
   */
  async approveReturn(returnId: string, adminUserId: string) {
    const returnOrder = await prisma.returnOrder.findUnique({
      where: { id: returnId },
      include: {
        shipment: { include: { addresses: true } },
      },
    });

    if (!returnOrder) throw new NotFoundError('Return order not found');
    if (returnOrder.status !== ReturnStatus.REQUESTED) {
      throw new BadRequestError(`Only REQUESTED returns can be approved. Current: '${returnOrder.status}'`);
    }

    const deliveryAddr = returnOrder.shipment.addresses.find((a) => a.type === 'DELIVERY');

    return await prisma.$transaction(async (tx) => {
      const updatedReturn = await tx.returnOrder.update({
        where: { id: returnOrder.id },
        data: {
          status: ReturnStatus.APPROVED,
          approvedAt: new Date(),
        },
      });

      // Update shipment status to reflect return process
      await tx.shipment.update({
        where: { id: returnOrder.shipmentId },
        data: { status: ShipmentStatus.RETURN_INITIATED },
      });

      await tx.trackingEvent.create({
        data: {
          shipmentId: returnOrder.shipmentId,
          status: ShipmentStatus.RETURN_INITIATED,
          eventType: 'RETURN_APPROVED',
          title: 'Return Request Approved',
          description: 'Reverse pickup will be dispatched to collect the item',
          city: deliveryAddr?.city,
          state: deliveryAddr?.state,
          isPublic: true,
          createdBy: adminUserId,
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.RETURN_APPROVED,
          userId: adminUserId,
          details: { returnId: returnOrder.id, returnNumber: returnOrder.returnNumber },
        },
      });

      return updatedReturn;
    });
  }

  /**
   * Admin / Operations rejects return
   */
  async rejectReturn(returnId: string, reason: string, adminUserId: string) {
    const returnOrder = await prisma.returnOrder.findUnique({ where: { id: returnId } });
    if (!returnOrder) throw new NotFoundError('Return order not found');

    const updated = await prisma.$transaction([
      prisma.returnOrder.update({
        where: { id: returnId },
        data: {
          status: ReturnStatus.REJECTED,
          rejectedAt: new Date(),
        },
      }),
      prisma.trackingEvent.create({
        data: {
          shipmentId: returnOrder.shipmentId,
          status: ShipmentStatus.DELIVERED,
          eventType: 'RETURN_REJECTED',
          title: 'Return Request Rejected',
          description: reason || 'Return request did not meet return policy criteria',
          isPublic: true,
          createdBy: adminUserId,
        },
      }),
    ]);

    return updated[0];
  }

  /**
   * Record warehouse inspection and trigger refund
   */
  async recordInspection(params: {
    returnId: string;
    status: InspectionStatus;
    condition: ItemCondition;
    notes?: string;
    inspectedBy: string;
  }) {
    const returnOrder = await prisma.returnOrder.findUnique({
      where: { id: params.returnId },
      include: { shipment: { include: { paymentOrders: true } } },
    });
    if (!returnOrder) throw new NotFoundError('Return order not found');

    return await prisma.$transaction(async (tx) => {
      const inspection = await tx.returnInspection.upsert({
        where: { returnOrderId: returnOrder.id },
        update: {
          status: params.status,
          condition: params.condition,
          notes: params.notes || null,
          inspectedBy: params.inspectedBy,
          inspectedAt: new Date(),
        },
        create: {
          returnOrderId: returnOrder.id,
          status: params.status,
          condition: params.condition,
          notes: params.notes || null,
          inspectedBy: params.inspectedBy,
          inspectedAt: new Date(),
        },
      });

      let nextReturnStatus: ReturnStatus = ReturnStatus.INSPECTION_COMPLETED;
      if (params.status === InspectionStatus.PASSED) {
        nextReturnStatus = ReturnStatus.REFUND_PENDING;
      } else if (params.status === InspectionStatus.FAILED) {
        nextReturnStatus = ReturnStatus.FAILED;
      }

      await tx.returnOrder.update({
        where: { id: returnOrder.id },
        data: { status: nextReturnStatus },
      });

      return inspection;
    });
  }

  /**
   * Operations initiates RTO (Return to Origin) on failed delivery
   */
  async initiateRTO(shipmentId: string, reason: string, adminUserId: string) {
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { addresses: true },
    });
    if (!shipment) throw new NotFoundError('Shipment not found');

    const returnNumber = `RTO-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    return await prisma.$transaction(async (tx) => {
      const rtoOrder = await tx.returnOrder.create({
        data: {
          returnNumber,
          shipmentId: shipment.id,
          userId: adminUserId,
          sellerId: shipment.sellerId,
          type: ReturnType.RTO,
          status: ReturnStatus.PICKUP_SCHEDULED,
          reason: ReturnReason.OTHER,
          customerComment: reason,
        },
      });

      await tx.shipment.update({
        where: { id: shipment.id },
        data: { status: ShipmentStatus.RETURN_INITIATED },
      });

      await tx.trackingEvent.create({
        data: {
          shipmentId: shipment.id,
          status: ShipmentStatus.RETURN_INITIATED,
          eventType: 'RTO_INITIATED',
          title: 'RTO (Return to Origin) Initiated',
          description: reason || 'Consignment undelivered after attempts. Returning to origin merchant hub.',
          isPublic: true,
          createdBy: adminUserId,
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.RTO_INITIATED,
          userId: adminUserId,
          details: { returnNumber, shipmentId: shipment.id, reason },
        },
      });

      return rtoOrder;
    });
  }

  /**
   * List Returns for Admin or Customer
   */
  async listReturns(query: {
    userId?: string;
    role?: string;
    page?: number;
    limit?: number;
    type?: ReturnType;
    status?: ReturnStatus;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 15));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.role === 'CUSTOMER' && query.userId) where.userId = query.userId;
    if (query.role === 'SELLER' && query.userId) where.sellerId = query.userId;
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      prisma.returnOrder.findMany({
        where,
        skip,
        take: limit,
        include: {
          shipment: { select: { trackingNumber: true, status: true, carrier: true } },
          user: { select: { name: true, email: true } },
          inspection: true,
          charges: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.returnOrder.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getReturnById(id: string) {
    const returnOrder = await prisma.returnOrder.findUnique({
      where: { id },
      include: {
        shipment: { include: { addresses: true, package: true } },
        user: { select: { name: true, email: true, phone: true } },
        seller: { select: { name: true, companyName: true } },
        inspection: true,
        charges: true,
        tasks: { include: { deliveryPartner: true } },
      },
    });

    if (!returnOrder) throw new NotFoundError('Return order not found');
    return returnOrder;
  }
}

export const returnsService = new ReturnsService();
