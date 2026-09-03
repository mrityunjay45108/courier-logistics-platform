import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

// Mock prisma for isolated health checks
vi.mock('../src/lib/prisma', () => {
  return {
    prisma: {
      $queryRaw: vi.fn().mockResolvedValue([{ '1': 1 }]),
    },
  };
});

import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

describe('Health & Diagnostic Endpoints', () => {
  it('GET /health should return 200 and UP status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('UP');
  });

  it('GET /ready should return 200 when database responds', async () => {
    (prisma.$queryRaw as any).mockResolvedValue([{ '1': 1 }]);
    const response = await request(app).get('/ready');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('READY');
    expect(response.body.data.database).toBe('CONNECTED');
  });

  it('GET /ready should return 503 when database query fails', async () => {
    (prisma.$queryRaw as any).mockRejectedValue(new Error('Connection timeout'));
    const response = await request(app).get('/ready');
    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
  });

  it('GET /version should return 200 with service metadata', async () => {
    const response = await request(app).get('/version');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('courier-logistics-api');
    expect(response.body.data.version).toBe('1.0.0');
  });

  it('GET /non-existent-route should return standard 404', async () => {
    const response = await request(app).get('/api/invalid-route-12345');
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
  });
});
