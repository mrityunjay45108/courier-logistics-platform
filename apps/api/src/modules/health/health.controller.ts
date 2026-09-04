import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { kafkaClientManager } from '../../infrastructure/kafka/kafka.client';
import { courierObservabilityService } from '../integrations/courier-observability.service';
import { sendSuccess, sendError } from '../../utils/response';
import { maskSensitiveData } from '../../utils/sanitizer';

/**
 * Liveness Probe: Verifies application process is running and not deadlocked
 * GET /health, GET /health/live, GET /live
 */
export async function getLiveness(req: Request, res: Response): Promise<void> {
  const memory = process.memoryUsage();
  const data = {
    status: 'UP',
    uptimeSeconds: Math.floor(process.uptime()),
    memory: {
      rssMb: Math.round(memory.rss / 1024 / 1024),
      heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
    },
    timestamp: new Date().toISOString(),
  };

  sendSuccess(res, data, 'Application process is healthy and alive');
}

/**
 * Readiness Probe: Deep check of all external infrastructure dependencies
 * GET /health/ready, GET /ready
 */
export async function getReadiness(req: Request, res: Response): Promise<void> {
  const checks: Record<string, any> = {};
  let isDbHealthy = false;
  let dbLatencyMs = 0;

  // 1. PostgreSQL Database Check (Critical)
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    isDbHealthy = true;
    dbLatencyMs = Date.now() - dbStart;
    checks.database = {
      status: 'CONNECTED',
      latencyMs: dbLatencyMs,
    };
  } catch (err: any) {
    checks.database = {
      status: 'DISCONNECTED',
      error: 'PostgreSQL connection failure',
    };
  }

  // 2. Redis Cache & Replay Protection Check
  try {
    const redisHealth = await redis.ping();
    checks.redis = {
      status: redisHealth.status,
      latencyMs: redisHealth.latencyMs,
      provider: redisHealth.provider,
    };
  } catch {
    checks.redis = {
      status: 'DISCONNECTED',
      latencyMs: 0,
      provider: 'none',
    };
  }

  // 3. Kafka Streaming Check
  try {
    const kafkaHealth = await kafkaClientManager.checkHealth();
    checks.kafka = {
      status: kafkaHealth.status,
      latencyMs: kafkaHealth.latencyMs,
      topicLimit: '5/5 (Strict)',
    };
  } catch {
    checks.kafka = {
      status: 'DISCONNECTED',
      latencyMs: 0,
      topicLimit: '5/5 (Strict)',
    };
  }

  // 4. Courier Integrations Check
  try {
    const courierHealth = await courierObservabilityService.checkHealth();
    checks.courier = {
      status: courierHealth.status,
      errorRate: courierHealth.errorRate,
      failedWebhooks: courierHealth.failedWebhooks,
    };
  } catch {
    checks.courier = {
      status: 'UNKNOWN',
      errorRate: 0,
      failedWebhooks: 0,
    };
  }

  // Sanitize all output to guarantee zero credentials or tokens leaked
  const sanitizedChecks = maskSensitiveData(checks);

  // Database failure fails the readiness probe with 503
  if (!isDbHealthy) {
    sendError(
      res,
      503,
      'Service is unavailable - database connectivity failure',
      'SERVICE_UNAVAILABLE',
      {
        database: 'DISCONNECTED',
        dependencies: sanitizedChecks,
      }
    );
    return;
  }

  const isDegraded =
    checks.redis.status !== 'CONNECTED' ||
    checks.kafka.status === 'DISCONNECTED' ||
    checks.courier.status === 'DEGRADED';

  const readinessPayload = {
    status: isDegraded ? 'DEGRADED' : 'READY',
    database: 'CONNECTED',
    redis: checks.redis.status,
    redisLatencyMs: checks.redis.latencyMs,
    redisProvider: checks.redis.provider,
    kafka: checks.kafka.status,
    courier: checks.courier.status,
    dependencies: sanitizedChecks,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  };

  sendSuccess(
    res,
    readinessPayload,
    isDegraded ? 'Service is operational with degraded dependencies' : 'Service is ready to accept traffic'
  );
}

/**
 * Platform Version & Metadata
 * GET /version
 */
export async function getVersion(req: Request, res: Response): Promise<void> {
  sendSuccess(
    res,
    {
      name: 'courier-logistics-api',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptimeSeconds: Math.floor(process.uptime()),
      nodeVersion: process.version,
    },
    'Platform version metadata'
  );
}
