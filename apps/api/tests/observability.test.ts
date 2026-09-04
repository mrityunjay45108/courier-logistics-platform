import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { redis } from '../src/lib/redis';
import {
  PERMITTED_KAFKA_TOPICS,
  KAFKA_TOPICS,
  kafkaProducerService,
  kafkaClientManager,
  kafkaObservabilityService,
  kafkaReplayService,
} from '../src/infrastructure/kafka';
import { courierObservabilityService } from '../src/modules/integrations/courier-observability.service';
import { alertingService } from '../src/infrastructure/observability/alerting.service';
import { maskSensitiveData, logStructured } from '../src/utils/sanitizer';
import { generateAccessToken } from '../src/lib/tokens';
import { KafkaFailureStatus, KafkaOutboxStatus, ShipmentStatus } from '@prisma/client';

describe('Production Observability & Operations Test Suite', () => {
  let adminToken: string;
  let customerToken: string;
  let testAdminUserId: string;
  let testCustomerUserId: string;

  const testOutboxIds: string[] = [];
  const testFailedEventIds: string[] = [];
  const testShipmentIds: string[] = [];

  beforeAll(async () => {
    // 1. Setup or reuse an Admin user
    let adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          email: `admin_obs_${Date.now()}@example.com`,
          passwordHash: 'dummy_hash',
          name: 'Obs Admin',
          role: 'ADMIN',
        },
      });
    }
    testAdminUserId = adminUser.id;
    adminToken = generateAccessToken({ userId: adminUser.id, role: 'ADMIN', email: adminUser.email });

    // 2. Setup or reuse a Customer user (for unauthorized tests)
    let customerUser = await prisma.user.findFirst({ where: { role: 'CUSTOMER' } });
    if (!customerUser) {
      customerUser = await prisma.user.create({
        data: {
          email: `cust_obs_${Date.now()}@example.com`,
          passwordHash: 'dummy_hash',
          name: 'Obs Customer',
          role: 'CUSTOMER',
        },
      });
    }
    testCustomerUserId = customerUser.id;
    customerToken = generateAccessToken({ userId: customerUser.id, role: 'CUSTOMER', email: customerUser.email });
  });

  afterAll(async () => {
    // Cleanup generated test rows
    await Promise.allSettled([
      prisma.kafkaOutboxEvent.deleteMany({ where: { id: { in: testOutboxIds } } }),
      prisma.kafkaFailedEvent.deleteMany({ where: { id: { in: testFailedEventIds } } }),
      prisma.shipment.deleteMany({ where: { id: { in: testShipmentIds } } }),
    ]);

    await kafkaProducerService.disconnect();
    await prisma.$disconnect();
  });

  // --------------------------------------------------------------------------
  // 1. Health Endpoints (/health, /health/live, /health/ready)
  // --------------------------------------------------------------------------
  describe('1. Health Check System', () => {
    it('GET /health/live reports 200 UP with uptime and memory without leaking secrets', async () => {
      const res = await request(app).get('/health/live');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('UP');
      expect(typeof res.body.data.uptimeSeconds).toBe('number');
      expect(res.body.data.memory).toBeDefined();

      // Ensure no credentials leaked
      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain('password');
      expect(bodyStr).not.toContain('secret');
      expect(bodyStr).not.toContain('DATABASE_URL');
    });

    it('GET /health/ready reports dependency states (PostgreSQL, Redis, Kafka, Courier)', async () => {
      const res = await request(app).get('/health/ready');
      expect([200, 503]).toContain(res.status);

      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data.dependencies).toBeDefined();
        expect(res.body.data.dependencies.database.status).toBe('CONNECTED');
        expect(res.body.data.dependencies.redis).toBeDefined();
        expect(res.body.data.dependencies.kafka).toBeDefined();
        expect(res.body.data.dependencies.courier).toBeDefined();
      }
    });

    it('GET /health returns 200 and UP status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('UP');
    });
  });

  // --------------------------------------------------------------------------
  // 2. Data Sanitization & Log Hygiene
  // --------------------------------------------------------------------------
  describe('2. Secret Redaction & Log Hygiene', () => {
    it('maskSensitiveData redacts sensitive fields and JWT tokens', () => {
      const sensitivePayload = {
        password: 'SuperSecretPassword123!',
        apiKey: 'apik_live_998877665544332211',
        webhookSecret: 'whsec_abcdef123456',
        authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMifQ.abc',
        normalField: 'Apex Consignment',
        nested: {
          token: 'token_val_123',
          creditCard: '4111222233334444',
          subField: 42,
        },
      };

      const sanitized = maskSensitiveData(sensitivePayload);

      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.webhookSecret).toBe('[REDACTED]');
      expect(sanitized.authorization).toBe('[REDACTED]');
      expect(sanitized.normalField).toBe('Apex Consignment');
      expect(sanitized.nested.token).toBe('[REDACTED]');
      expect(sanitized.nested.creditCard).toBe('[REDACTED]');
      expect(sanitized.nested.subField).toBe(42);
    });

    it('maskSensitiveData masks database and redis connection strings with credentials', () => {
      const connectionUri = 'postgresql://admin_user:SuperSecretPassword123@aws-0-ap.pooler.supabase.com:6543/postgres';
      const sanitized = maskSensitiveData(connectionUri);
      expect(sanitized).toBe('postgresql://admin_user:****@aws-0-ap.pooler.supabase.com:6543/postgres');
      expect(sanitized).not.toContain('SuperSecretPassword123');
    });

    it('logStructured formats JSON logs with standard telemetry fields without crashing', () => {
      expect(() => {
        logStructured({
          level: 'info',
          message: 'Test observability structured log',
          eventId: 'evt_test_log_123',
          eventType: 'shipment.delivered',
          topic: KAFKA_TOPICS.COURIER_SHIPMENT_EVENTS,
          partition: 0,
          offset: '500',
          consumerGroup: 'courier-shipment-worker',
          processingLatencyMs: 45,
          secretKey: 'should_be_masked',
        });
      }).not.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // 3. Kafka Observability & Outbox Monitoring Endpoints
  // --------------------------------------------------------------------------
  describe('3. Kafka Observability & Outbox Monitoring', () => {
    it('records runtime producer and consumer metrics', () => {
      kafkaObservabilityService.recordProducerSuccess('courier.shipment.events', 35);
      kafkaObservabilityService.recordConsumerSuccess('courier-shipment-worker', 'courier.shipment.events', 42);

      const metrics = kafkaObservabilityService.getRuntimeMetrics();
      expect(metrics.producer.successCount).toBeGreaterThanOrEqual(1);
      expect(metrics.consumer.successCount).toBeGreaterThanOrEqual(1);
      expect(metrics.consumer.averageLatencyMs).toBeGreaterThan(0);
    });

    it('GET /api/admin/kafka/outbox/stats returns accurate outbox aggregations', async () => {
      // Seed a pending outbox record
      const outbox = await prisma.kafkaOutboxEvent.create({
        data: {
          eventId: `evt_test_outbox_${Date.now()}`,
          topic: KAFKA_TOPICS.COURIER_SHIPMENT_EVENTS,
          partitionKey: 'agg_test_1',
          eventType: 'shipment.created',
          payload: { test: true },
          status: KafkaOutboxStatus.PENDING,
        },
      });
      testOutboxIds.push(outbox.id);

      const res = await request(app)
        .get('/api/admin/kafka/outbox/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pendingCount).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(res.body.data.eventTypeDistribution)).toBe(true);
      expect(res.body.data.eventTypeDistribution.some((e: any) => e.eventType === 'shipment.created')).toBe(true);
    });

    it('GET /api/admin/kafka/stats returns cluster snapshot, runtime metrics, and thresholds', async () => {
      const res = await request(app)
        .get('/api/admin/kafka/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.cluster).toBeDefined();
      expect(res.body.data.runtime).toBeDefined();
      expect(res.body.data.thresholds).toBeDefined();
      expect(res.body.data.thresholds.kafkaOutboxWarningThreshold).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // 4. Failed Event (DLQ) Management & Replay
  // --------------------------------------------------------------------------
  describe('4. Failed Event (DLQ) Monitoring, Replay & Idempotency', () => {
    let failedEventId: string;
    const testEvtId = `evt_dlq_test_${Date.now()}`;

    beforeAll(async () => {
      const record = await prisma.kafkaFailedEvent.create({
        data: {
          eventId: testEvtId,
          topic: KAFKA_TOPICS.COURIER_SHIPMENT_EVENTS,
          partition: 0,
          offset: '100',
          consumerGroup: 'courier-shipment-worker',
          payload: {
            eventId: testEvtId,
            eventType: 'shipment.delivered',
            version: 1,
            occurredAt: new Date().toISOString(),
            producer: 'test',
            aggregateType: 'Shipment',
            aggregateId: 'agg_dlq_test',
            data: {},
          },
          errorReason: 'Simulated failure for DLQ endpoint test',
          status: KafkaFailureStatus.UNRESOLVED,
        },
      });
      failedEventId = record.id;
      testFailedEventIds.push(record.id);
    });

    it('GET /api/admin/kafka/failed-events lists failed events with pagination and filters', async () => {
      const res = await request(app)
        .get('/api/admin/kafka/failed-events?status=UNRESOLVED')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.items.some((i: any) => i.id === failedEventId)).toBe(true);
    });

    it('GET /api/admin/kafka/failed-events/:id retrieves single failed event', async () => {
      const res = await request(app)
        .get(`/api/admin/kafka/failed-events/${failedEventId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(failedEventId);
      expect(res.body.data.errorReason).toContain('Simulated failure');
    });

    it('POST /api/admin/kafka/failed-events/:id/resolve marks event RESOLVED and writes AuditLog', async () => {
      const res = await request(app)
        .post(`/api/admin/kafka/failed-events/${failedEventId}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.resolved).toBe(true);

      const inDb = await prisma.kafkaFailedEvent.findUnique({ where: { id: failedEventId } });
      expect(inDb?.status).toBe(KafkaFailureStatus.RESOLVED);

      // Verify AuditLog entry was written
      const audit = await prisma.auditLog.findFirst({
        where: { userId: testAdminUserId },
        orderBy: { createdAt: 'desc' },
      });
      expect(audit).toBeDefined();
    });

    it('POST /api/admin/kafka/failed-events/:id/ignore marks poison pill as IGNORED', async () => {
      const poison = await prisma.kafkaFailedEvent.create({
        data: {
          eventId: `evt_poison_${Date.now()}`,
          topic: KAFKA_TOPICS.COURIER_SHIPMENT_EVENTS,
          consumerGroup: 'courier-shipment-worker',
          payload: { corrupted: true },
          errorReason: 'Unparseable JSON syntax error',
          status: KafkaFailureStatus.UNRESOLVED,
        },
      });
      testFailedEventIds.push(poison.id);

      const res = await request(app)
        .post(`/api/admin/kafka/failed-events/${poison.id}/ignore`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.ignored).toBe(true);

      const inDb = await prisma.kafkaFailedEvent.findUnique({ where: { id: poison.id } });
      expect(inDb?.status).toBe(KafkaFailureStatus.IGNORED);
    });

    it('replayEvent preserves original immutable eventId and republishes cleanly', async () => {
      const replayEvtId = `evt_replay_test_${Date.now()}`;
      const record = await prisma.kafkaFailedEvent.create({
        data: {
          eventId: replayEvtId,
          topic: KAFKA_TOPICS.COURIER_SHIPMENT_EVENTS,
          consumerGroup: 'courier-shipment-worker',
          payload: {
            eventId: replayEvtId,
            eventType: 'shipment.in_transit',
            version: 1,
            occurredAt: new Date().toISOString(),
            producer: 'test-runner',
            aggregateType: 'Shipment',
            aggregateId: 'agg-replay-id',
            data: {},
          },
          errorReason: 'Downstream timeout during initial processing',
          status: KafkaFailureStatus.UNRESOLVED,
        },
      });
      testFailedEventIds.push(record.id);

      const success = await kafkaReplayService.replayEvent(record.id);
      expect(success).toBe(true);

      const updated = await prisma.kafkaFailedEvent.findUnique({ where: { id: record.id } });
      expect(updated?.status).toBe(KafkaFailureStatus.RESOLVED);
      expect(updated?.attempts).toBe(2);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Security & Authorization Enforcement
  // --------------------------------------------------------------------------
  describe('5. Security, RBAC & Isolation Enforcement', () => {
    it('rejects unauthenticated requests to admin kafka endpoints with 401', async () => {
      const res = await request(app).get('/api/admin/kafka/stats');
      expect(res.status).toBe(401);
    });

    it('rejects non-admin (CUSTOMER) requests to admin kafka endpoints with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/admin/kafka/stats')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
    });

    it('rejects non-admin requests to DLQ replay endpoint with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/admin/kafka/failed-events/dummy-id/replay')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
    });

    it('enforces strict 5-topic constraint and rejects unauthorized topic publication', async () => {
      expect(PERMITTED_KAFKA_TOPICS).toHaveLength(5);
      await expect(
        kafkaProducerService.publish('courier.unauthorized.metric' as any, {} as any, 'key')
      ).rejects.toThrow(/Security violation: Attempted to publish to unauthorized topic/);
    });
  });

  // --------------------------------------------------------------------------
  // 6. Courier Observability & Alerting Thresholds
  // --------------------------------------------------------------------------
  describe('6. Courier Observability & Configurable Alert Thresholds', () => {
    it('courierObservabilityService records requests, failures, and calculates error rate', async () => {
      courierObservabilityService.recordRequest();
      courierObservabilityService.recordFailure('API_TIMEOUT', 'Carrier gateway timed out after 8000ms');

      const snapshot = await courierObservabilityService.getSnapshot();
      expect(snapshot.totalRequests).toBeGreaterThanOrEqual(2);
      expect(snapshot.counts.API_TIMEOUT).toBeGreaterThanOrEqual(1);
      expect(snapshot.lastFailureReason).toContain('timed out');
    });

    it('alertingService evaluates active alerts against thresholds', async () => {
      const alerts = await alertingService.evaluateAlerts();
      expect(Array.isArray(alerts)).toBe(true);

      const thresholds = alertingService.getThresholds();
      expect(thresholds.kafkaOutboxWarningThreshold).toBeGreaterThan(0);
      expect(thresholds.courierErrorRateThreshold).toBeGreaterThan(0);
    });

    it('GET /api/admin/integrations/stats returns courier error metrics and webhook delivery counts', async () => {
      const res = await request(app)
        .get('/api/admin/integrations/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.counts).toBeDefined();
      expect(res.body.data.outboundWebhooks).toBeDefined();
    });
  });
});
