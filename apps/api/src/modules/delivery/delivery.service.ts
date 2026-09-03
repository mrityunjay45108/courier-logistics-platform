import { prisma } from '../../lib/prisma';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import {
  DeliveryStatus,
  DeliveryAttemptStatus,
  ShipmentStatus,
  ProofOfDeliveryType,
  ExceptionType,
  ExceptionSeverity,
  ExceptionStatus,
} from '@prisma/client';

export class DeliveryService {
  async scheduleDelivery(params: {
    shipmentId: string;
    scheduledDate: string | Date;
    timeSlotStart?: string;
    timeSlotEnd?: string;
    instructions?: string;
    userId: string;
  }) {
    const shipment = await prisma.shipment.findUnique({
      where: { id: params.shipmentId },
      include: { addresses: true, delivery: true },
    });
    if (!shipment) throw new NotFoundError('Shipment not found');

    const deliveryAddr = shipment.addresses.find((a) => a.type === 'DELIVERY');
    if (!deliveryAddr) throw new BadRequestError('Shipment is missing delivery address.');

    const dateObj = new Date(params.scheduledDate);

    const delivery = await prisma.$transaction(async (tx) => {
      const created = await tx.delivery.upsert({
        where: { shipmentId: params.shipmentId },
        update: {
          scheduledDate: dateObj,
          timeSlotStart: params.timeSlotStart || '09:00',
          timeSlotEnd: params.timeSlotEnd || '18:00',
          instructions: params.instructions || null,
          status: DeliveryStatus.SCHEDULED,
        },
        create: {
          shipmentId: params.shipmentId,
          scheduledDate: dateObj,
          timeSlotStart: params.timeSlotStart || '09:00',
          timeSlotEnd: params.timeSlotEnd || '18:00',
          instructions: params.instructions || null,
          recipientName: deliveryAddr.name,
          recipientPhone: deliveryAddr.phone,
          status: DeliveryStatus.SCHEDULED,
        },
      });

      await tx.shipment.update({
        where: { id: params.shipmentId },
        data: { status: ShipmentStatus.OUT_FOR_DELIVERY },
      });

      await tx.trackingEvent.create({
        data: {
          shipmentId: params.shipmentId,
          status: ShipmentStatus.OUT_FOR_DELIVERY,
          eventType: 'OUT_FOR_DELIVERY',
          title: 'Out for Delivery',
          description: `Shipment is scheduled out for delivery on ${dateObj.toISOString().split('T')[0]}`,
          city: deliveryAddr.city,
          state: deliveryAddr.state,
          isPublic: true,
          createdBy: params.userId,
        },
      });

      return created;
    });

    return delivery;
  }

  async recordAttempt(params: {
    deliveryId: string;
    status: DeliveryAttemptStatus;
    failureReason?: string;
    notes?: string;
    recipientName?: string;
    recipientRelation?: string;
    podType?: ProofOfDeliveryType;
    podReference?: string;
    userId: string;
  }) {
    const delivery = await prisma.delivery.findUnique({
      where: { id: params.deliveryId },
      include: { shipment: { include: { addresses: true } } },
    });
    if (!delivery) throw new NotFoundError('Delivery not found');

    const nextAttempt = delivery.attemptCount + 1;
    const isSuccess = params.status === DeliveryAttemptStatus.SUCCESS;
    const deliveryAddr = delivery.shipment.addresses.find((a) => a.type === 'DELIVERY');

    return await prisma.$transaction(async (tx) => {
      const attempt = await tx.deliveryAttempt.create({
        data: {
          deliveryId: delivery.id,
          attemptNumber: nextAttempt,
          status: params.status,
          failureReason: params.failureReason || null,
          notes: params.notes || null,
        },
      });

      if (isSuccess) {
        // Create POD
        await tx.proofOfDelivery.create({
          data: {
            shipmentId: delivery.shipmentId,
            deliveryAttemptId: attempt.id,
            type: params.podType || ProofOfDeliveryType.RECIPIENT_CONFIRMATION,
            reference: params.podReference || null,
            recipientName: params.recipientName || delivery.recipientName,
            recipientRelation: params.recipientRelation || 'SELF',
            notes: params.notes || null,
          },
        });

        await tx.delivery.update({
          where: { id: delivery.id },
          data: {
            status: DeliveryStatus.DELIVERED,
            attemptCount: nextAttempt,
            completedAt: new Date(),
          },
        });

        await tx.shipment.update({
          where: { id: delivery.shipmentId },
          data: {
            status: ShipmentStatus.DELIVERED,
            deliveredAt: new Date(),
          },
        });

        await tx.trackingEvent.create({
          data: {
            shipmentId: delivery.shipmentId,
            status: ShipmentStatus.DELIVERED,
            eventType: 'DELIVERED',
            title: 'Delivered Successfully',
            description: `Delivered to ${params.recipientName || delivery.recipientName}`,
            city: deliveryAddr?.city,
            state: deliveryAddr?.state,
            isPublic: true,
            createdBy: params.userId,
          },
        });
      } else {
        const newStatus = nextAttempt >= 3 ? DeliveryStatus.FAILED : DeliveryStatus.ATTEMPTED;

        await tx.delivery.update({
          where: { id: delivery.id },
          data: {
            status: newStatus,
            attemptCount: nextAttempt,
            failedAt: newStatus === DeliveryStatus.FAILED ? new Date() : null,
          },
        });

        await tx.shipment.update({
          where: { id: delivery.shipmentId },
          data: { status: ShipmentStatus.FAILED_DELIVERY },
        });

        // Create exception if failed 2 or more times
        if (nextAttempt >= 2) {
          await tx.shipmentException.create({
            data: {
              shipmentId: delivery.shipmentId,
              type: ExceptionType.DELIVERY_FAILED,
              severity: ExceptionSeverity.HIGH,
              status: ExceptionStatus.OPEN,
              title: `Delivery Failure - Attempt #${nextAttempt}`,
              description: params.failureReason || 'Repeated delivery failure at recipient address',
              source: 'DELIVERY_SERVICE',
            },
          });
        }

        await tx.trackingEvent.create({
          data: {
            shipmentId: delivery.shipmentId,
            status: ShipmentStatus.FAILED_DELIVERY,
            eventType: 'DELIVERY_ATTEMPTED',
            title: `Delivery Attempt #${nextAttempt} Failed`,
            description: params.failureReason || 'Delivery could not be completed',
            city: deliveryAddr?.city,
            state: deliveryAddr?.state,
            isPublic: true,
            createdBy: params.userId,
          },
        });
      }

      return await tx.delivery.findUnique({
        where: { id: delivery.id },
        include: { attempts: true },
      });
    });
  }

  async listDeliveries(query: { page?: number; limit?: number; status?: DeliveryStatus }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        skip,
        take: limit,
        include: {
          shipment: {
            select: {
              trackingNumber: true,
              status: true,
              carrier: true,
              codAmount: true,
              proofOfDelivery: true,
            },
          },
          attempts: { orderBy: { attemptedAt: 'desc' }, take: 1 },
        },
        orderBy: { scheduledDate: 'desc' },
      }),
      prisma.delivery.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}

export const deliveryService = new DeliveryService();
