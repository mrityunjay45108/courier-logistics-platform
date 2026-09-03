import { prisma } from '../../lib/prisma';
import { NotFoundError } from '../../utils/errors';
import type { TrackingResultDto } from '@courier/types';

export class TrackingService {
  async getShipmentTracking(trackingNumber: string): Promise<TrackingResultDto> {
    const shipment = await prisma.shipment.findUnique({
      where: { trackingNumber: trackingNumber.trim() },
      include: {
        events: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!shipment) {
      throw new NotFoundError(`Shipment with tracking number '${trackingNumber}' was not found.`);
    }

    return {
      trackingNumber: shipment.trackingNumber,
      status: shipment.status,
      carrier: shipment.carrier,
      origin: 'Merchant Origin Hub',
      destination: shipment.destinationAddress,
      estimatedDelivery: shipment.estimatedDelivery ? shipment.estimatedDelivery.toISOString() : null,
      events: shipment.events.map((e) => ({
        id: e.id,
        status: e.status,
        location: e.location,
        description: e.description,
        timestamp: e.timestamp.toISOString(),
      })),
    };
  }
}

export const trackingService = new TrackingService();
