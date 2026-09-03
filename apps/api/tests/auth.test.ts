import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { generateAccessToken } from '../src/lib/tokens';

// Mock prisma before importing app
vi.mock('../src/lib/prisma', () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      shipment: {
        findUnique: vi.fn(),
      },
      refreshToken: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
    },
  };
});

import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

describe('Auth & Security Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Input Validation & Security', () => {
    it('POST /api/auth/register should reject empty payload with 422', async () => {
      const response = await request(app).post('/api/auth/register').send({});
      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('POST /api/auth/register should reject invalid email format', async () => {
      const response = await request(app).post('/api/auth/register').send({
        name: 'Test User',
        email: 'invalid-not-an-email',
        password: 'Password@123',
        role: 'CUSTOMER',
      });
      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('POST /api/auth/register should reject weak password', async () => {
      const response = await request(app).post('/api/auth/register').send({
        name: 'Test User',
        email: 'testuser@example.com',
        password: '123',
        role: 'CUSTOMER',
      });
      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('POST /api/auth/login should reject request with missing credentials', async () => {
      const response = await request(app).post('/api/auth/login').send({});
      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Authorization & Route Protection', () => {
    it('GET /api/auth/me should reject request without token with 401', async () => {
      const response = await request(app).get('/api/auth/me');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('GET /api/auth/me should reject request with malformed token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token-string');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('GET /api/delivery-partners/manifest should reject unauthorized role (CUSTOMER) with 403', async () => {
      // Return active customer user from mocked DB
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'cust-uuid-1',
        name: 'Test Customer',
        email: 'customer@courier.local',
        role: 'CUSTOMER',
        isActive: true,
      });

      const customerToken = generateAccessToken({
        userId: 'cust-uuid-1',
        email: 'customer@courier.local',
        role: 'CUSTOMER',
      });

      const response = await request(app)
        .get('/api/delivery-partners/manifest')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Tracking API Foundation', () => {
    it('GET /api/tracking/:trackingNumber should return 404 for unknown shipment', async () => {
      // Mock shipment not found in DB
      (prisma.shipment.findUnique as any).mockResolvedValue(null);

      const response = await request(app).get('/api/tracking/NONEXISTENT999');
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('GET /api/tracking/:trackingNumber should return tracking details when shipment exists', async () => {
      (prisma.shipment.findUnique as any).mockResolvedValue({
        id: 'shipment-1',
        trackingNumber: 'TRK-DEMO-9988',
        destinationAddress: 'Cyber City, Noida',
        carrier: 'Express Prime Logistics',
        status: 'IN_TRANSIT',
        estimatedDelivery: new Date('2026-09-05T10:00:00.000Z'),
        events: [
          {
            id: 'ev-1',
            status: 'IN_TRANSIT',
            location: 'Delhi Hub',
            description: 'In transit',
            timestamp: new Date('2026-09-03T10:00:00.000Z'),
          },
        ],
      });

      const response = await request(app).get('/api/tracking/TRK-DEMO-9988');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.trackingNumber).toBe('TRK-DEMO-9988');
      expect(response.body.data.events).toHaveLength(1);
    });
  });
});
