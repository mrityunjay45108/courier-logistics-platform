import { prisma } from '../../lib/prisma';
import { generateUniqueTrackingNumber } from './tracking-number.service';
import { validateShipmentTransition, canCancelShipment } from './shipment-state.service';
import { pricingService } from '../pricing/pricing.service';
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from '../../utils/errors';
import { webhookDispatcherService } from '../integrations/webhooks/webhook-dispatcher.service';
import { kafkaOutboxService, KAFKA_EVENT_TYPES } from '../../infrastructure/kafka';
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
  async createShipment(input: CreateShipmentInput, userId: string, role: string, correlationId?: string) {
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

      // Initial Shipping Label Metadata
      await tx.shippingLabel.create({
        data: {
          shipmentId: createdShipment.id,
          format: 'PDF',
          barcodeText: trackingNumber,
          metadata: {
            trackingNumber,
            consignor: {
              name: pickupName,
              phone: pickupPhone,
              city: pickupCity,
              state: pickupState,
              postalCode: pickupPostalCode,
            },
            consignee: {
              name: input.deliveryAddress.name,
              phone: input.deliveryAddress.phone,
              city: input.deliveryAddress.city,
              state: input.deliveryAddress.state,
              postalCode: input.deliveryAddress.postalCode,
            },
            package: {
              weight: input.package.weight,
              dimensions: `${input.package.length}x${input.package.width}x${input.package.height} cm`,
            },
            shipmentType: input.shipmentType,
            codAmount: input.codAmount,
            routingZone: quote.zone,
          },
        },
      });

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

      // Transactional Outbox Event (Kafka)
      const outboxRecord = await kafkaOutboxService.recordShipmentEvent(
        tx,
        {
          ...createdShipment,
          addresses: [
            { type: 'PICKUP', postalCode: pickupPostalCode },
            { type: 'DELIVERY', postalCode: input.deliveryAddress.postalCode },
          ],
        },
        KAFKA_EVENT_TYPES.SHIPMENT_CREATED,
        {
          correlationId,
          pickupPincode: pickupPostalCode,
          deliveryPincode: input.deliveryAddress.postalCode,
        }
      );

      return { createdShipment, outboxId: outboxRecord.id };
    });

    const fullShipment = await this.getShipmentById(shipment.createdShipment.id, userId, role);

    // Fast-path Kafka Outbox publication
    kafkaOutboxService.publishOutboxRecord(shipment.outboxId).catch((err) => {
      console.warn('Kafka outbox fast-path publish notice (queued for retry):', err.message);
    });

    // Dispatch outbound webhook for external E-Commerce integrations
    webhookDispatcherService.recordAndDispatch(
      'shipment.created',
      this.formatIntegrationResponse(fullShipment),
      isSeller ? userId : null
    );

    return fullShipment;
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
        label: true,
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
   * Format shipment as safe DTO for external E-Commerce integration
   */
  formatIntegrationResponse(shipment: any) {
    return {
      shipmentId: shipment.id,
      externalOrderId: shipment.externalOrderId || null,
      trackingNumber: shipment.trackingNumber,
      status: shipment.status,
      shipmentType: shipment.shipmentType,
      shippingCost: Number(shipment.shippingCost),
      codAmount: Number(shipment.codAmount),
      currency: shipment.currency,
      carrier: shipment.carrier,
      estimatedDelivery: shipment.deliveredAt || null,
      pickupStatus: shipment.pickup?.status || null,
      deliveryStatus: shipment.delivery?.status || null,
      label: shipment.label
        ? {
            format: shipment.label.format,
            url: shipment.label.url || null,
            barcodeText: shipment.label.barcodeText,
          }
        : null,
      createdAt: shipment.createdAt,
      updatedAt: shipment.updatedAt,
    };
  }

  /**
   * Get single shipment detail by externalOrderId with tenant isolation
   */
  async getByExternalOrderId(externalOrderId: string, userId: string, role: string, sellerId?: string | null) {
    const where: any = { externalOrderId: externalOrderId.trim() };

    // Strict tenant / role scoping
    if (sellerId) {
      where.sellerId = sellerId;
    } else if (role === 'SELLER') {
      where.sellerId = userId;
    } else if (role === 'CUSTOMER') {
      where.customerId = userId;
    }

    const shipment = await prisma.shipment.findFirst({
      where,
      include: {
        package: true,
        addresses: true,
        events: { orderBy: { createdAt: 'asc' } },
        pickup: { include: { attempts: true } },
        delivery: { include: { attempts: true } },
        proofOfDelivery: true,
        label: true,
        codOrder: true,
      },
    });

    if (!shipment) {
      throw new NotFoundError(`Shipment with external order ID '${externalOrderId}' not found`);
    }

    return shipment;
  }

  /**
   * Get single shipment detail by trackingNumber with tenant isolation
   */
  async getByTrackingNumber(trackingNumber: string, userId: string, role: string, sellerId?: string | null) {
    const where: any = { trackingNumber: trackingNumber.trim() };

    // Strict tenant / role scoping
    if (sellerId) {
      where.sellerId = sellerId;
    } else if (role === 'SELLER') {
      where.sellerId = userId;
    } else if (role === 'CUSTOMER') {
      where.customerId = userId;
    }

    const shipment = await prisma.shipment.findFirst({
      where,
      include: {
        package: true,
        addresses: true,
        events: { orderBy: { createdAt: 'asc' } },
        pickup: { include: { attempts: true } },
        delivery: { include: { attempts: true } },
        proofOfDelivery: true,
        label: true,
        codOrder: true,
      },
    });

    if (!shipment) {
      throw new NotFoundError(`Shipment with tracking number '${trackingNumber}' not found`);
    }

    return shipment;
  }

  /**
   * Get or generate shipping label metadata
   */
  async getShippingLabel(identifier: string, userId: string, role: string, sellerId?: string | null) {
    const where: any = {
      OR: [
        { id: identifier },
        { externalOrderId: identifier },
        { trackingNumber: identifier },
      ],
    };

    if (sellerId) {
      where.sellerId = sellerId;
    } else if (role === 'SELLER') {
      where.sellerId = userId;
    } else if (role === 'CUSTOMER') {
      where.customerId = userId;
    }

    const shipment = await prisma.shipment.findFirst({
      where,
      include: {
        addresses: true,
        package: true,
        label: true,
      },
    });

    if (!shipment) {
      throw new NotFoundError('Shipment not found or access denied');
    }

    if (shipment.label) {
      return {
        shipmentId: shipment.id,
        trackingNumber: shipment.trackingNumber,
        format: shipment.label.format,
        url: shipment.label.url || null,
        storageType: 'LABEL_METADATA_ONLY',
        barcodeText: shipment.label.barcodeText,
        metadata: shipment.label.metadata,
        createdAt: shipment.label.createdAt,
      };
    }

    const pickup = shipment.addresses.find((a) => a.type === ShipmentAddressType.PICKUP);
    const delivery = shipment.addresses.find((a) => a.type === ShipmentAddressType.DELIVERY);

    const createdLabel = await prisma.shippingLabel.create({
      data: {
        shipmentId: shipment.id,
        format: 'PDF',
        barcodeText: shipment.trackingNumber,
        metadata: {
          trackingNumber: shipment.trackingNumber,
          consignor: pickup ? { name: pickup.name, city: pickup.city, state: pickup.state, postalCode: pickup.postalCode } : null,
          consignee: delivery ? { name: delivery.name, city: delivery.city, state: delivery.state, postalCode: delivery.postalCode } : null,
          package: shipment.package ? { weight: shipment.package.weight } : null,
          shipmentType: shipment.shipmentType,
          codAmount: Number(shipment.codAmount),
        },
      },
    });

    return {
      shipmentId: shipment.id,
      trackingNumber: shipment.trackingNumber,
      format: createdLabel.format,
      url: createdLabel.url || null,
      storageType: 'LABEL_METADATA_ONLY',
      barcodeText: createdLabel.barcodeText,
      metadata: createdLabel.metadata,
      createdAt: createdLabel.createdAt,
    };
  }

  /**
   * Helper to map Prisma ShipmentStatus to permitted Kafka event type
   */
  private mapStatusToKafkaEventType(status: ShipmentStatus): string {
    switch (status) {
      case ShipmentStatus.CREATED:
        return KAFKA_EVENT_TYPES.SHIPMENT_CREATED;
      case ShipmentStatus.PICKUP_SCHEDULED:
        return KAFKA_EVENT_TYPES.SHIPMENT_PICKUP_SCHEDULED;
      case ShipmentStatus.PICKED_UP:
        return KAFKA_EVENT_TYPES.SHIPMENT_PICKED_UP;
      case ShipmentStatus.IN_TRANSIT:
        return KAFKA_EVENT_TYPES.SHIPMENT_IN_TRANSIT;
      case ShipmentStatus.OUT_FOR_DELIVERY:
        return KAFKA_EVENT_TYPES.SHIPMENT_OUT_FOR_DELIVERY;
      case ShipmentStatus.DELIVERED:
        return KAFKA_EVENT_TYPES.SHIPMENT_DELIVERED;
      case ShipmentStatus.FAILED_DELIVERY:
        return KAFKA_EVENT_TYPES.SHIPMENT_DELIVERY_FAILED;
      case ShipmentStatus.CANCELLED:
        return KAFKA_EVENT_TYPES.SHIPMENT_CANCELLED;
      case ShipmentStatus.RETURN_INITIATED:
        return KAFKA_EVENT_TYPES.SHIPMENT_RETURN_INITIATED;
      case ShipmentStatus.RETURNED:
        return KAFKA_EVENT_TYPES.SHIPMENT_RETURNED;
      default:
        return `shipment.${status.toLowerCase()}`;
    }
  }

  /**
   * Cancel an eligible shipment
   */
  async cancelShipment(id: string, userId: string, role: string, reason?: string, correlationId?: string) {
    const shipment = await this.getShipmentById(id, userId, role);

    if (!canCancelShipment(shipment.status)) {
      throw new BadRequestError(
        `Shipment cannot be cancelled in status '${shipment.status}'. Cancellation is only allowed before pickup.`
      );
    }

    const { outboxId } = await prisma.$transaction(async (tx) => {
      const updatedShipment = await tx.shipment.update({
        where: { id },
        data: {
          status: ShipmentStatus.CANCELLED,
          cancelledAt: new Date(),
        },
        include: { addresses: true },
      });

      await tx.trackingEvent.create({
        data: {
          shipmentId: id,
          status: ShipmentStatus.CANCELLED,
          eventType: 'CANCELLED',
          title: 'Shipment Cancelled',
          description: reason || 'Shipment cancelled by user request',
          isPublic: true,
          createdBy: userId,
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.SHIPMENT_CANCELLED,
          userId,
          details: { shipmentId: id, reason },
        },
      });

      // Transactional Kafka Outbox Event
      const outbox = await kafkaOutboxService.recordShipmentEvent(
        tx,
        updatedShipment,
        KAFKA_EVENT_TYPES.SHIPMENT_CANCELLED,
        {
          correlationId,
          notes: reason,
        }
      );

      return { outboxId: outbox.id };
    });

    const updated = await this.getShipmentById(id, userId, role);

    // Fast-path Kafka Outbox publication
    kafkaOutboxService.publishOutboxRecord(outboxId).catch((err) => {
      console.warn('Kafka outbox fast-path publish notice (queued for retry):', err.message);
    });

    // Dispatch cancellation webhook
    webhookDispatcherService.recordAndDispatch(
      'shipment.cancelled',
      this.formatIntegrationResponse(updated),
      shipment.sellerId
    );

    return updated;
  }

  /**
   * Admin/Operations: Update shipment status directly with state machine check
   */
  async updateStatus(
    id: string,
    newStatus: ShipmentStatus,
    adminUserId: string,
    description?: string,
    location?: string,
    correlationId?: string
  ) {
    const shipment = await prisma.shipment.findUnique({ where: { id } });
    if (!shipment) throw new NotFoundError('Shipment not found');

    validateShipmentTransition(shipment.status, newStatus);

    const { updated, outboxId } = await prisma.$transaction(async (tx) => {
      const updatedShipment = await tx.shipment.update({
        where: { id },
        data: {
          status: newStatus,
          ...(newStatus === ShipmentStatus.DELIVERED ? { deliveredAt: new Date() } : {}),
        },
        include: { events: true, label: true, pickup: true, delivery: true, addresses: true },
      });

      await tx.trackingEvent.create({
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
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.SHIPMENT_STATUS_CHANGED,
          userId: adminUserId,
          details: { from: shipment.status, to: newStatus, description },
        },
      });

      // Transactional Kafka Outbox Event
      const eventType = this.mapStatusToKafkaEventType(newStatus);
      const outbox = await kafkaOutboxService.recordShipmentEvent(
        tx,
        updatedShipment,
        eventType,
        {
          correlationId,
          notes: description,
        }
      );

      return { updated: updatedShipment, outboxId: outbox.id };
    });

    // Fast-path Kafka Outbox publication
    kafkaOutboxService.publishOutboxRecord(outboxId).catch((err) => {
      console.warn('Kafka outbox fast-path publish notice (queued for retry):', err.message);
    });

    // Dispatch status change webhook
    if (updated) {
      webhookDispatcherService.recordAndDispatch(
        `shipment.${newStatus.toLowerCase()}`,
        this.formatIntegrationResponse(updated),
        shipment.sellerId
      );
    }

    return updated;
  }
}

export const shipmentsService = new ShipmentsService();
