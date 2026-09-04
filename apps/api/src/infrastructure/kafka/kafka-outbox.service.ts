import { prisma } from '../../lib/prisma';
import { kafkaProducerService } from './kafka-producer.service';
import { KafkaOutboxStatus, Prisma } from '@prisma/client';
import { KafkaTopic, KAFKA_TOPICS } from './kafka.constants';
import { KafkaEventEnvelope, ShipmentEventData } from './kafka.types';

/**
 * Transactional Outbox Service
 * Guarantees atomic persistence of business state and event records,
 * followed by reliable publication to Kafka with exponential retry.
 */
export class KafkaOutboxService {
  private workerTimer: NodeJS.Timeout | null = null;
  private isProcessing: boolean = false;

  /**
   * Helper to write an Outbox event inside an existing Prisma transaction
   */
  async recordOutboxEvent<T>(
    tx: Prisma.TransactionClient,
    params: {
      topic: KafkaTopic;
      partitionKey: string;
      envelope: KafkaEventEnvelope<T>;
    }
  ) {
    return await tx.kafkaOutboxEvent.create({
      data: {
        eventId: params.envelope.eventId,
        topic: params.topic,
        partitionKey: params.partitionKey,
        eventType: params.envelope.eventType,
        payload: params.envelope as unknown as Prisma.InputJsonValue,
        status: KafkaOutboxStatus.PENDING,
        attempts: 0,
        maxAttempts: 5,
        nextAttemptAt: new Date(),
      },
    });
  }

  /**
   * Standardized helper to record a shipment lifecycle event into Kafka Outbox
   */
  async recordShipmentEvent(
    tx: Prisma.TransactionClient,
    shipment: {
      id: string;
      externalOrderId?: string | null;
      trackingNumber: string;
      status: string;
      shipmentType: string;
      carrier?: string | null;
      shippingCost: Prisma.Decimal | number;
      codAmount: Prisma.Decimal | number;
      currency?: string | null;
      deliveredAt?: Date | null;
      notes?: string | null;
      addresses?: Array<{ type: string; postalCode: string }>;
    },
    eventType: string,
    options?: {
      correlationId?: string;
      notes?: string | null;
      pickupPincode?: string;
      deliveryPincode?: string;
    }
  ) {
    const pickupAddr = shipment.addresses?.find((a) => a.type === 'PICKUP');
    const deliveryAddr = shipment.addresses?.find((a) => a.type === 'DELIVERY');

    const pickupPincode = options?.pickupPincode || pickupAddr?.postalCode || null;
    const deliveryPincode = options?.deliveryPincode || deliveryAddr?.postalCode || null;

    const envelope: KafkaEventEnvelope<ShipmentEventData> = {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      eventType,
      version: 1,
      occurredAt: new Date().toISOString(),
      producer: 'courier-logistics-platform',
      correlationId: options?.correlationId,
      aggregateType: 'Shipment',
      aggregateId: shipment.id,
      data: {
        shipmentId: shipment.id,
        externalOrderId: shipment.externalOrderId || null,
        trackingNumber: shipment.trackingNumber,
        status: shipment.status,
        shipmentType: shipment.shipmentType,
        carrier: shipment.carrier || 'Apex Express Logistics',
        shippingCost: Number(shipment.shippingCost),
        codAmount: Number(shipment.codAmount),
        currency: shipment.currency || 'INR',
        pickupPincode,
        deliveryPincode,
        deliveredAt: shipment.deliveredAt ? shipment.deliveredAt.toISOString() : null,
        estimatedDelivery: null,
        notes: options?.notes || shipment.notes || null,
      },
    };

    return await this.recordOutboxEvent(tx, {
      topic: KAFKA_TOPICS.COURIER_SHIPMENT_EVENTS,
      partitionKey: shipment.id,
      envelope,
    });
  }

  /**
   * Fast-path: Attempt immediate publication right after transaction commits
   */
  async publishOutboxRecord(outboxId: string): Promise<boolean> {
    const record = await prisma.kafkaOutboxEvent.findUnique({ where: { id: outboxId } });
    if (!record || record.status === KafkaOutboxStatus.PUBLISHED) {
      return true;
    }

    try {
      const envelope = record.payload as unknown as KafkaEventEnvelope;
      await kafkaProducerService.publish(
        record.topic as KafkaTopic,
        envelope,
        record.partitionKey
      );

      await prisma.kafkaOutboxEvent.update({
        where: { id: record.id },
        data: {
          status: KafkaOutboxStatus.PUBLISHED,
          publishedAt: new Date(),
          lastError: null,
        },
      });

      return true;
    } catch (err: any) {
      const nextAttempts = record.attempts + 1;
      const backoffMs = Math.min(30000 * Math.pow(2, record.attempts), 600000); // 30s, 60s, 120s... max 10m

      await prisma.kafkaOutboxEvent.update({
        where: { id: record.id },
        data: {
          attempts: nextAttempts,
          status: nextAttempts >= record.maxAttempts ? KafkaOutboxStatus.FAILED : KafkaOutboxStatus.PENDING,
          nextAttemptAt: new Date(Date.now() + backoffMs),
          lastError: err.message || 'Publication error',
        },
      });

      return false;
    }
  }

  /**
   * Background polling worker to pick up and publish pending or retried outbox events
   */
  async dispatchPendingEvents(batchSize: number = 20): Promise<number> {
    if (this.isProcessing) return 0;
    this.isProcessing = true;

    try {
      const pendingEvents = await prisma.kafkaOutboxEvent.findMany({
        where: {
          status: KafkaOutboxStatus.PENDING,
          nextAttemptAt: { lte: new Date() },
        },
        take: batchSize,
        orderBy: { createdAt: 'asc' },
      });

      let publishedCount = 0;
      for (const event of pendingEvents) {
        const success = await this.publishOutboxRecord(event.id);
        if (success) publishedCount++;
      }

      return publishedCount;
    } catch (err: any) {
      console.warn('⚠️ Error during Outbox worker poll:', err.message);
      return 0;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Start periodic background dispatcher
   */
  startWorker(intervalMs: number = 5000): void {
    if (this.workerTimer) return;
    this.workerTimer = setInterval(() => {
      this.dispatchPendingEvents().catch(() => {});
    }, intervalMs);
    console.log('🔄 Kafka Outbox Dispatcher worker started.');
  }

  /**
   * Stop background dispatcher on shutdown
   */
  stopWorker(): void {
    if (this.workerTimer) {
      clearInterval(this.workerTimer);
      this.workerTimer = null;
      console.log('🛑 Kafka Outbox Dispatcher worker stopped.');
    }
  }
}

export const kafkaOutboxService = new KafkaOutboxService();
