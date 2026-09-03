import { prisma } from '../../lib/prisma';
import { generateUniqueTrackingNumber } from './tracking-number.service';
import { validateShipmentTransition, canCancelShipment } from './shipment-state.service';
import { pricingService } from '../pricing/pricing.service';
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from '../../utils/errors';
import type { CreateShipmentInput } from '@courier/shared';
import {
  ShipmentStatus,
  ShipmentType,
  ShipmentAddressType,
  AuditAction,
  CODOrderStatus,
  Role,
  Prisma,
} from '@prisma/client';

export class ShipmentsService {
  /**
   * Create a new shipment booking with package and address snapshots
   */
  async createShipment(input: CreateShipmentInput, userId: string, role: string) {
    // 1. Resolve Pickup Address Details
    let pickupName = '';
    let pickupPhone = '';
    let pickupLine1 = '';
    let pickupLine2: string | undefined = undefined;
    let pickupCity = '';
    let pickupState = '';
    let pickupPostalCode = '';
    let pickupCountry = 'India';
    let pickupLandmark: string | undefined = undefined;

    if (input.pickupAddressId) {
      const savedAddress = await prisma.address.findFirst({
        where: { id: input.pickupAddressId, userId },
      });
      if (!savedAddress) {
        throw new NotFoundError('Saved pickup address not found');
      }
      pickupName = savedAddress.name;
      pickupPhone = savedAddress.phone;
      pickupLine1 = savedAddress.addressLine1;
      pickupLine2 = savedAddress.addressLine2 || undefined;
      pickupCity = savedAddress.city;
      pickupState = savedAddress.state;
      pickupPostalCode = savedAddress.postalCode;
      pickupCountry = savedAddress.country;
      pickupLandmark = savedAddress.landmark || undefined;
    } else if (input.pickupAddress) {
      pickupName = input.pickupAddress.name;
      pickupPhone = input.pickupAddress.phone;
      pickupLine1 = input.pickupAddress.addressLine1;
      pickupLine2 = input.pickupAddress.addressLine2;
      pickupCity = input.pickupAddress.city;
      pickupState = input.pickupAddress.state;
      pickupPostalCode = input.pickupAddress.postalCode;
      pickupCountry = input.pickupAddress.country || 'India';
      pickupLandmark = input.pickupAddress.landmark;
    } else {
      throw new BadRequestError('Pickup address details are required');
    }

    // 2. Server-side Authoritative Pricing Calculation
    const quote = await pricingService.calculateQuote(
      {
        pickupPincode: pickupPostalCode,
        deliveryPincode: input.deliveryAddress.postalCode,
        shipmentType: input.shipmentType as ShipmentType,
        weight: input.package.weight,
        length: input.package.length,
        width: input.package.width,
        height: input.package.height,
        codAmount: input.codAmount,
      },
      userId
    );

    const trackingNumber = await generateUniqueTrackingNumber();
    const isSeller = role === 'SELLER';

    // 3. Atomic Database Transaction
    const shipment = await prisma.$transaction(async (tx) => {
      const createdShipment = await tx.shipment.create({
        data: {
          trackingNumber,
          externalOrderId: input.externalOrderId || null,
          customerId: isSeller ? null : userId,
          sellerId: isSeller ? userId : null,
          status: ShipmentStatus.CREATED,
          shipmentType: input.shipmentType as ShipmentType,
          shippingCost: new Prisma.Decimal(quote.total),
          codAmount: new Prisma.Decimal(input.shipmentType === 'COD' ? input.codAmount : 0),
          currency: quote.currency,
          notes: input.notes || null,
          carrier: 'Apex Express Logistics',
        },
      });

      // Immutable Package Record
      await tx.shipmentPackage.create({
        data: {
          shipmentId: createdShipment.id,
          weight: input.package.weight,
          length: input.package.length,
          width: input.package.width,
          height: input.package.height,
          quantity: input.package.quantity,
          packageType: input.package.packageType,
          description: input.package.description || null,
        },
      });

      // Immutable Pickup Address Snapshot
      await tx.shipmentAddress.create({
        data: {
          shipmentId: createdShipment.id,
          type: ShipmentAddressType.PICKUP,
          name: pickupName,
          phone: pickupPhone,
          addressLine1: pickupLine1,
          addressLine2: pickupLine2 || null,
          city: pickupCity,
          state: pickupState,
          postalCode: pickupPostalCode,
          country: pickupCountry,
          landmark: pickupLandmark || null,
        },
      });

      // Immutable Delivery Address Snapshot
      await tx.shipmentAddress.create({
        data: {
          shipmentId: createdShipment.id,
          type: ShipmentAddressType.DELIVERY,
          name: input.deliveryAddress.name,
          phone: input.deliveryAddress.phone,
          addressLine1: input.deliveryAddress.addressLine1,
          addressLine2: input.deliveryAddress.addressLine2 || null,
          city: input.deliveryAddress.city,
          state: input.deliveryAddress.state,
          postalCode: input.deliveryAddress.postalCode,
          country: input.deliveryAddress.country || 'India',
          landmark: input.deliveryAddress.landmark || null,
        },
      });

      // Initial Milestone Event
      await tx.trackingEvent.create({
        data: {
          shipmentId: createdShipment.id,
          status: ShipmentStatus.CREATED,
          eventType: 'SHIPMENT_CREATED',
          title: 'Shipment Created',
          description: `Consignment created and label generated (${quote.zone})`,
          city: pickupCity,
          state: pickupState,
          isPublic: true,
          createdBy: userId,
        },
      });

      // If COD, initialize COD order
      if (input.shipmentType === 'COD') {
        await tx.cODOrder.create({
          data: {
            shipmentId: createdShipment.id,
            customerId: isSeller ? userId : userId,
            sellerId: isSeller ? userId : null,
            codAmount: new Prisma.Decimal(input.codAmount),
            outstandingAmount: new Prisma.Decimal(input.codAmount),
            status: CODOrderStatus.PENDING,
          },
        });
      }

      // Audit Log
      await tx.auditLog.create({
        data: {
          action: AuditAction.SHIPMENT_CREATED,
          userId,
          details: {
            shipmentId: createdShipment.id,
            trackingNumber,
            totalCost: quote.total,
            shipmentType: input.shipmentType,
          },
        },
      });

      return createdShipment;
    });

    return await this.getShipmentById(shipment.id, userId, role);
  }

