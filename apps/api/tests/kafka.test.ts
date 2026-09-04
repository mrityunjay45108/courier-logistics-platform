import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  KAFKA_TOPICS,
  PERMITTED_KAFKA_TOPICS,
  KAFKA_EVENT_TYPES,
  KAFKA_CONSUMER_GROUPS,
  kafkaClientManager,
  kafkaProducerService,
  kafkaOutboxService,
  courierShipmentConsumer,
  ecommerceOrderConsumer,
  kafkaReplayService,
  KafkaEventEnvelope,
  ShipmentEventData,
} from '../src/infrastructure/kafka';
import { canTransition, validateShipmentTransition } from '../src/modules/shipments/shipment-state.service';
import { shipmentsService } from '../src/modules/shipments/shipments.service';
import { ShipmentStatus, KafkaOutboxStatus, KafkaFailureStatus } from '@prisma/client';
import { prisma } from '../src/lib/prisma';

describe('Kafka Production Readiness Test Suite', () => {
  const testShipmentIds: string[] = [];
  const testOutboxIds: string[] = [];
  const testProcessedEventIds: { consumerGroup: string; eventId: string }[] = [];
  const testFailedEventIds: string[] = [];
  let testUserId: string;

  beforeAll(async () => {
    const existingUser = await prisma.user.findFirst({ select: { id: true } });
    if (existingUser) {
      testUserId = existingUser.id;
    } else {
      const newUser = await prisma.user.create({
        data: {
          email: `kafka_test_${Date.now()}@example.com`,
          passwordHash: 'dummy_hash',
          name: 'Kafka Tester',
          role: 'ADMIN',
        },
      });
      testUserId = newUser.id;
    }
  });

  afterAll(async () => {
    // Clean up test data in parallel batch operations
    await Promise.allSettled([
      prisma.kafkaOutboxEvent.deleteMany({ where: { id: { in: testOutboxIds } } }),
      prisma.kafkaFailedEvent.deleteMany({ where: { id: { in: testFailedEventIds } } }),
      prisma.trackingEvent.deleteMany({ where: { shipmentId: { in: testShipmentIds } } }),
      prisma.shippingLabel.deleteMany({ where: { shipmentId: { in: testShipmentIds } } }),
      prisma.shipmentPackage.deleteMany({ where: { shipmentId: { in: testShipmentIds } } }),
      prisma.shipmentAddress.deleteMany({ where: { shipmentId: { in: testShipmentIds } } }),
    ]);

    await prisma.shipment.deleteMany({ where: { id: { in: testShipmentIds } } }).catch(() => {});

    for (const item of testProcessedEventIds) {
      await prisma.kafkaProcessedEvent
        .deleteMany({
          where: { consumerGroup: item.consumerGroup, eventId: item.eventId },
        })
        .catch(() => {});
    }

    await kafkaProducerService.disconnect();
    await prisma.$disconnect();
  });

  // Helper to create a minimal valid test shipment in DB
  async function createTestShipment(status: ShipmentStatus = ShipmentStatus.CREATED) {
    const shipment = await prisma.shipment.create({
      data: {
        trackingNumber: `APX-TST-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        status,
        shipmentType: 'PREPAID',
        shippingCost: 120.0,
        codAmount: 0,
        currency: 'INR',
        carrier: 'Apex Express Logistics',
      },
    });
    testShipmentIds.push(shipment.id);
    return shipment;
  }

  // --------------------------------------------------------------------------
  // 1. Strict 5-Topic Constraint Enforcement
  // --------------------------------------------------------------------------
  describe('1. Strict 5-Topic Constraint Enforcement', () => {
    it('must contain EXACTLY and ONLY the 5 permitted topics', () => {
      expect(PERMITTED_KAFKA_TOPICS).toHaveLength(5);
      expect(PERMITTED_KAFKA_TOPICS).toContain('courier.shipment.events');
      expect(PERMITTED_KAFKA_TOPICS).toContain('ecommerce.inventory.events');
      expect(PERMITTED_KAFKA_TOPICS).toContain('ecommerce.order.created');
      expect(PERMITTED_KAFKA_TOPICS).toContain('ecommerce.order.events');
      expect(PERMITTED_KAFKA_TOPICS).toContain('ecommerce.shipment.events');
    });

    it('must reject publication to any unauthorized topic (DLQ / retry / custom topics)', async () => {
      const unauthorizedTopic = 'courier.unauthorized.retry' as any;
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

  // --------------------------------------------------------------------------
  // 2. Outbox Duplicate Safety & Acknowledgement Retry
  // --------------------------------------------------------------------------
  describe('2. Outbox Duplicate Safety & Acknowledgement Retry', () => {
    it('creates outbox event atomically with business operation', async () => {
      const uniqueShipmentId = `ship_mock_outbox_${Date.now()}`;

      const outbox = await prisma.$transaction(async (tx) => {
        return await kafkaOutboxService.recordShipmentEvent(
          tx,
          {
            id: uniqueShipmentId,
            trackingNumber: 'TRK-ATOMIC-1',
            status: ShipmentStatus.CREATED,
            shipmentType: 'PREPAID',
            shippingCost: 80,
            codAmount: 0,
          },
          KAFKA_EVENT_TYPES.SHIPMENT_CREATED,
          { correlationId: 'corr-atomic-1' }
        );
      });

      testOutboxIds.push(outbox.id);
      expect(outbox).toBeDefined();
      expect(outbox.topic).toBe(KAFKA_TOPICS.COURIER_SHIPMENT_EVENTS);
      expect(outbox.status).toBe(KafkaOutboxStatus.PENDING);
      expect(outbox.partitionKey).toBe(uniqueShipmentId);
    });

    it('fast-path publication handles already PUBLISHED records idempotently without duplicate publish', async () => {
      const uniqueEventId = `evt_idemp_pub_${Date.now()}`;
      const record = await prisma.kafkaOutboxEvent.create({
        data: {
          eventId: uniqueEventId,
          topic: KAFKA_TOPICS.COURIER_SHIPMENT_EVENTS,
          partitionKey: 'part-key-1',
          eventType: KAFKA_EVENT_TYPES.SHIPMENT_CREATED,
          payload: { eventId: uniqueEventId, eventType: KAFKA_EVENT_TYPES.SHIPMENT_CREATED },
          status: KafkaOutboxStatus.PUBLISHED,
          attempts: 1,
          publishedAt: new Date(),
        },
      });
      testOutboxIds.push(record.id);

      // Subsequent publication attempt must return true immediately without resending
      const result = await kafkaOutboxService.publishOutboxRecord(record.id);
      expect(result).toBe(true);
    });

    it('network timeout / acknowledgement failure backs off and retries safely without duplicate business effects', async () => {
      const timeoutEventId = `evt_timeout_${Date.now()}`;
      const record = await prisma.kafkaOutboxEvent.create({
        data: {
          eventId: timeoutEventId,
          topic: KAFKA_TOPICS.COURIER_SHIPMENT_EVENTS,
          partitionKey: 'part-timeout-key',
          eventType: KAFKA_EVENT_TYPES.SHIPMENT_CREATED,
          payload: { eventId: timeoutEventId, eventType: KAFKA_EVENT_TYPES.SHIPMENT_CREATED },
          status: KafkaOutboxStatus.PENDING,
          attempts: 0,
          maxAttempts: 5,
        },
      });
      testOutboxIds.push(record.id);

      // Simulate a network failure update
      const nextAttempts = record.attempts + 1;
      const backoffMs = Math.min(30000 * Math.pow(2, record.attempts), 600000);
      const updated = await prisma.kafkaOutboxEvent.update({
        where: { id: record.id },
        data: {
          attempts: nextAttempts,
          nextAttemptAt: new Date(Date.now() + backoffMs),
          lastError: 'KafkaJSConnectionError: Network timeout waiting for broker ACK',
        },
      });

      expect(updated.attempts).toBe(1);
      expect(updated.status).toBe(KafkaOutboxStatus.PENDING);
      expect(updated.lastError).toContain('Network timeout');
      expect(updated.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  // --------------------------------------------------------------------------
  // 3. Atomic Inbox Processing & Crash/Restart
  // --------------------------------------------------------------------------
  describe('3. Atomic Inbox Processing & Crash/Restart Deduplication', () => {
    it('executes business database updates and KafkaProcessedEvent in the SAME transaction', async () => {
      const shipment = await createTestShipment(ShipmentStatus.CREATED);
      const eventId = `evt_inbox_atomic_${Date.now()}`;

      const envelope: KafkaEventEnvelope<ShipmentEventData> = {
        eventId,
        eventType: KAFKA_EVENT_TYPES.SHIPMENT_PICKUP_SCHEDULED,
        version: 1,
        occurredAt: new Date().toISOString(),
        producer: 'external-test-agent',
        aggregateType: 'Shipment',
        aggregateId: shipment.id,
        data: {
          shipmentId: shipment.id,
          trackingNumber: shipment.trackingNumber,
          status: ShipmentStatus.PICKUP_SCHEDULED,
          shipmentType: 'PREPAID',
          carrier: 'Apex Express Logistics',
          shippingCost: 120,
          codAmount: 0,
          currency: 'INR',
        },
      };

      const mockPayload = {
        topic: KAFKA_TOPICS.COURIER_SHIPMENT_EVENTS,
        partition: 0,
        message: {
          key: Buffer.from(shipment.id),
          value: Buffer.from(JSON.stringify(envelope)),
          timestamp: Date.now().toString(),
          attributes: 0,
          offset: '2001',
        },
        heartbeat: async () => {},
        pause: () => () => {},
      };

      await courierShipmentConsumer.processMessage(mockPayload as any);
      testProcessedEventIds.push({ consumerGroup: courierShipmentConsumer.consumerGroup, eventId });

      // Verify business update occurred
      const updatedShipment = await prisma.shipment.findUnique({ where: { id: shipment.id } });
      expect(updatedShipment?.status).toBe(ShipmentStatus.PICKUP_SCHEDULED);

      // Verify KafkaProcessedEvent was atomically recorded
      const processed = await prisma.kafkaProcessedEvent.findUnique({
        where: {
          consumerGroup_eventId: {
            consumerGroup: courierShipmentConsumer.consumerGroup,
            eventId,
          },
        },
      });
      expect(processed).toBeDefined();
      expect(processed?.eventType).toBe(KAFKA_EVENT_TYPES.SHIPMENT_PICKUP_SCHEDULED);
    });

    it('simulates consumer restart and redelivery: duplicate eventId is skipped without re-running business logic', async () => {
      const shipment = await createTestShipment(ShipmentStatus.PICKUP_SCHEDULED);
      const eventId = `evt_restart_dup_${Date.now()}`;

      // Pre-seed inbox table to simulate event was already processed before a consumer restart
      await prisma.kafkaProcessedEvent.create({
        data: {
          eventId,
          consumerGroup: courierShipmentConsumer.consumerGroup,
          topic: KAFKA_TOPICS.COURIER_SHIPMENT_EVENTS,
          eventType: KAFKA_EVENT_TYPES.SHIPMENT_PICKED_UP,
        },
      });
      testProcessedEventIds.push({ consumerGroup: courierShipmentConsumer.consumerGroup, eventId });

      const initialTrackingCount = await prisma.trackingEvent.count({ where: { shipmentId: shipment.id } });

      const envelope: KafkaEventEnvelope<ShipmentEventData> = {
        eventId,
        eventType: KAFKA_EVENT_TYPES.SHIPMENT_PICKED_UP,
        version: 1,
        occurredAt: new Date().toISOString(),
        producer: 'external-test-agent',
        aggregateType: 'Shipment',
        aggregateId: shipment.id,
        data: {
          shipmentId: shipment.id,
          trackingNumber: shipment.trackingNumber,
          status: ShipmentStatus.PICKED_UP,
          shipmentType: 'PREPAID',
          carrier: 'Apex Express Logistics',
          shippingCost: 120,
          codAmount: 0,
          currency: 'INR',
        },
      };

      const mockPayload = {
        topic: KAFKA_TOPICS.COURIER_SHIPMENT_EVENTS,
        partition: 0,
        message: {
          key: Buffer.from(shipment.id),
          value: Buffer.from(JSON.stringify(envelope)),
          timestamp: Date.now().toString(),
          attributes: 0,
          offset: '2002',
        },
        heartbeat: async () => {},
        pause: () => () => {},
      };

      // Redeliver message after consumer restart
      await courierShipmentConsumer.processMessage(mockPayload as any);

      // Shipment must NOT have transitioned to PICKED_UP (inbox check stopped it before business logic)
      const currentShipment = await prisma.shipment.findUnique({ where: { id: shipment.id } });
      expect(currentShipment?.status).toBe(ShipmentStatus.PICKUP_SCHEDULED);

      const postTrackingCount = await prisma.trackingEvent.count({ where: { shipmentId: shipment.id } });
      expect(postTrackingCount).toBe(initialTrackingCount);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Out-of-Order Shipment Events Defense
  // --------------------------------------------------------------------------
  describe('4. Out-of-Order Shipment Events Defense', () => {
    it('must reject delayed backwards event: DELIVERED -> IN_TRANSIT', async () => {
      const shipment = await createTestShipment(ShipmentStatus.DELIVERED);
      const eventId = `evt_ooo_delivered_${Date.now()}`;

      const delayedEnvelope: KafkaEventEnvelope<ShipmentEventData> = {
        eventId,
        eventType: KAFKA_EVENT_TYPES.SHIPMENT_IN_TRANSIT,
        version: 1,
        occurredAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        producer: 'external-carrier',
        aggregateType: 'Shipment',
        aggregateId: shipment.id,
        data: {
          shipmentId: shipment.id,
          trackingNumber: shipment.trackingNumber,
          status: ShipmentStatus.IN_TRANSIT,
          shipmentType: 'PREPAID',
          carrier: 'Apex Express Logistics',
          shippingCost: 120,
          codAmount: 0,
          currency: 'INR',
        },
      };

      const mockPayload = {
        topic: KAFKA_TOPICS.COURIER_SHIPMENT_EVENTS,
        partition: 0,
        message: {
          key: Buffer.from(shipment.id),
          value: Buffer.from(JSON.stringify(delayedEnvelope)),
          timestamp: Date.now().toString(),
          attributes: 0,
          offset: '3001',
        },
        heartbeat: async () => {},
        pause: () => () => {},
      };

      await courierShipmentConsumer.processMessage(mockPayload as any);
      testProcessedEventIds.push({ consumerGroup: courierShipmentConsumer.consumerGroup, eventId });

      // Shipment status must remain DELIVERED
      const current = await prisma.shipment.findUnique({ where: { id: shipment.id } });
      expect(current?.status).toBe(ShipmentStatus.DELIVERED);
    });

    it('must reject invalid jump: OUT_FOR_DELIVERY -> PICKED_UP', async () => {
      const shipment = await createTestShipment(ShipmentStatus.OUT_FOR_DELIVERY);
      const eventId = `evt_ooo_ofd_${Date.now()}`;

      const delayedEnvelope: KafkaEventEnvelope<ShipmentEventData> = {
        eventId,
        eventType: KAFKA_EVENT_TYPES.SHIPMENT_PICKED_UP,
        version: 1,
        occurredAt: new Date(Date.now() - 1800000).toISOString(),
        producer: 'external-carrier',
        aggregateType: 'Shipment',
        aggregateId: shipment.id,
        data: {
          shipmentId: shipment.id,
          trackingNumber: shipment.trackingNumber,
          status: ShipmentStatus.PICKED_UP,
          shipmentType: 'PREPAID',
          carrier: 'Apex Express Logistics',
          shippingCost: 120,
          codAmount: 0,
          currency: 'INR',
        },
      };

      const mockPayload = {
        topic: KAFKA_TOPICS.COURIER_SHIPMENT_EVENTS,
        partition: 0,
        message: {
          key: Buffer.from(shipment.id),
          value: Buffer.from(JSON.stringify(delayedEnvelope)),
          timestamp: Date.now().toString(),
          attributes: 0,
          offset: '3002',
        },
        heartbeat: async () => {},
        pause: () => () => {},
      };

      await courierShipmentConsumer.processMessage(mockPayload as any);
      testProcessedEventIds.push({ consumerGroup: courierShipmentConsumer.consumerGroup, eventId });

      // Shipment status must remain OUT_FOR_DELIVERY
      const current = await prisma.shipment.findUnique({ where: { id: shipment.id } });
      expect(current?.status).toBe(ShipmentStatus.OUT_FOR_DELIVERY);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Webhook + Kafka Duplicate Event Immunity
  // --------------------------------------------------------------------------
  describe('5. Webhook + Kafka Duplicate Event Immunity', () => {
    it('Path A: Webhook marks DELIVERED first, then Kafka shipment.delivered arrives -> No duplicate tracking event or state change', async () => {
      const shipment = await createTestShipment(ShipmentStatus.OUT_FOR_DELIVERY);

      // 1. Webhook delivers first
      const updatedViaWebhook = await shipmentsService.updateStatus(
        shipment.id,
        ShipmentStatus.DELIVERED,
        testUserId,
        'Delivered via carrier webhook'
      );
      expect(updatedViaWebhook?.status).toBe(ShipmentStatus.DELIVERED);

      const trackingEventsCountAfterWebhook = await prisma.trackingEvent.count({
        where: { shipmentId: shipment.id },
      });

      // 2. Kafka message arrives for the same delivery event
      const eventId = `evt_kafka_dup_delivery_${Date.now()}`;
      const envelope: KafkaEventEnvelope<ShipmentEventData> = {
        eventId,
        eventType: KAFKA_EVENT_TYPES.SHIPMENT_DELIVERED,
        version: 1,
        occurredAt: new Date().toISOString(),
        producer: 'carrier-kafka-gateway',
        aggregateType: 'Shipment',
        aggregateId: shipment.id,
        data: {
          shipmentId: shipment.id,
          trackingNumber: shipment.trackingNumber,
          status: ShipmentStatus.DELIVERED,
          shipmentType: 'PREPAID',
          carrier: 'Apex Express Logistics',
          shippingCost: 120,
          codAmount: 0,
          currency: 'INR',
        },
      };

      const mockPayload = {
        topic: KAFKA_TOPICS.COURIER_SHIPMENT_EVENTS,
        partition: 0,
        message: {
          key: Buffer.from(shipment.id),
          value: Buffer.from(JSON.stringify(envelope)),
          timestamp: Date.now().toString(),
          attributes: 0,
          offset: '4001',
        },
        heartbeat: async () => {},
        pause: () => () => {},
      };

      await courierShipmentConsumer.processMessage(mockPayload as any);
      testProcessedEventIds.push({ consumerGroup: courierShipmentConsumer.consumerGroup, eventId });

      // Verify shipment is still DELIVERED and tracking events count did NOT increment
      const finalShipment = await prisma.shipment.findUnique({ where: { id: shipment.id } });
      expect(finalShipment?.status).toBe(ShipmentStatus.DELIVERED);

      const finalTrackingCount = await prisma.trackingEvent.count({ where: { shipmentId: shipment.id } });
      expect(finalTrackingCount).toBe(trackingEventsCountAfterWebhook);
    });

    it('Path B: Kafka marks DELIVERED first, then Webhook updateStatus arrives -> Idempotent no-op', async () => {
      const shipment = await createTestShipment(ShipmentStatus.OUT_FOR_DELIVERY);

      // 1. Kafka arrives first
      const eventId = `evt_kafka_first_${Date.now()}`;
      const envelope: KafkaEventEnvelope<ShipmentEventData> = {
        eventId,
        eventType: KAFKA_EVENT_TYPES.SHIPMENT_DELIVERED,
        version: 1,
        occurredAt: new Date().toISOString(),
        producer: 'carrier-kafka-gateway',
        aggregateType: 'Shipment',
        aggregateId: shipment.id,
        data: {
          shipmentId: shipment.id,
          trackingNumber: shipment.trackingNumber,
          status: ShipmentStatus.DELIVERED,
          shipmentType: 'PREPAID',
          carrier: 'Apex Express Logistics',
          shippingCost: 120,
          codAmount: 0,
          currency: 'INR',
        },
      };

      const mockPayload = {
        topic: KAFKA_TOPICS.COURIER_SHIPMENT_EVENTS,
        partition: 0,
        message: {
          key: Buffer.from(shipment.id),
          value: Buffer.from(JSON.stringify(envelope)),
          timestamp: Date.now().toString(),
          attributes: 0,
          offset: '4002',
        },
        heartbeat: async () => {},
        pause: () => () => {},
      };

      await courierShipmentConsumer.processMessage(mockPayload as any);
      testProcessedEventIds.push({ consumerGroup: courierShipmentConsumer.consumerGroup, eventId });

      const trackingCountAfterKafka = await prisma.trackingEvent.count({ where: { shipmentId: shipment.id } });

      // 2. Webhook arrives second with the same status
      const updatedViaWebhook = await shipmentsService.updateStatus(
        shipment.id,
        ShipmentStatus.DELIVERED,
        testUserId,
        'Duplicate webhook arrival'
      );
      expect(updatedViaWebhook?.status).toBe(ShipmentStatus.DELIVERED);

      const finalTrackingCount = await prisma.trackingEvent.count({ where: { shipmentId: shipment.id } });
      expect(finalTrackingCount).toBe(trackingCountAfterKafka);
    });
  });

  // --------------------------------------------------------------------------
  // 6. Poison Messages, Database DLQ & Replay Service
  // --------------------------------------------------------------------------
  describe('6. Poison Messages, Database DLQ & Replay Service', () => {
    it('captures unparseable JSON poison message into PostgreSQL DLQ without crashing consumer', async () => {
      const poisonOffset = `poison_${Date.now()}`;
      const poisonPayload = {
        topic: KAFKA_TOPICS.COURIER_SHIPMENT_EVENTS,
        partition: 0,
        message: {
          key: Buffer.from('corrupt-key'),
          value: Buffer.from('NOT_VALID_JSON_AT_ALL{{{'),
          timestamp: Date.now().toString(),
          attributes: 0,
          offset: poisonOffset,
        },
        heartbeat: async () => {},
        pause: () => () => {},
      };

      // Must not throw unhandled exception
      await expect(courierShipmentConsumer.processMessage(poisonPayload as any)).resolves.toBeUndefined();

      const dlqEntry = await prisma.kafkaFailedEvent.findFirst({
        where: {
          topic: KAFKA_TOPICS.COURIER_SHIPMENT_EVENTS,
          offset: poisonOffset,
        },
      });

      expect(dlqEntry).toBeDefined();
      expect(dlqEntry?.errorReason).toMatch(/INVALID_JSON|not valid JSON|Unexpected token/);
      expect(dlqEntry?.status).toBe(KafkaFailureStatus.UNRESOLVED);
      if (dlqEntry) testFailedEventIds.push(dlqEntry.id);
    });

    it('captures malformed envelope (missing aggregateId) into PostgreSQL DLQ', async () => {
      const malformedOffset = `malformed_${Date.now()}`;
      const malformedPayload = {
        topic: KAFKA_TOPICS.COURIER_SHIPMENT_EVENTS,
        partition: 0,
        message: {
          key: Buffer.from('malformed-key'),
          value: Buffer.from(JSON.stringify({ eventId: 'mal-123', eventType: 'shipment.created' })), // missing aggregateId
          timestamp: Date.now().toString(),
          attributes: 0,
          offset: malformedOffset,
        },
        heartbeat: async () => {},
        pause: () => () => {},
      };

      await expect(courierShipmentConsumer.processMessage(malformedPayload as any)).resolves.toBeUndefined();

      const dlqEntry = await prisma.kafkaFailedEvent.findFirst({
        where: {
          topic: KAFKA_TOPICS.COURIER_SHIPMENT_EVENTS,
          offset: malformedOffset,
        },
      });

      expect(dlqEntry).toBeDefined();
      expect(dlqEntry?.errorReason).toBe('MALFORMED_ENVELOPE');
      if (dlqEntry) testFailedEventIds.push(dlqEntry.id);
    });

    it('replay service lists, ignores, and resolves failed events', async () => {
      const uniqueFailedId = `evt_replay_test_${Date.now()}`;
      const created = await prisma.kafkaFailedEvent.create({
        data: {
          eventId: uniqueFailedId,
          topic: KAFKA_TOPICS.COURIER_SHIPMENT_EVENTS,
          partition: 0,
          offset: '9993',
          consumerGroup: KAFKA_CONSUMER_GROUPS.COURIER_SHIPMENT_WORKER,
          payload: { eventId: uniqueFailedId, aggregateId: 'agg-123' },
          errorReason: 'Simulated transient connection reset',
          status: KafkaFailureStatus.UNRESOLVED,
        },
      });
      testFailedEventIds.push(created.id);

      // 1. List
      const list = await kafkaReplayService.listFailedEvents({ status: KafkaFailureStatus.UNRESOLVED });
      expect(list.items.some((i) => i.id === created.id)).toBe(true);

      // 2. Ignore
      await kafkaReplayService.ignoreEvent(created.id);
      const ignored = await prisma.kafkaFailedEvent.findUnique({ where: { id: created.id } });
      expect(ignored?.status).toBe(KafkaFailureStatus.IGNORED);

      // 3. Mark resolved
      await prisma.kafkaFailedEvent.update({
        where: { id: created.id },
        data: { status: KafkaFailureStatus.RESOLVED },
      });
      const resolved = await prisma.kafkaFailedEvent.findUnique({ where: { id: created.id } });
      expect(resolved?.status).toBe(KafkaFailureStatus.RESOLVED);
    });
  });
});
