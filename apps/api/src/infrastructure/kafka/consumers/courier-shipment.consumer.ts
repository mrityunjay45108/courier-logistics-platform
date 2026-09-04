import { BaseKafkaConsumer } from './base-consumer';
import { KAFKA_TOPICS, KAFKA_CONSUMER_GROUPS } from '../kafka.constants';
import { KafkaEventEnvelope, ShipmentEventData } from '../kafka.types';
import { EachMessagePayload } from 'kafkajs';
import { prisma } from '../../../lib/prisma';
import { canTransition } from '../../../modules/shipments/shipment-state.service';
import { ShipmentStatus } from '@prisma/client';

/**
 * Consumer for Courier Shipment Lifecycle Events
 * Topic: courier.shipment.events
 * Consumer Group: courier-shipment-worker
 */
export class CourierShipmentConsumer extends BaseKafkaConsumer {
  constructor() {
    super(KAFKA_CONSUMER_GROUPS.COURIER_SHIPMENT_WORKER, [KAFKA_TOPICS.COURIER_SHIPMENT_EVENTS]);
  }

  protected async handleEvent(envelope: KafkaEventEnvelope<ShipmentEventData>, context: EachMessagePayload): Promise<void> {
    const { eventType, data, aggregateId } = envelope;

    if (!data || !aggregateId) {
      console.warn(`⚠️ Received shipment event with missing aggregateId: ${envelope.eventId}`);
      return;
    }

    const shipment = await prisma.shipment.findUnique({
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

    console.log(`📊 Processed shipment event ${eventType} for tracking number: ${shipment.trackingNumber}`);
  }
}

export const courierShipmentConsumer = new CourierShipmentConsumer();