  /**
   * List shipments with role-based scoping and filtering
   */
  async listShipments(params: {
    userId: string;
    role: string;
    page?: number;
    limit?: number;
    search?: string;
    status?: ShipmentStatus;
    shipmentType?: ShipmentType;
    startDate?: string;
    endDate?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 15));
    const skip = (page - 1) * limit;

    const where: any = {};

    // Role scoping
    if (params.role === 'CUSTOMER') {
      where.customerId = params.userId;
    } else if (params.role === 'SELLER') {
      where.sellerId = params.userId;
    } else if (params.role === 'DELIVERY_PARTNER') {
      where.tasks = {
        some: {
          deliveryPartner: { userId: params.userId },
        },
      };
    }
    // ADMIN and OPERATIONS can see all shipments

    if (params.status) where.status = params.status;
    if (params.shipmentType) where.shipmentType = params.shipmentType;

    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = new Date(params.startDate);
      if (params.endDate) where.createdAt.lte = new Date(params.endDate);
    }

    if (params.search) {
      where.OR = [
        { trackingNumber: { contains: params.search, mode: 'insensitive' } },
        { externalOrderId: { contains: params.search, mode: 'insensitive' } },
        {
          addresses: {
            some: {
              OR: [
                { name: { contains: params.search, mode: 'insensitive' } },
                { city: { contains: params.search, mode: 'insensitive' } },
                { postalCode: { contains: params.search } },
              ],
            },
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.shipment.findMany({
        where,
        skip,
        take: limit,
        include: {
          package: true,
          addresses: true,
          pickup: true,
          delivery: true,
          events: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.shipment.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single shipment detail by ID with RBAC check
   */
  async getShipmentById(id: string, userId: string, role: string) {
    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: {
        package: true,
        addresses: true,
        events: { orderBy: { createdAt: 'asc' } },
        pickup: { include: { attempts: true } },
        delivery: { include: { attempts: true } },
        proofOfDelivery: true,
        tasks: { include: { deliveryPartner: true } },
        exceptions: true,
        codOrder: true,
        paymentOrders: true,
        returnOrders: true,
      },
    });

    if (!shipment) {
      throw new NotFoundError('Shipment not found');
    }

    // Role-based access verification
    if (role === 'CUSTOMER' && shipment.customerId !== userId) {
      throw new ForbiddenError('You do not have permission to view this shipment.');
    }
    if (role === 'SELLER' && shipment.sellerId !== userId) {
      throw new ForbiddenError('You do not have permission to view this shipment.');
    }

    return shipment;
  }

  /**
   * Cancel an eligible shipment
   */
  async cancelShipment(id: string, userId: string, role: string, reason?: string) {
    const shipment = await this.getShipmentById(id, userId, role);

    if (!canCancelShipment(shipment.status)) {
      throw new BadRequestError(
        `Shipment cannot be cancelled in status '${shipment.status}'. Cancellation is only allowed before pickup.`
      );
    }

    await prisma.$transaction([
      prisma.shipment.update({
        where: { id },
        data: {
          status: ShipmentStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      }),
      prisma.trackingEvent.create({
        data: {
          shipmentId: id,
          status: ShipmentStatus.CANCELLED,
          eventType: 'CANCELLED',
          title: 'Shipment Cancelled',
          description: reason || 'Shipment cancelled by user request',
          isPublic: true,
          createdBy: userId,
        },
      }),
      prisma.auditLog.create({
        data: {
          action: AuditAction.SHIPMENT_CANCELLED,
          userId,
          details: { shipmentId: id, reason },
        },
      }),
    ]);

    return await this.getShipmentById(id, userId, role);
  }

  /**
   * Admin/Operations: Update shipment status directly with state machine check
   */
  async updateStatus(
    id: string,
    newStatus: ShipmentStatus,
    adminUserId: string,
    description?: string,
    location?: string
  ) {
    const shipment = await prisma.shipment.findUnique({ where: { id } });
    if (!shipment) throw new NotFoundError('Shipment not found');

    validateShipmentTransition(shipment.status, newStatus);

    await prisma.$transaction([
      prisma.shipment.update({
        where: { id },
        data: {
          status: newStatus,
          ...(newStatus === ShipmentStatus.DELIVERED ? { deliveredAt: new Date() } : {}),
        },
      }),
      prisma.trackingEvent.create({
        data: {
          shipmentId: id,
          status: newStatus,
          eventType: newStatus as any,
          title: `Status: ${newStatus.replace(/_/g, ' ')}`,
          description: description || `Shipment transitioned to ${newStatus}`,
          location,
          isPublic: true,
          createdBy: adminUserId,
        },
      }),
      prisma.auditLog.create({
        data: {
          action: AuditAction.SHIPMENT_STATUS_CHANGED,
          userId: adminUserId,
          details: { from: shipment.status, to: newStatus, description },
        },
      }),
    ]);

    return await prisma.shipment.findUnique({ where: { id }, include: { events: true } });
  }
}

export const shipmentsService = new ShipmentsService();
