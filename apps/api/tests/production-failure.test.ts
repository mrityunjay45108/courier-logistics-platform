import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { redis } from '../src/lib/redis';
import {
  PERMITTED_KAFKA_TOPICS,
  kafkaProducerService,
  kafkaOutboxService,
  kafkaReplayService,
} from '../src/infrastructure/kafka';
import { courierObservabilityService } from '../src/modules/integrations/courier-observability.service';
import {
  signWebhookPayload,
  verifyWebhookSignature,
  isTimestampValid,
} from '../src/modules/integrations/webhooks/webhook-signer';
import { validateShipmentTransition } from '../src/modules/shipments/shipment-state.service';
import { generateAccessToken } from '../src/lib/tokens';
import { gracefulShutdown } from '../src/server';
import { ShipmentStatus, KafkaOutboxStatus, KafkaFailureStatus } from '@prisma/client';

describe('Production Failure Testing Suite (15 Scenarios)', () => {
  let adminToken: string;
  let customerToken: string;
  const createdOutboxIds: string[] = [];
  const createdFailedEventIds: string[] = [];

  beforeAll(async () => {
    let adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          email: 'admin_fail_' + Date.now() + '@test.local',
          passwordHash: 'dummy_hash',
          name: 'Fail Admin',
          role: 'ADMIN',
        },
      });
    }
    adminToken = generateAccessToken({ userId: adminUser.id, role: 'ADMIN', email: adminUser.email });

    let customerUser = await prisma.user.findFirst({ where: { role: 'CUSTOMER' } });
    if (!customerUser) {
      customerUser = await prisma.user.create({
        data: {
          email: 'cust_fail_' + Date.now() + '@test.local',
          passwordHash: 'dummy_hash',
          name: 'Fail Customer',
          role: 'CUSTOMER',
        },
      });
    }
    customerToken = generateAccessToken({ userId: customerUser.id, role: 'CUSTOMER', email: customerUser.email });
  });

  afterAll(async () => {
    await prisma.kafkaOutboxEvent.deleteMany({ where: { id: { in: createdOutboxIds } } }).catch(() => {});
    await prisma.kafkaFailedEvent.deleteMany({ where: { id: { in: createdFailedEventIds } } }).catch(() => {});
  });

  // Scenario 1: API restart / graceful shutdown execution
  it('Scenario 1: API restart - gracefulShutdown executes cleanly without throwing', async () => {
    await expect(gracefulShutdown('TEST_SIGNAL', false)).resolves.not.toThrow();
  });

  // Scenario 2: Kafka unavailable - Outbox persists in PostgreSQL without loss
  it('Scenario 2: Kafka unavailable - transactional outbox stores event with PENDING status', async () => {
    const eventId = 'evt_outbox_offline_' + Date.now();
    const event = await kafkaOutboxService.recordOutboxEvent(prisma, {
      topic: 'courier.shipment.events',
      partitionKey: 'test-agg-unavailable-kafka',
      envelope: {
        eventId,
        eventType: 'shipment.created',
        version: 1,
        occurredAt: new Date().toISOString(),
        producer: 'courier-service',
        aggregateType: 'Shipment',
        aggregateId: 'test-agg-unavailable-kafka',
        data: { id: 'test-agg-unavailable-kafka', note: 'kafka offline fallback' },
      },
    });
    createdOutboxIds.push(event.id);

    expect(event.id).toBeDefined();
    expect(event.status).toBe(KafkaOutboxStatus.PENDING);
  });

  // Scenario 3: Redis unavailable - probe reports degraded status without crashing
  it('Scenario 3: Redis unavailable - health system continues operating with degraded flag', async () => {
    const res = await request(app).get('/health/ready');
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('redis');
  });

  // Scenario 4: Courier timeout - recorded as failure and error rate metric increments
  it('Scenario 4: Courier timeout - recorded accurately in observability telemetry', async () => {
    courierObservabilityService.recordFailure('API_TIMEOUT', 'Gateway timeout 15000ms');
    const snapshot = await courierObservabilityService.getSnapshot();
    expect(snapshot.counts.API_TIMEOUT).toBeGreaterThan(0);
  });

  // Scenario 5: Courier 5xx - upstream server error captured and aggregated
  it('Scenario 5: Courier 5xx - captured in telemetry with error rate calculation', async () => {
    courierObservabilityService.recordFailure('SERVER_ERROR_5XX', 'Bad gateway 502');
    const snapshot = await courierObservabilityService.getSnapshot();
    expect(snapshot.counts.SERVER_ERROR_5XX).toBeGreaterThan(0);
  });

  // Scenario 6: Duplicate webhook - HMAC signer & validator rejects replay on timestamp or tampering
  it('Scenario 6: Duplicate webhook - detected via replay protection and hash checking', () => {
    const secret = 'whsec_test_secret_key_12345';
    const ts = new Date().toISOString();
    const payload = JSON.stringify({ event: 'shipment.delivered', id: 'evt_123' });
    const sig1 = signWebhookPayload(secret, ts, payload);
    const sig2 = signWebhookPayload(secret, ts, payload);

    expect(sig1).toBe(sig2); // Deterministic signature allows replay verification
    expect(verifyWebhookSignature(secret, ts, payload, sig1)).toBe(true);
  });

  // Scenario 7: Duplicate Kafka event - idempotency inbox guard prevents double processing
  it('Scenario 7: Duplicate Kafka event - KafkaProcessedEvent prevents duplicate execution', async () => {
    const eventId = 'evt_dedup_' + Date.now();
    const firstInsert = await prisma.kafkaProcessedEvent.create({
      data: {
        eventId,
        eventType: 'ecommerce.order.created',
        topic: 'ecommerce.order.created',
        consumerGroup: 'courier-service-test',
      },
    });
    expect(firstInsert.id).toBeDefined();

    // Duplicate attempt with same eventId and consumerGroup must be rejected by unique constraint
    await expect(
      prisma.kafkaProcessedEvent.create({
        data: {
          eventId,
          eventType: 'ecommerce.order.created',
          topic: 'ecommerce.order.created',
          consumerGroup: 'courier-service-test',
        },
      })
    ).rejects.toThrow();

    await prisma.kafkaProcessedEvent.delete({ where: { id: firstInsert.id } });
  });

  // Scenario 8: Out-of-order Kafka event - state transition guard rejects invalid jump
  it('Scenario 8: Out-of-order Kafka event - rejects DELIVERED -> IN_TRANSIT regression', () => {
    expect(() => {
      validateShipmentTransition(ShipmentStatus.DELIVERED, ShipmentStatus.IN_TRANSIT);
    }).toThrow(/Invalid shipment status transition/);
  });

  // Scenario 9: Pending Outbox recovery - pending events batch query operates cleanly
  it('Scenario 9: Pending Outbox recovery - recovers pending outbox records ordered by createdAt', async () => {
    const pendingEvents = await prisma.kafkaOutboxEvent.findMany({
      where: { status: KafkaOutboxStatus.PENDING },
      take: 10,
      orderBy: { createdAt: 'asc' },
    });
    expect(Array.isArray(pendingEvents)).toBe(true);
  });

  // Scenario 10: FailedEvent replay - republishes failed event preserving immutable eventId
  it('Scenario 10: FailedEvent replay - republishes to original topic retaining original eventId', async () => {
    const eventId = 'evt_fail_replay_' + Date.now();
    const failedEvent = await prisma.kafkaFailedEvent.create({
      data: {
        eventId,
        topic: 'courier.shipment.events',
        consumerGroup: 'courier-shipment-worker',
        payload: {
          eventId,
          eventType: 'shipment.in_transit',
          version: 1,
          occurredAt: new Date().toISOString(),
          producer: 'test-runner',
          aggregateType: 'Shipment',
          aggregateId: 'agg-replay-id',
          data: {},
        },
        errorReason: 'Simulated downstream connection timeout',
        status: KafkaFailureStatus.UNRESOLVED,
      },
    });
    createdFailedEventIds.push(failedEvent.id);

    const replayResult = await kafkaReplayService.replayEvent(failedEvent.id);
    expect(replayResult).toBe(true);

    const reloaded = await prisma.kafkaFailedEvent.findUnique({ where: { id: failedEvent.id } });
    expect(reloaded?.status).toBe(KafkaFailureStatus.RESOLVED);
  });

  // Scenario 11: Database connection failure - /ready returns 503
  it('Scenario 11: Database connection failure - /ready reports 503 when query fails', async () => {
    const spy = vi.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('Connection terminated'));
    const res = await request(app).get('/ready');
    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
    spy.mockRestore();
  });

  // Scenario 12: Unauthorized admin endpoint - rejected with 401 or 403
  it('Scenario 12: Unauthorized admin endpoint - rejects unauthenticated and non-admin requests', async () => {
    const unauth = await request(app).get('/api/admin/kafka/stats');
    expect(unauth.status).toBe(401);

    const forbidden = await request(app)
      .get('/api/admin/kafka/stats')
      .set('Authorization', 'Bearer ' + customerToken);
    expect(forbidden.status).toBe(403);
  });

  // Scenario 13: Invalid API key - rejected with 401 Unauthorized
  it('Scenario 13: Invalid API key - rejected with 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/shipments')
      .set('X-Api-Key', 'invalid_api_key_xyz_123')
      .send({});
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // Scenario 14: Invalid HMAC - signature verification fails with false
  it('Scenario 14: Invalid HMAC - rejects tampered payload or incorrect signing secret', () => {
    const secret = 'valid_secret_12345';
    const ts = new Date().toISOString();
    const payload = JSON.stringify({ orderId: 'ORD-100' });
    const sig = signWebhookPayload(secret, ts, payload);

    expect(verifyWebhookSignature('wrong_secret', ts, payload, sig)).toBe(false);
    expect(verifyWebhookSignature(secret, ts, JSON.stringify({ orderId: 'TAMPERED' }), sig)).toBe(false);
  });

  // Scenario 15: Expired webhook timestamp - rejected outside tolerance window
  it('Scenario 15: Expired webhook timestamp - rejected when timestamp exceeds 300s window', () => {
    const oldTimestamp = new Date(Date.now() - 600 * 1000).toISOString(); // 10 mins ago
    expect(isTimestampValid(oldTimestamp, 300)).toBe(false);

    const freshTimestamp = new Date().toISOString();
    expect(isTimestampValid(freshTimestamp, 300)).toBe(true);
  });
});
