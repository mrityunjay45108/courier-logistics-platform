import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../utils/errors';
import { hashPassword } from '../../lib/password';
import {
  AvailabilityStatus,
  PartnerStatus,
  TaskStatus,
  TaskType,
  ShipmentStatus,
  PickupStatus,
  DeliveryStatus,
  Role,
  AuditAction,
  ProofOfDeliveryType,
} from '@prisma/client';

export class DeliveryPartnersService {
  /**
   * Get delivery partner profile by associated user ID
   */
  async getPartnerByUserId(userId: string) {
    const partner = await prisma.deliveryPartner.findUnique({
      where: { userId },
      include: {
        serviceZone: true,
        _count: {
          select: {
            tasks: { where: { status: { in: [TaskStatus.ASSIGNED, TaskStatus.ACCEPTED, TaskStatus.STARTED] } } },
          },
        },
      },
    });

    if (!partner) throw new NotFoundError('Delivery partner profile not found');
    return partner;
  }

  /**
   * Rider updates own availability status
   */
  async updateAvailability(userId: string, availabilityStatus: AvailabilityStatus) {
    const partner = await this.getPartnerByUserId(userId);

    const updated = await prisma.deliveryPartner.update({
      where: { id: partner.id },
      data: { availabilityStatus },
    });

    return updated;
  }

