import { describe, it, expect, afterAll } from 'vitest';
import { redis } from '../src/lib/redis';
import { pricingService } from '../src/modules/pricing/pricing.service';

describe('Production Redis & Upstash Integration', () => {
  const testKey = `test:courier:suite:${Date.now()}`;

  afterAll(async () => {
    await redis.del(testKey);
    await redis.disconnect();
  });

  it('redis.ping() should report CONNECTED status and live latency', async () => {
    const health = await redis.ping();
    expect(health.status).toBe('CONNECTED');
    expect(health.latencyMs).toBeGreaterThan(0);
    expect(health.provider).toContain('Upstash');
  });

  it('redis.set() and redis.get() should store and retrieve JSON objects', async () => {
    const testPayload = {
      orderId: 'ORD-999',
      zone: 'REGIONAL',
      chargeableWeight: 2.5,
      active: true,
    };

    await redis.set(testKey, testPayload, 60);
    const retrieved = await redis.get<typeof testPayload>(testKey);

    expect(retrieved).toBeDefined();
    expect(retrieved?.orderId).toBe('ORD-999');
    expect(retrieved?.zone).toBe('REGIONAL');
    expect(retrieved?.active).toBe(true);
  });

  it('redis.exists() and redis.del() should handle lifecycle correctly', async () => {
    const key = `${testKey}:del_test`;
    await redis.set(key, 'value_to_delete', 60);

    const existsBefore = await redis.exists(key);
    expect(existsBefore).toBe(true);

    await redis.del(key);
    const existsAfter = await redis.exists(key);
    expect(existsAfter).toBe(false);
  });

  it('redis.incr() should atomically increment counters', async () => {
    const counterKey = `${testKey}:counter`;
    await redis.del(counterKey);

    const count1 = await redis.incr(counterKey);
    expect(count1).toBe(1);

    const count2 = await redis.incr(counterKey);
    expect(count2).toBe(2);

    await redis.del(counterKey);
  });

  it('Redis caching should store and retrieve pincode serviceability data with TTL', async () => {
    const pincode = '800001';
    const cacheKey = `courier:pincode:${pincode}`;

    const mockServiceability = {
      serviceable: true,
      pincode: '800001',
      city: 'Patna',
      state: 'Bihar',
      zone: 'REGIONAL',
      isPickupAvailable: true,
      isDeliveryAvailable: true,
    };

    await redis.set(cacheKey, mockServiceability, 60);
    const cachedData = await redis.get<typeof mockServiceability>(cacheKey);

    expect(cachedData).toBeDefined();
    expect(cachedData?.serviceable).toBe(true);
    expect(cachedData?.city).toBe('Patna');
    expect(cachedData?.zone).toBe('REGIONAL');

    await redis.del(cacheKey);
  });
});
