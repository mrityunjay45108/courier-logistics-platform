import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import request from 'supertest';
import { app } from '../src/app';
import {
  signWebhookPayload,
  verifyWebhookSignature,
  isTimestampValid,
} from '../src/modules/integrations/webhooks/webhook-signer';
import { validateWebhookUrl } from '../src/modules/integrations/webhooks/ssrf.validator';

describe('E-Commerce Webhook Security & Signer', () => {
  const secret = 'whsec_test_secret_key_1234567890abcdef';
  const timestamp = new Date().toISOString();
  const rawPayload = JSON.stringify({
    id: 'evt_test_123',
    event: 'shipment.delivered',
    data: { trackingNumber: 'CRL-TEST1234' },
  });

  it('should sign payload using HMAC-SHA256 correctly', () => {
    const signature = signWebhookPayload(secret, timestamp, rawPayload);
    expect(signature).toBeDefined();
    expect(typeof signature).toBe('string');
    expect(signature.length).toBe(64); // 256 bits = 64 hex chars
  });

  it('should verify signature with timingSafeEqual', () => {
    const signature = signWebhookPayload(secret, timestamp, rawPayload);
    const isValid = verifyWebhookSignature(secret, timestamp, rawPayload, signature);
    expect(isValid).toBe(true);
  });

  it('should reject tampered payload or signature', () => {
    const signature = signWebhookPayload(secret, timestamp, rawPayload);
    const tamperedPayload = JSON.stringify({
      id: 'evt_test_123',
      event: 'shipment.delivered',
      data: { trackingNumber: 'CRL-TAMPERED' },
    });
    const isValid = verifyWebhookSignature(secret, timestamp, tamperedPayload, signature);
    expect(isValid).toBe(false);
  });

  it('should reject invalid secrets', () => {
    const signature = signWebhookPayload(secret, timestamp, rawPayload);
    const isValid = verifyWebhookSignature('wrong_secret', timestamp, rawPayload, signature);
    expect(isValid).toBe(false);
  });

  it('should validate timestamps within tolerance and reject stale ones', () => {
    const nowIso = new Date().toISOString();
    expect(isTimestampValid(nowIso, 300)).toBe(true);

    const oldIso = new Date(Date.now() - 600 * 1000).toISOString(); // 10 minutes ago
    expect(isTimestampValid(oldIso, 300)).toBe(false);
  });
});

describe('SSRF Protection Validator', () => {
  it('should accept valid HTTPS URLs', () => {
    expect(() => validateWebhookUrl('https://api.merchant-ecommerce.com/webhooks')).not.toThrow();
  });

  it('should reject non-HTTP/HTTPS protocols', () => {
    expect(() => validateWebhookUrl('ftp://example.com/webhook')).toThrow(/Unsupported protocol/);
    expect(() => validateWebhookUrl('gopher://example.com/webhook')).toThrow(/Unsupported protocol/);
    expect(() => validateWebhookUrl('file:///etc/passwd')).toThrow(/Unsupported protocol/);
  });

  it('should block cloud metadata IP (169.254.169.254)', () => {
    expect(() => validateWebhookUrl('http://169.254.169.254/latest/meta-data')).toThrow(
      /Cloud metadata endpoints are strictly prohibited/
    );
  });
});

describe('Idempotency Request Fingerprinting', () => {
  it('should generate deterministic canonical hash regardless of key ordering', () => {
    function canonicalize(obj: any): any {
      if (obj === null || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(canonicalize);
      const sortedKeys = Object.keys(obj).sort();
      const result: Record<string, any> = {};
      for (const key of sortedKeys) {
        result[key] = canonicalize(obj[key]);
      }
      return result;
    }

    const payloadA = { b: 2, a: 1, nested: { y: 20, x: 10 } };
    const payloadB = { a: 1, nested: { x: 10, y: 20 }, b: 2 };

    const hashA = crypto.createHash('sha256').update(JSON.stringify(canonicalize(payloadA))).digest('hex');
    const hashB = crypto.createHash('sha256').update(JSON.stringify(canonicalize(payloadB))).digest('hex');

    expect(hashA).toBe(hashB);
  });
});

describe('E-Commerce Server-to-Server API Endpoints', () => {
  const validApiKey = 'ck_live_ecommerce_test_key_2026';

  it('GET /api/pricing/serviceability/800001 should succeed with X-Api-Key', async () => {
    const res = await request(app)
      .get('/api/pricing/serviceability/800001')
      .set('X-Api-Key', validApiKey);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.serviceable).toBe(true);
  });

  it('POST /api/pricing/quote should calculate quote with X-Api-Key', async () => {
    const res = await request(app)
      .post('/api/pricing/quote')
      .set('X-Api-Key', validApiKey)
      .send({
        pickupPincode: '110001',
        deliveryPincode: '800001',
        weight: 1.5,
        length: 20,
        width: 15,
        height: 10,
        shipmentType: 'PREPAID',
        codAmount: 0,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total).toBeGreaterThan(0);
  });

  it('POST /api/shipments should reject request with invalid X-Api-Key', async () => {
    const res = await request(app)
      .post('/api/shipments')
      .set('X-Api-Key', 'invalid_key_12345')
      .send({});

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/integrations/shipments/reconciliation should return paginated records', async () => {
    const res = await request(app)
      .get('/api/integrations/shipments/reconciliation')
      .set('X-Api-Key', validApiKey);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it('GET /api/integrations/webhooks/subscriptions should list client subscriptions', async () => {
    const res = await request(app)
      .get('/api/integrations/webhooks/subscriptions')
      .set('X-Api-Key', validApiKey);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