  /**
   * Rider views assigned tasks
   */
  async listPartnerTasks(params: {
    userId: string;
    page?: number;
    limit?: number;
    status?: TaskStatus;
    taskType?: TaskType;
  }) {
    const partner = await this.getPartnerByUserId(params.userId);

    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 15));
    const skip = (page - 1) * limit;

    const where: any = { deliveryPartnerId: partner.id };
    if (params.status) where.status = params.status;
    if (params.taskType) where.taskType = params.taskType;

    const [items, total] = await Promise.all([
      prisma.deliveryTask.findMany({
        where,
        skip,
        take: limit,
        include: {
          shipment: {
            include: {
              package: true,
              addresses: true,
              pickup: true,
              delivery: true,
              codOrder: true,
            },
          },
          returnOrder: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.deliveryTask.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Task transition helper: Accept, Reject, Start, Complete
   */
  async updateTaskStatus(params: {
    taskId: string;
    userId: string;
    targetStatus: TaskStatus;
    rejectionReason?: string;
    notes?: string;
    podRecipientName?: string;
  }) {
    const partner = await this.getPartnerByUserId(params.userId);

    const task = await prisma.deliveryTask.findFirst({
      where: { id: params.taskId, deliveryPartnerId: partner.id },
      include: {
        shipment: { include: { addresses: true, delivery: true, pickup: true } },
      },
    });

    if (!task) throw new NotFoundError('Task not found or not assigned to you');

    return await prisma.$transaction(async (tx) => {
      const updateData: any = { status: params.targetStatus };
      if (params.targetStatus === TaskStatus.ACCEPTED) updateData.acceptedAt = new Date();
      if (params.targetStatus === TaskStatus.STARTED) updateData.startedAt = new Date();
      if (params.targetStatus === TaskStatus.COMPLETED) updateData.completedAt = new Date();
      if (params.targetStatus === TaskStatus.REJECTED) {
        updateData.rejectedAt = new Date();
        updateData.rejectionReason = params.rejectionReason || null;
      }

      await tx.deliveryTask.update({
        where: { id: task.id },
        data: updateData,
      });

      await tx.deliveryTaskEvent.create({
        data: {
          taskId: task.id,
          eventType: params.targetStatus,
          description: `Task status changed to ${params.targetStatus}`,
          createdBy: params.userId,
        },
      });

      // Handle business completion logic
      if (params.targetStatus === TaskStatus.COMPLETED) {
        if (task.taskType === TaskType.PICKUP) {
          await tx.shipment.update({
            where: { id: task.shipmentId },
            data: { status: ShipmentStatus.PICKED_UP },
          });
          if (task.shipment.pickup) {
            await tx.pickup.update({
              where: { id: task.shipment.pickup.id },
              data: { status: PickupStatus.PICKED_UP, completedAt: new Date() },
            });
          }
          await tx.trackingEvent.create({
            data: {
              shipmentId: task.shipmentId,
              status: ShipmentStatus.PICKED_UP,
              eventType: 'PICKED_UP',
              title: 'Picked Up by Rider',
              description: `Collected by partner ${partner.fullName}`,
              createdBy: params.userId,
            },
          });
        } else if (task.taskType === TaskType.DELIVERY) {
          await tx.shipment.update({
            where: { id: task.shipmentId },
            data: { status: ShipmentStatus.DELIVERED, deliveredAt: new Date() },
          });
          if (task.shipment.delivery) {
            await tx.delivery.update({
              where: { id: task.shipment.delivery.id },
              data: { status: DeliveryStatus.DELIVERED, completedAt: new Date() },
            });
          }
          const deliveryAddr = task.shipment.addresses.find((a) => a.type === 'DELIVERY');
          await tx.proofOfDelivery.create({
            data: {
              shipmentId: task.shipmentId,
              type: ProofOfDeliveryType.RECIPIENT_CONFIRMATION,
              recipientName: params.podRecipientName || deliveryAddr?.name || 'Recipient',
              recipientRelation: 'SELF',
            },
          });
          await tx.trackingEvent.create({
            data: {
              shipmentId: task.shipmentId,
              status: ShipmentStatus.DELIVERED,
              eventType: 'DELIVERED',
              title: 'Delivered by Rider',
              description: `Handed over by partner ${partner.fullName}`,
              createdBy: params.userId,
            },
          });
        }
      }

      return await tx.deliveryTask.findUnique({
        where: { id: task.id },
        include: { shipment: true, events: true },
      });
    });
  }

  // --- ADMIN OPERATIONS ---

  async listAllPartners(query: { status?: PartnerStatus; availability?: AvailabilityStatus }) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.availability) where.availabilityStatus = query.availability;

    return await prisma.deliveryPartner.findMany({
      where,
      include: {
        serviceZone: true,
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async assignTask(params: {
    shipmentId: string;
    deliveryPartnerId: string;
    taskType: TaskType;
    returnOrderId?: string;
    notes?: string;
    adminUserId: string;
  }) {
    const partner = await prisma.deliveryPartner.findUnique({
      where: { id: params.deliveryPartnerId },
    });
    if (!partner || partner.status !== PartnerStatus.ACTIVE) {
      throw new BadRequestError('Selected partner is not active or available for tasks');
    }

    // Check if duplicate active task exists
    const activeTask = await prisma.deliveryTask.findFirst({
      where: {
        shipmentId: params.shipmentId,
        taskType: params.taskType,
        status: { in: [TaskStatus.ASSIGNED, TaskStatus.ACCEPTED, TaskStatus.STARTED] },
      },
    });

    if (activeTask) {
      throw new BadRequestError(`An active ${params.taskType} task already exists for this shipment.`);
    }

    const taskNumber = `TSK-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const createdTask = await prisma.$transaction(async (tx) => {
      const task = await tx.deliveryTask.create({
        data: {
          taskNumber,
          shipmentId: params.shipmentId,
          deliveryPartnerId: params.deliveryPartnerId,
          returnOrderId: params.returnOrderId || null,
          taskType: params.taskType,
          status: TaskStatus.ASSIGNED,
          notes: params.notes || null,
        },
      });

      await tx.deliveryTaskEvent.create({
        data: {
          taskId: task.id,
          eventType: TaskStatus.ASSIGNED,
          description: `Task assigned to partner ${partner.fullName} (${partner.partnerCode})`,
          createdBy: params.adminUserId,
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.TASK_ASSIGNED,
          userId: params.adminUserId,
          details: { taskId: task.id, partnerId: partner.id, shipmentId: params.shipmentId },
        },
      });

      return task;
    });

    return createdTask;
  }
}

export const deliveryPartnersService = new DeliveryPartnersService();
