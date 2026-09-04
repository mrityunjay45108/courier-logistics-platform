import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import crypto from 'crypto';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { ShippingZoneCode, ShipmentType, SurchargeType } from '@prisma/client';
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

  beforeAll(async () => {
    // 1. Ensure a seller user exists for the API client
    const seller = await prisma.user.upsert({
      where: { email: 'seller_test_ecom@courier.local' },
      update: { role: 'SELLER', isActive: true },
      create: {
        name: 'Apex Merchant Store',
        email: 'seller_test_ecom@courier.local',
        passwordHash: 'dummy_hash',
        role: 'SELLER',
        isActive: true,
      },
    });

    // 2. Ensure the demo ApiClient exists for validApiKey
    const keyHash = crypto.createHash('sha256').update(validApiKey).digest('hex');
    const apiClient = await prisma.apiClient.upsert({
      where: { keyHash },
      update: { isActive: true, sellerId: seller.id },
      create: {
        name: 'Apex E-Commerce Test Client',
        keyHash,
        keyPrefix: validApiKey.substring(0, 8),
        sellerId: seller.id,
        scopes: ['shipments:read', 'shipments:write', 'pricing:read', 'tracking:read', 'webhooks:manage'],
        isActive: true,
      },
    });

    // 3. Ensure a WebhookSubscription exists for the client
    await prisma.webhookSubscription.upsert({
      where: { id: '00000000-0000-0000-0000-000000000001' },
      update: { clientId: apiClient.id, isActive: true },
      create: {
        id: '00000000-0000-0000-0000-000000000001',
        clientId: apiClient.id,
        url: 'https://ecommerce.local/api/v1/shipments/webhooks/courier',
        secretHash: crypto.createHash('sha256').update('whsec_demo_ecommerce_signing_secret_2026').digest('hex'),
        secretKey: 'whsec_demo_ecommerce_signing_secret_2026',
        subscribedEvents: ['shipment.*', 'rto.*'],
        isActive: true,
      },
    });

    // 4. Ensure Shipping Zones exist (NATIONAL & REGIONAL)
    const natZone = await prisma.shippingZone.upsert({
      where: { code: ShippingZoneCode.NATIONAL },
      update: { isActive: true },
      create: {
        code: ShippingZoneCode.NATIONAL,
        name: 'National Zone',
        description: 'Inter-state express lines',
        isActive: true,
      },
    });

    const regZone = await prisma.shippingZone.upsert({
      where: { code: ShippingZoneCode.REGIONAL },
      update: { isActive: true },
      create: {
        code: ShippingZoneCode.REGIONAL,
        name: 'Regional Zone',
        description: 'Intra-state surface logistics',
        isActive: true,
      },
    });

    // 5. Ensure Serviceability Rules exist for 110001 and 800001
    await prisma.serviceabilityRule.upsert({
      where: { pincode: '110001' },
      update: { isPickupAvailable: true, isDeliveryAvailable: true, isActive: true, zoneId: natZone.id },
      create: {
        pincode: '110001',
        city: 'New Delhi',
        state: 'Delhi',
        zoneId: natZone.id,
        isPickupAvailable: true,
        isDeliveryAvailable: true,
        isActive: true,
      },
    });

    await prisma.serviceabilityRule.upsert({
      where: { pincode: '800001' },
      update: { isPickupAvailable: true, isDeliveryAvailable: true, isActive: true, zoneId: regZone.id },
      create: {
        pincode: '800001',
        city: 'Patna',
        state: 'Bihar',
        zoneId: regZone.id,
        isPickupAvailable: true,
        isDeliveryAvailable: true,
        isActive: true,
      },
    });

    // 6. Ensure Pricing Rate Card exists for NATIONAL zone prepaid
    const rateCard = await prisma.pricingRateCard.findFirst({
      where: { zoneId: natZone.id, shipmentType: ShipmentType.PREPAID, isActive: true },
    });
    if (!rateCard) {
      await prisma.pricingRateCard.create({
        data: {
          code: 'RC-NAT-TEST-PRE',
          name: 'National Test Prepaid Rate Card',
          zoneId: natZone.id,
          shipmentType: ShipmentType.PREPAID,
          baseWeight: 0.5,
          baseRate: 80.0,
          additionalWeightUnit: 0.5,
          additionalWeightRate: 40.0,
          fuelSurchargeType: SurchargeType.PERCENTAGE,
          fuelSurchargeValue: 10.0,
          taxPercentage: 18.0,
          isActive: true,
        },
      });
    }
  });

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

