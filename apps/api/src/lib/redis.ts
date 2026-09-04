import Redis, { RedisOptions } from 'ioredis';
import { Redis as UpstashRestClient } from '@upstash/redis';
import { config } from '../config';

/**
 * Production Redis Client & Cache Manager
 * Automatically supports Upstash REST SDK and standard ioredis TCP/TLS
 */
class RedisService {
  private ioRedis: Redis | null = null;
  private upstashRest: UpstashRestClient | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.initClients();
  }

  private initClients() {
    // 1. Initialize Upstash REST Client if credentials are provided
    if (config.upstashRedisRestUrl && config.upstashRedisRestToken) {
      try {
        this.upstashRest = new UpstashRestClient({
          url: config.upstashRedisRestUrl,
          token: config.upstashRedisRestToken,
        });
        console.log('✅ Upstash Redis REST client initialized');
      } catch (err: any) {
        console.warn('⚠️ Could not initialize Upstash REST client:', err.message);
      }
    }

    // 2. Initialize ioredis if no Upstash REST or if specific TCP Redis is configured
    const redisUrl = config.redisUrl;
    if (redisUrl && !this.upstashRest) {
      try {
        const urlObj = new URL(redisUrl);
        const isTls = redisUrl.startsWith('rediss://') || redisUrl.includes('upstash.io');

        const options: RedisOptions = {
          lazyConnect: true,
          connectTimeout: 8000,
          maxRetriesPerRequest: 2,
          enableReadyCheck: true,
          retryStrategy(times) {
            if (times > 5) return null;
            return Math.min(times * 100, 2000);
          },
        };

        if (isTls) {
          options.tls = {
            servername: urlObj.hostname,
          };
        }

        this.ioRedis = new Redis(redisUrl, options);

        this.ioRedis.on('connect', () => {
          this.isConnected = true;
          console.log('✅ Connected to Redis (TCP/TLS)');
        });

        this.ioRedis.on('error', (err) => {
          this.isConnected = false;
        });

        this.ioRedis.on('close', () => {
          this.isConnected = false;
        });
      } catch (err: any) {
        console.warn('⚠️ Could not initialize ioredis client:', err.message);
      }
    }
  }

  /**
   * Get value from Redis cache (JSON deserialized if applicable)
   */
  async get<T = any>(key: string): Promise<T | null> {
    // Upstash REST
    if (this.upstashRest) {
      try {
        const val = await this.upstashRest.get<T>(key);
        return val ?? null;
      } catch (err: any) {
        console.warn(`⚠️ Upstash REST GET error for '${key}':`, err.message);
      }
    }

    // ioredis
    if (this.ioRedis) {
      try {
        const raw = await this.ioRedis.get(key);
        if (raw === null) return null;
        try {
          return JSON.parse(raw) as T;
        } catch {
          return raw as unknown as T;
        }
      } catch (err: any) {
        console.warn(`⚠️ Redis GET error for '${key}':`, err.message);
      }
    }

    return null;
  }

  /**
   * Set value in Redis with optional TTL in seconds
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    // Upstash REST
    if (this.upstashRest) {
      try {
        if (ttlSeconds && ttlSeconds > 0) {
          await this.upstashRest.set(key, value, { ex: ttlSeconds });
        } else {
          await this.upstashRest.set(key, value);
        }
        return true;
      } catch (err: any) {
        console.warn(`⚠️ Upstash REST SET error for '${key}':`, err.message);
      }
    }

    // ioredis
    if (this.ioRedis) {
      try {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        if (ttlSeconds && ttlSeconds > 0) {
          await this.ioRedis.set(key, serialized, 'EX', ttlSeconds);
        } else {
          await this.ioRedis.set(key, serialized);
        }
        return true;
      } catch (err: any) {
        console.warn(`⚠️ Redis SET error for '${key}':`, err.message);
      }
    }

    return false;
  }

  /**
   * Delete one or multiple keys
   */
  async del(key: string | string[]): Promise<number> {
    const keys = Array.isArray(key) ? key : [key];
    if (keys.length === 0) return 0;

    if (this.upstashRest) {
      try {
        return await this.upstashRest.del(...keys);
      } catch (err: any) {
        console.warn(`⚠️ Upstash REST DEL error:`, err.message);
      }
    }

    if (this.ioRedis) {
      try {
        return await this.ioRedis.del(...keys);
      } catch (err: any) {
        console.warn(`⚠️ Redis DEL error:`, err.message);
      }
    }

    return 0;
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    if (this.upstashRest) {
      try {
        const count = await this.upstashRest.exists(key);
        return count > 0;
      } catch (err: any) {
        console.warn(`⚠️ Upstash REST EXISTS error for '${key}':`, err.message);
      }
    }

    if (this.ioRedis) {
      try {
        const count = await this.ioRedis.exists(key);
        return count > 0;
      } catch (err: any) {
        console.warn(`⚠️ Redis EXISTS error for '${key}':`, err.message);
      }
    }

    return false;
  }

  /**
   * Increment a key atomically
   */
  async incr(key: string): Promise<number> {
    if (this.upstashRest) {
      try {
        return await this.upstashRest.incr(key);
      } catch (err: any) {
        console.warn(`⚠️ Upstash REST INCR error for '${key}':`, err.message);
      }
    }

    if (this.ioRedis) {
      try {
        return await this.ioRedis.incr(key);
      } catch (err: any) {
        console.warn(`⚠️ Redis INCR error for '${key}':`, err.message);
      }
    }

    return 0;
  }

  /**
   * Ping Redis to verify connectivity and latency
   */
  async ping(): Promise<{ status: 'CONNECTED' | 'DISCONNECTED'; latencyMs: number; provider: string }> {
    const start = Date.now();

    // 1. Upstash REST
    if (this.upstashRest) {
      try {
        const res = await this.upstashRest.ping();
        if (res === 'PONG') {
          return {
            status: 'CONNECTED',
            latencyMs: Date.now() - start,
            provider: 'Upstash Redis (REST / HTTPS)',
          };
        }
      } catch (err: any) {
        console.warn('⚠️ Upstash REST ping failed:', err.message);
      }
    }

    // 2. ioredis
    if (this.ioRedis) {
      try {
        const res = await this.ioRedis.ping();
        if (res === 'PONG') {
          return {
            status: 'CONNECTED',
            latencyMs: Date.now() - start,
            provider: 'Redis (TCP/TLS)',
          };
        }
      } catch (err: any) {
        console.warn('⚠️ ioredis ping failed:', err.message);
      }
    }

    return {
      status: 'DISCONNECTED',
      latencyMs: Date.now() - start,
      provider: 'None',
    };
  }

  /**
   * Graceful shutdown
   */
  async disconnect(): Promise<void> {
    if (this.ioRedis) {
      try {
        await this.ioRedis.quit();
      } catch {
        this.ioRedis.disconnect();
      }
    }
  }
}

export const redis = new RedisService();
