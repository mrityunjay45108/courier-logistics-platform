import { prisma } from '../../lib/prisma';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../utils/errors';
import {
  PickupStatus,
  PickupAttemptStatus,
  ShipmentStatus,
  AuditAction,
  PickupType,
} from '@prisma/client';

export class PickupService {
  async schedulePickup(params: {
    shipmentId: string;
    scheduledDate: string | Date;
    timeSlotStart: string;
    timeSlotEnd: string;
    instructions?: string;
    userId: string;
    role: string;
    pickupType?: PickupType;
    returnOrderId?: string;
  }) {
    const shipment = await prisma.shipment.findUnique({
      where: { id: params.shipmentId },
      include: { addresses: true, pickup: true },
    });

    if (!shipment) throw new NotFoundError('Shipment not found');

    if (params.role === 'CUSTOMER' && shipment.customerId !== params.userId) {
      throw new ForbiddenError('Access denied');
    }
    if (params.role === 'SELLER' && shipment.sellerId !== params.userId) {
      throw new ForbiddenError('Access denied');
    }

    if (shipment.pickup) {
      throw new BadRequestError('A pickup is already scheduled for this consignment.');
    }

    const pickupAddr = shipment.addresses.find((a) => a.type === 'PICKUP');
    if (!pickupAddr) throw new BadRequestError('Shipment is missing pickup address details.');

    const dateObj = new Date(params.scheduledDate);

    const pickup = await prisma.$transaction(async (tx) => {
      const createdPickup = await tx.pickup.create({
        data: {
          shipmentId: params.shipmentId,
          pickupType: params.pickupType || PickupType.FORWARD_PICKUP,
          returnOrderId: params.returnOrderId || null,
          scheduledDate: dateObj,
          timeSlotStart: params.timeSlotStart,
          timeSlotEnd: params.timeSlotEnd,
          instructions: params.instructions || null,
          contactName: pickupAddr.name,
          contactPhone: pickupAddr.phone,
          status: PickupStatus.SCHEDULED,
        },
      });

      await tx.shipment.update({
        where: { id: params.shipmentId },
        data: { status: ShipmentStatus.PICKUP_SCHEDULED },
      });

      await tx.trackingEvent.create({
        data: {
          shipmentId: params.shipmentId,
          status: ShipmentStatus.PICKUP_SCHEDULED,
          eventType: 'PICKUP_SCHEDULED',
          title: 'Pickup Scheduled',
          description: `Pickup window scheduled for ${dateObj.toISOString().split('T')[0]} (${params.timeSlotStart} - ${params.timeSlotEnd})`,
          city: pickupAddr.city,
          state: pickupAddr.state,
          isPublic: true,
          createdBy: params.userId,
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.PICKUP_CREATED,
          userId: params.userId,
          details: { shipmentId: params.shipmentId, pickupId: createdPickup.id },
        },
      });

      return createdPickup;
    });

    return pickup;
  }

  async reschedulePickup(params: {
    pickupId: string;
    newDate: string | Date;
    newStart: string;
    newEnd: string;
    reason?: string;
    userId: string;
  }) {
    const pickup = await prisma.pickup.findUnique({
      where: { id: params.pickupId },
      include: { shipment: true },
    });
    if (!pickup) throw new NotFoundError('Pickup not found');

    const newDateObj = new Date(params.newDate);

    await prisma.$transaction([
      prisma.pickupScheduleHistory.create({
        data: {
          pickupId: pickup.id,
          previousDate: pickup.scheduledDate,
          previousStart: pickup.timeSlotStart,
          previousEnd: pickup.timeSlotEnd,
          newDate: newDateObj,
          newStart: params.newStart,
          newEnd: params.newEnd,
          reason: params.reason || null,
          changedBy: params.userId,
        },
      }),
      prisma.pickup.update({
        where: { id: pickup.id },
        data: {
          scheduledDate: newDateObj,
          timeSlotStart: params.newStart,
          timeSlotEnd: params.newEnd,
          status: PickupStatus.RESCHEDULED,
        },
      }),
      prisma.trackingEvent.create({
        data: {
          shipmentId: pickup.shipmentId,
          status: ShipmentStatus.PICKUP_SCHEDULED,
          eventType: 'RESCHEDULED',
          title: 'Pickup Rescheduled',
          description: `Pickup rescheduled to ${newDateObj.toISOString().split('T')[0]} (${params.newStart} - ${params.newEnd}). ${params.reason || ''}`,
          isPublic: true,
          createdBy: params.userId,
        },
      }),
    ]);

    return await prisma.pickup.findUnique({
      where: { id: pickup.id },
      include: { attempts: true, scheduleHistory: true },
    });
  }

  async recordAttempt(params: {
    pickupId: string;
    status: PickupAttemptStatus;
    failureReason?: string;
    notes?: string;
    userId: string;
  }) {
    const pickup = await prisma.pickup.findUnique({
      where: { id: params.pickupId },
      include: { shipment: true },
    });
    if (!pickup) throw new NotFoundError('Pickup not found');

    const nextAttemptNumber = pickup.attemptCount + 1;
    const isSuccess = params.status === PickupAttemptStatus.SUCCESS;

    return await prisma.$transaction(async (tx) => {
      await tx.pickupAttempt.create({
        data: {
          pickupId: pickup.id,
          attemptNumber: nextAttemptNumber,
          status: params.status,
          failureReason: params.failureReason || null,
          notes: params.notes || null,
        },
      });

      let newPickupStatus: PickupStatus = isSuccess ? PickupStatus.PICKED_UP : PickupStatus.ATTEMPTED;
      if (!isSuccess && nextAttemptNumber >= 3) {
        newPickupStatus = PickupStatus.FAILED;
      }

      await tx.pickup.update({
        where: { id: pickup.id },
        data: {
          status: newPickupStatus,
          attemptCount: nextAttemptNumber,
          completedAt: isSuccess ? new Date() : null,
        },
      });

      if (isSuccess) {
        await tx.shipment.update({
          where: { id: pickup.shipmentId },
          data: { status: ShipmentStatus.PICKED_UP },
        });

        await tx.trackingEvent.create({
          data: {
            shipmentId: pickup.shipmentId,
            status: ShipmentStatus.PICKED_UP,
            eventType: 'PICKED_UP',
            title: 'Package Picked Up',
            description: 'Package successfully picked up from sender location',
            isPublic: true,
            createdBy: params.userId,
          },
        });
      } else {
        await tx.trackingEvent.create({
          data: {
            shipmentId: pickup.shipmentId,
            status: pickup.shipment.status,
            eventType: 'PICKUP_ATTEMPTED',
            title: `Pickup Attempt ${nextAttemptNumber} Failed`,
            description: params.failureReason || 'Pickup could not be completed at scheduled time',
            isPublic: true,
            createdBy: params.userId,
          },
        });
      }

      return await tx.pickup.findUnique({
        where: { id: pickup.id },
        include: { attempts: true },
      });
    });
  }

  async listPickups(query: { page?: number; limit?: number; status?: PickupStatus }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      prisma.pickup.findMany({
        where,
        skip,
        take: limit,
        include: {
          shipment: { select: { trackingNumber: true, status: true, carrier: true } },
          attempts: { orderBy: { attemptedAt: 'desc' }, take: 1 },
        },
        orderBy: { scheduledDate: 'desc' },
      }),
      prisma.pickup.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}

export const pickupService = new PickupService();
