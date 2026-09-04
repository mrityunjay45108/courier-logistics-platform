import { BaseKafkaConsumer } from './base-consumer';
import { KAFKA_TOPICS, KAFKA_CONSUMER_GROUPS, KAFKA_EVENT_TYPES } from '../kafka.constants';
import { KafkaEventEnvelope, EcommerceOrderEventData } from '../kafka.types';
import { EachMessagePayload } from 'kafkajs';
import { pricingService } from '../../../modules/pricing/pricing.service';
import { prisma } from '../../../lib/prisma';

import { Prisma, ShipmentStatus } from '@prisma/client';
import { canCancelShipment } from '../../../modules/shipments/shipment-state.service';

/**
 * Consumer for inbound E-Commerce Order Events
 * Topics: ecommerce.order.created, ecommerce.order.events
 */
export class EcommerceOrderConsumer extends BaseKafkaConsumer {
  constructor() {
    super(KAFKA_CONSUMER_GROUPS.COURIER_ECOMMERCE_ORDER_WORKER, [
      KAFKA_TOPICS.ECOMMERCE_ORDER_CREATED,
      KAFKA_TOPICS.ECOMMERCE_ORDER_EVENTS,
    ]);
  }

  protected async handleEvent(
    envelope: KafkaEventEnvelope<EcommerceOrderEventData>,
    context: EachMessagePayload,
    tx: Prisma.TransactionClient
  ): Promise<void> {
    const { eventType, data } = envelope;

    if (!data || !data.orderId) {
      console.warn(`⚠️ Received E-Commerce order event with missing orderId: ${envelope.eventId}`);
      return;
    }

    switch (eventType) {
      case KAFKA_EVENT_TYPES.ORDER_CREATED:
      case KAFKA_EVENT_TYPES.ORDER_CONFIRMED: {
        // Pre-validate serviceability for the order's destination
        if (data.deliveryPincode) {
          const serviceability = await pricingService.checkPincode(data.deliveryPincode);
          console.log(
            `📦 Inbound E-Commerce Order ${data.orderId} serviceability check: pincode ${data.deliveryPincode} is ${
              serviceability.serviceable ? 'SERVICEABLE' : 'UNSERVICEABLE'
            }`
          );
        }

        // Check if shipment already booked via REST (avoid duplicate operations)
        const existingShipment = await tx.shipment.findFirst({
          where: { externalOrderId: data.orderId },
        });

        if (existingShipment) {
          console.log(`ℹ️ Shipment already exists for order ${data.orderId}. Skipping redundant intake.`);
        }
        break;
      }

      case KAFKA_EVENT_TYPES.ORDER_CANCELLED: {
        const existingShipment = await tx.shipment.findFirst({
          where: { externalOrderId: data.orderId },
        });

        if (existingShipment && canCancelShipment(existingShipment.status)) {
          await tx.shipment.update({
            where: { id: existingShipment.id },
            data: {
              status: ShipmentStatus.CANCELLED,
              cancelledAt: new Date(),
            },
          });

          await tx.trackingEvent.create({
            data: {
              shipmentId: existingShipment.id,
              status: ShipmentStatus.CANCELLED,
              eventType: 'CANCELLED',
              title: 'Shipment Cancelled',
              description: 'Cancelled following inbound E-Commerce order cancellation event',
              isPublic: true,
              createdBy: 'kafka-ecommerce-consumer',
            },
          });
          console.log(`🛑 Cancelled shipment ${existingShipment.id} for external order: ${data.orderId}`);
        } else {
          console.log(`ℹ️ Order cancelled notification received for external order: ${data.orderId} (no cancellable shipment)`);
        }
        break;
      }

      default:
        console.log(`ℹ️ Ignored unhandled E-Commerce order event type '${eventType}' on '${context.topic}'`);
    }
  }
}

export const ecommerceOrderConsumer = new EcommerceOrderConsumer();
