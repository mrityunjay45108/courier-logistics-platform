import { BaseKafkaConsumer } from './base-consumer';
import { KAFKA_TOPICS, KAFKA_CONSUMER_GROUPS } from '../kafka.constants';
import { KafkaEventEnvelope, ShipmentEventData } from '../kafka.types';
import { EachMessagePayload } from 'kafkajs';
import { prisma } from '../../../lib/prisma';
import { canTransition } from '../../../modules/shipments/shipment-state.service';
import { Prisma, ShipmentStatus, TrackingEventType } from '@prisma/client';

function mapStatusToTrackingEventType(status: ShipmentStatus): TrackingEventType {
  switch (status) {
    case ShipmentStatus.CREATED:
      return TrackingEventType.SHIPMENT_CREATED;
    case ShipmentStatus.PICKUP_SCHEDULED:
      return TrackingEventType.PICKUP_SCHEDULED;
    case ShipmentStatus.PICKED_UP:
      return TrackingEventType.PICKED_UP;
    case ShipmentStatus.IN_TRANSIT:
      return TrackingEventType.IN_TRANSIT;
    case ShipmentStatus.OUT_FOR_DELIVERY:
      return TrackingEventType.OUT_FOR_DELIVERY;
    case ShipmentStatus.DELIVERED:
      return TrackingEventType.DELIVERED;
    case ShipmentStatus.FAILED_DELIVERY:
      return TrackingEventType.DELIVERY_FAILED;
    case ShipmentStatus.CANCELLED:
      return TrackingEventType.CANCELLED;
    case ShipmentStatus.RETURN_INITIATED:
      return TrackingEventType.RETURN_REQUESTED;
    case ShipmentStatus.RETURNED:
      return TrackingEventType.RETURN_RECEIVED;
    default:
      return TrackingEventType.SHIPMENT_CREATED;
  }
}

/**
 * Consumer for Courier Shipment Lifecycle Events
 * Topic: courier.shipment.events
 * Consumer Group: courier-shipment-worker
 */
export class CourierShipmentConsumer extends BaseKafkaConsumer {
  constructor() {
    super(KAFKA_CONSUMER_GROUPS.COURIER_SHIPMENT_WORKER, [KAFKA_TOPICS.COURIER_SHIPMENT_EVENTS]);
  }

  protected async handleEvent(
    envelope: KafkaEventEnvelope<ShipmentEventData>,
    context: EachMessagePayload,
    tx: Prisma.TransactionClient
  ): Promise<void> {
    const { eventType, data, aggregateId } = envelope;

    if (!data || !aggregateId) {
      console.warn(`⚠️ Received shipment event with missing aggregateId: ${envelope.eventId}`);
      return;
    }

    const shipment = await tx.shipment.findUnique({
      where: { id: aggregateId },
    });

    if (!shipment) {
      console.warn(`⚠️ Shipment ${aggregateId} not found during Kafka event processing: ${eventType}`);
      return;
    }

    // Out-of-order event defense:
    // If event payload status matches current status, this action has already been performed
    if (data.status && shipment.status === data.status) {
      console.log(`ℹ️ Shipment ${aggregateId} is already in status '${shipment.status}'. Skipping duplicate action.`);
      return;
    }

    // Verify allowed state transitions
    if (data.status && !canTransition(shipment.status, data.status as ShipmentStatus)) {
      console.warn(
        `⚠️ Out-of-order Kafka event ignored: Invalid transition from '${shipment.status}' to '${data.status}' for shipment ${aggregateId}`
      );
      return;
    }

    // Apply state transition if valid and not already applied
    if (data.status && shipment.status !== data.status && canTransition(shipment.status, data.status as ShipmentStatus)) {
      await tx.shipment.update({
        where: { id: aggregateId },
        data: {
          status: data.status as ShipmentStatus,
          ...(data.status === ShipmentStatus.DELIVERED ? { deliveredAt: new Date(envelope.occurredAt || Date.now()) } : {}),
        },
      });

      await tx.trackingEvent.create({
        data: {
          shipmentId: aggregateId,
          status: data.status as ShipmentStatus,
          eventType: mapStatusToTrackingEventType(data.status as ShipmentStatus),
          title: `Status: ${data.status.replace(/_/g, ' ')}`,
          description: `Updated via Kafka event: ${eventType}`,
          isPublic: true,
          createdBy: 'kafka-shipment-consumer',
        },
      });
    }

    console.log(`📊 Processed shipment event ${eventType} for tracking number: ${shipment.trackingNumber}`);
  }
}

export const courierShipmentConsumer = new CourierShipmentConsumer();
