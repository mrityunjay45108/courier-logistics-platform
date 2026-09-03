import { prisma } from '../../lib/prisma';
import { NotFoundError } from '../../utils/errors';
import { trackingPublisher, TRACKING_EVENT } from './tracking-publisher';
import type { PublicTrackingResponse, TrackingEventType } from '@courier/types';
import { ShipmentStatus, ShipmentAddressType } from '@prisma/client';

export class TrackingService {
  /**
   * Centralized method to record tracking milestone events and notify SSE stream listeners
   */
  async recordEvent(params: {
    shipmentId: string;
    status: ShipmentStatus;
    eventType: TrackingEventType;
    title: string;
    description: string;
    location?: string;
    city?: string;
    state?: string;
    isPublic?: boolean;
    metadata?: Record<string, unknown>;
    createdBy?: string;
  }) {
    const event = await prisma.trackingEvent.create({
      data: {
        shipmentId: params.shipmentId,
        status: params.status,
        eventType: params.eventType as any,
        title: params.title,
        description: params.description,
        location: params.location || null,
        city: params.city || null,
        state: params.state || null,
        isPublic: params.isPublic !== undefined ? params.isPublic : true,
        metadata: params.metadata ? (params.metadata as any) : undefined,
        createdBy: params.createdBy || null,
      },
      include: {
        shipment: { select: { trackingNumber: true } },
      },
    });

    // Publish to real-time subscribers
    trackingPublisher.emit(TRACKING_EVENT, {
      trackingNumber: event.shipment.trackingNumber,
      event: {
        id: event.id,
        status: event.status,
        eventType: event.eventType,
        title: event.title,
        description: event.description,
        location: event.location,
        city: event.city,
        state: event.state,
        createdAt: event.createdAt,
      },
    });

    return event;
  }

  /**
   * Rule-based ETA calculation based on origin & destination cities
   */
  private calculateEta(createdAt: Date, originCity?: string, destCity?: string): Date {
    const baseDate = new Date(createdAt);
    let transitDays = 3; // default

    if (originCity && destCity) {
      if (originCity.toLowerCase() === destCity.toLowerCase()) {
        transitDays = 1; // Local
      } else {
        transitDays = 4; // National default
      }
    }

    baseDate.setDate(baseDate.getDate() + transitDays);
    return baseDate;
  }

  /**
   * Public tracking with privacy masking (no PII, street addresses or phone numbers exposed)
   */
  async getPublicTracking(trackingNumber: string): Promise<PublicTrackingResponse> {
    const normalizedNumber = trackingNumber.trim();

    const shipment = await prisma.shipment.findUnique({
      where: { trackingNumber: normalizedNumber },
      include: {
        addresses: true,
        events: {
          where: { isPublic: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!shipment) {
      throw new NotFoundError(`Shipment with tracking number '${normalizedNumber}' was not found.`);
    }

    const addresses = shipment.addresses || [];
    const pickupAddr = addresses.find((a) => a.type === ShipmentAddressType.PICKUP);
    const deliveryAddr = addresses.find((a) => a.type === ShipmentAddressType.DELIVERY);

    const estimatedDelivery = shipment.deliveredAt
      ? shipment.deliveredAt
      : this.calculateEta(shipment.createdAt || new Date(), pickupAddr?.city, deliveryAddr?.city);

    const events = shipment.events || [];
    const lastEvent = events[events.length - 1];

    const timeline = events.map((e: any) => ({
      id: e.id,
      status: e.status,
      eventType: e.eventType || 'SHIPMENT_CREATED',
      title: e.title || 'Tracking Update',
      description: e.description || '',
      location: e.location || (e.city ? `${e.city}, ${e.state || ''}` : null),
      createdAt: e.createdAt || e.timestamp || new Date(),
    }));

    return {
      trackingNumber: shipment.trackingNumber,
      status: shipment.status,
      carrier: shipment.carrier,
      originCity: pickupAddr ? `${pickupAddr.city}, ${pickupAddr.state}` : 'Origin Hub',
      destinationCity: deliveryAddr
        ? `${deliveryAddr.city}, ${deliveryAddr.state}`
        : (shipment as any).destinationAddress || 'Destination Hub',
      estimatedDeliveryDate: estimatedDelivery,
      lastUpdatedAt: lastEvent
        ? lastEvent.createdAt || (lastEvent as any).timestamp
        : shipment.updatedAt || new Date(),
      timeline,
      events: timeline,
    } as any;
  }
}

export const trackingService = new TrackingService();
