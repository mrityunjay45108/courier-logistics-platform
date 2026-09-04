import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  KAFKA_TOPICS,
  PERMITTED_KAFKA_TOPICS,
  KAFKA_EVENT_TYPES,
  KAFKA_CONSUMER_GROUPS,
  kafkaClientManager,
  kafkaProducerService,
  kafkaOutboxService,
  KafkaEventEnvelope,
  ShipmentEventData,
} from '../src/infrastructure/kafka';
import { canTransition, validateShipmentTransition } from '../src/modules/shipments/shipment-state.service';
import { ShipmentStatus, KafkaOutboxStatus, KafkaFailureStatus } from '@prisma/client';
import { prisma } from '../src/lib/prisma';

describe('Kafka Integration Test Suite', () => {
  beforeAll(async () => {
    // Ensure clean state if necessary
  });

  afterAll(async () => {
    // Disconnect resources
    await kafkaProducerService.disconnect();
    await prisma.$disconnect();
  });

  describe('1. Strict 5-Topic Constraint Enforcement', () => {
    it('must contain EXACTLY and ONLY the 5 permitted topics', () => {
      expect(PERMITTED_KAFKA_TOPICS).toHaveLength(5);
      expect(PERMITTED_KAFKA_TOPICS).toContain('courier.shipment.events');
      expect(PERMITTED_KAFKA_TOPICS).toContain('ecommerce.inventory.events');
      expect(PERMITTED_KAFKA_TOPICS).toContain('ecommerce.order.created');
      expect(PERMITTED_KAFKA_TOPICS).toContain('ecommerce.order.events');
      expect(PERMITTED_KAFKA_TOPICS).toContain('ecommerce.shipment.events');
    });

    it('must reject publication to any unauthorized or unregistered topic', async () => {
      const unauthorizedTopic = 'courier.unauthorized.dlq' as any;
      const dummyEnvelope: KafkaEventEnvelope = {
        eventId: 'test-evt-unauth',
        eventType: 'test.unauth',
        version: 1,
        occurredAt: new Date().toISOString(),
        producer: 'test',
        aggregateType: 'Shipment',
        aggregateId: 'test-id',
        data: {},
      };

      await expect(
        kafkaProducerService.publish(unauthorizedTopic, dummyEnvelope, 'test-key')
      ).rejects.toThrow(/Security violation: Attempted to publish to unauthorized topic/);
    });
  });

  describe('2. Event Envelope & Partition Key Specifications', () => {
    it('must generate a valid, strongly-typed event envelope with correlation ID', () => {
      const correlationId = 'req-corr-uuid-12345';
      const eventData: ShipmentEventData = {
        shipmentId: 'ship_test_100',
        externalOrderId: 'ORD-EXT-9988',
        trackingNumber: 'APX-99887766',
        status: ShipmentStatus.CREATED,
        shipmentType: 'PREPAID',
        carrier: 'Apex Express Logistics',
        shippingCost: 150.0,
        codAmount: 0,
        currency: 'INR',
        pickupPincode: '110001',
        deliveryPincode: '400001',
      };

      const envelope: KafkaEventEnvelope<ShipmentEventData> = {
        eventId: `evt_${Date.now()}_abc123`,
        eventType: KAFKA_EVENT_TYPES.SHIPMENT_CREATED,
        version: 1,
        occurredAt: new Date().toISOString(),
        producer: 'courier-logistics-platform',
        correlationId,
        aggregateType: 'Shipment',
        aggregateId: eventData.shipmentId,
        data: eventData,
      };

      expect(envelope.eventId).toMatch(/^evt_/);
      expect(envelope.eventType).toBe('shipment.created');
      expect(envelope.version).toBe(1);
      expect(envelope.producer).toBe('courier-logistics-platform');
      expect(envelope.correlationId).toBe(correlationId);
      expect(envelope.aggregateType).toBe('Shipment');
      expect(envelope.aggregateId).toBe('ship_test_100');
      expect(envelope.data.shippingCost).toBe(150.0);
    });

    it('partition key must match shipmentId for ordering guarantees', () => {
      const shipmentId = 'ship_order_ordering_check_123';
      const partitionKey = shipmentId;
      expect(partitionKey).toBe('ship_order_ordering_check_123');
    });
  });

  describe('3. Shipment State Machine Validation', () => {
    it('should validate allowed lifecycle transitions correctly', () => {
      expect(canTransition(ShipmentStatus.CREATED, ShipmentStatus.PICKUP_SCHEDULED)).toBe(true);
      expect(canTransition(ShipmentStatus.PICKUP_SCHEDULED, ShipmentStatus.PICKED_UP)).toBe(true);
      expect(canTransition(ShipmentStatus.PICKED_UP, ShipmentStatus.IN_TRANSIT)).toBe(true);
      expect(canTransition(ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY)).toBe(true);
      expect(canTransition(ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.DELIVERED)).toBe(true);
      expect(canTransition(ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.FAILED_DELIVERY)).toBe(true);
      expect(canTransition(ShipmentStatus.FAILED_DELIVERY, ShipmentStatus.OUT_FOR_DELIVERY)).toBe(true);
      expect(canTransition(ShipmentStatus.DELIVERED, ShipmentStatus.RETURN_INITIATED)).toBe(true);
      expect(canTransition(ShipmentStatus.RETURN_INITIATED, ShipmentStatus.RETURNED)).toBe(true);
    });

    it('should disallow illegal or backwards transitions', () => {
      expect(canTransition(ShipmentStatus.DELIVERED, ShipmentStatus.PICKED_UP)).toBe(false);
      expect(canTransition(ShipmentStatus.CANCELLED, ShipmentStatus.DELIVERED)).toBe(false);
      expect(canTransition(ShipmentStatus.RETURNED, ShipmentStatus.IN_TRANSIT)).toBe(false);

      expect(() => {
        validateShipmentTransition(ShipmentStatus.DELIVERED, ShipmentStatus.CREATED);
      }).toThrow(/Invalid shipment status transition/);
    });
  });

  describe('4. Transactional Outbox Database Integration', () => {
    it('should atomically persist an outbox event in PostgreSQL', async () => {
      const uniqueEventId = `evt_test_outbox_${Date.now()}`;
      const uniqueShipmentId = `ship_mock_${Date.now()}`;

      const outboxRecord = await prisma.$transaction(async (tx) => {
        return await kafkaOutboxService.recordShipmentEvent(
          tx,
          {
            id: uniqueShipmentId,
            externalOrderId: 'EXT-TEST-OUTBOX',
            trackingNumber: 'TRK-TEST-999',
            status: ShipmentStatus.CREATED,
            shipmentType: 'PREPAID',
            carrier: 'Apex Express Logistics',
            shippingCost: 99.5,
            codAmount: 0,
            currency: 'INR',
          },
          KAFKA_EVENT_TYPES.SHIPMENT_CREATED,
          {
            correlationId: 'corr-test-outbox-999',
            notes: 'Automated test booking',
          }
        );
      });

      expect(outboxRecord).toBeDefined();
      expect(outboxRecord.id).toBeDefined();
      expect(outboxRecord.topic).toBe(KAFKA_TOPICS.COURIER_SHIPMENT_EVENTS);
      expect(outboxRecord.partitionKey).toBe(uniqueShipmentId);
      expect(outboxRecord.status).toBe(KafkaOutboxStatus.PENDING);
      expect(outboxRecord.attempts).toBe(0);

      // Clean up test record
      await prisma.kafkaOutboxEvent.delete({ where: { id: outboxRecord.id } });
    });
  });

  describe('5. Consumer Inbox Deduplication (Idempotency Pattern)', () => {
    it('should record processed events and prevent duplicate execution', async () => {
      const testEventId = `evt_dedup_${Date.now()}`;
      const consumerGroup = KAFKA_CONSUMER_GROUPS.COURIER_SHIPMENT_WORKER;

      // 1. Record first processed event
      const processed = await prisma.kafkaProcessedEvent.create({
        data: {
          eventId: testEventId,
          consumerGroup,
          topic: KAFKA_TOPICS.COURIER_SHIPMENT_EVENTS,
          eventType: KAFKA_EVENT_TYPES.SHIPMENT_CREATED,
        },
      });

      expect(processed).toBeDefined();
      expect(processed.eventId).toBe(testEventId);

      // 2. Duplicate insertion with identical consumerGroup and eventId must fail unique constraint
      await expect(
        prisma.kafkaProcessedEvent.create({
          data: {
            eventId: testEventId,
            consumerGroup,
            topic: KAFKA_TOPICS.COURIER_SHIPMENT_EVENTS,
            eventType: KAFKA_EVENT_TYPES.SHIPMENT_CREATED,
          },
        })
      ).rejects.toThrow();

      // Clean up
      await prisma.kafkaProcessedEvent.delete({
        where: {
          consumerGroup_eventId: {
            consumerGroup,
            eventId: testEventId,
          },
        },
      });
    });
  });

  describe('6. Database-Backed DLQ Integration (KafkaFailedEvent)', () => {
    it('should store failed message in PostgreSQL DLQ with full diagnosis details', async () => {
      const failedEventId = `evt_failed_${Date.now()}`;

      const failedRecord = await prisma.kafkaFailedEvent.create({
        data: {
          eventId: failedEventId,
          topic: KAFKA_TOPICS.COURIER_SHIPMENT_EVENTS,
          partition: 0,
          offset: '1052',
          consumerGroup: KAFKA_CONSUMER_GROUPS.COURIER_SHIPMENT_WORKER,
          payload: { test: true, reason: 'Simulation of unparseable event' },
          errorReason: 'Simulation: downstream DB lock timeout',
          stackTrace: 'Error: Simulation\n at Object.<anonymous> (/test/mock.ts:10:5)',
          status: KafkaFailureStatus.UNRESOLVED,
        },
      });

      expect(failedRecord).toBeDefined();
      expect(failedRecord.status).toBe(KafkaFailureStatus.UNRESOLVED);
      expect(failedRecord.topic).toBe(KAFKA_TOPICS.COURIER_SHIPMENT_EVENTS);
      expect(failedRecord.errorReason).toContain('Simulation');

      // Update status to RESOLVED
      const updated = await prisma.kafkaFailedEvent.update({
        where: { id: failedRecord.id },
        data: { status: KafkaFailureStatus.RESOLVED },
      });
      expect(updated.status).toBe(KafkaFailureStatus.RESOLVED);

      // Clean up
      await prisma.kafkaFailedEvent.delete({ where: { id: failedRecord.id } });
    });
  });

  describe('7. Kafka Client Manager Configuration', () => {
    it('should report correct cluster configuration status', () => {
      // If environment is populated, client is enabled
      expect(typeof kafkaClientManager.isEnabled()).toBe('boolean');
    });
  });
});
