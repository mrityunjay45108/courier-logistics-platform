import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { sendSuccess, sendError } from '../../utils/response';

export async function getLiveness(req: Request, res: Response): Promise<void> {
  sendSuccess(res, { status: 'UP', timestamp: new Date().toISOString() }, 'Service is healthy');
}

export async function getReadiness(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Ping the database
    await prisma.$queryRaw`SELECT 1`;

    // Ping Redis
    const redisHealth = await redis.ping();

    sendSuccess(
      res,
      {
        status: 'READY',
        database: 'CONNECTED',
        redis: redisHealth.status,
        redisLatencyMs: redisHealth.latencyMs,
        redisProvider: redisHealth.provider,
        timestamp: new Date().toISOString(),
      },
      'Service is ready to accept traffic'
    );
  } catch (error) {
    sendError(
      res,
      503,
      'Service is unavailable - database connectivity failure',
      'SERVICE_UNAVAILABLE',
      { database: 'DISCONNECTED' }
    );
  }
}

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
    'Version information'
  );
}
