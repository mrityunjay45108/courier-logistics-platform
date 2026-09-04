import { Request, Response, NextFunction } from 'express';
import { kafkaObservabilityService } from '../../infrastructure/kafka/kafka-observability.service';
import { kafkaReplayService } from '../../infrastructure/kafka/replay.service';
import { courierObservabilityService } from '../integrations/courier-observability.service';
import { alertingService } from '../../infrastructure/observability/alerting.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { prisma } from '../../lib/prisma';
import { AuditAction } from '@prisma/client';

/**
 * GET /api/admin/kafka/stats
 * Overview of Kafka cluster connection, runtime metrics, and active alerts
 */
export async function getKafkaStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [snapshot, alerts] = await Promise.all([
      kafkaObservabilityService.getSnapshot(),
      alertingService.evaluateAlerts(),
    ]);

    sendSuccess(
      res,
      {
        ...snapshot,
        alerts,
        thresholds: alertingService.getThresholds(),
      },
      'Kafka observability statistics retrieved'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/kafka/outbox/stats
 * Dedicated administrative breakdown of Transactional Outbox
 */
export async function getKafkaOutboxStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await kafkaObservabilityService.getOutboxStats();
    sendSuccess(res, stats, 'Transactional outbox statistics retrieved');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/kafka/failed-events
 * Administrative listing of PostgreSQL-backed DLQ events
 */
export async function listKafkaFailedEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, topic, consumerGroup, page, limit } = req.query;

    const result = await kafkaReplayService.listFailedEvents({
      status: status as any,
      topic: topic as string,
      consumerGroup: consumerGroup as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });

    sendSuccess(res, result, 'Failed Kafka DLQ events retrieved');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/kafka/failed-events/:id
 * Retrieve details for a single failed event
 */
export async function getKafkaFailedEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const event = await kafkaReplayService.getFailedEvent(req.params.id);
    if (!event) {
      sendError(res, 404, `Failed event '${req.params.id}' not found`, 'NOT_FOUND');
      return;
    }

    sendSuccess(res, event, 'Failed Kafka event retrieved');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/kafka/failed-events/:id/replay
 * Replay failed event with immutable eventId and audit trail
 */
export async function replayKafkaFailedEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const adminUserId = authReq.user?.userId;
    const { id } = req.params;

    const success = await kafkaReplayService.replayEvent(id);

    // Audit administrative action
    if (adminUserId) {
      await prisma.auditLog.create({
        data: {
          action: AuditAction.EXCEPTION_RESOLVED,
          userId: adminUserId,
          details: {
            action: 'KAFKA_FAILED_EVENT_REPLAY',
            failedEventId: id,
            replaySuccess: success,
            replayedAt: new Date().toISOString(),
          },
        },
      }).catch((err) => console.warn('AuditLog creation warning:', err.message));
    }

    if (success) {
      sendSuccess(res, { replayed: true }, 'Event replayed and republished successfully');
    } else {
      sendError(res, 500, 'Failed to replay event. See event details for error.', 'REPLAY_FAILED');
    }
  } catch (error: any) {
    next(error);
  }
}

/**
 * POST /api/admin/kafka/failed-events/:id/resolve
 * Mark event as resolved manually
 */
export async function resolveKafkaFailedEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const adminUserId = authReq.user?.userId;
    const { id } = req.params;

    const success = await kafkaReplayService.resolveEvent(id);
    if (!success) {
      sendError(res, 404, `Failed event '${id}' not found`, 'NOT_FOUND');
      return;
    }

    // Audit administrative action
    if (adminUserId) {
      await prisma.auditLog.create({
        data: {
          action: AuditAction.EXCEPTION_RESOLVED,
          userId: adminUserId,
          details: {
            action: 'KAFKA_FAILED_EVENT_RESOLVE_MANUAL',
            failedEventId: id,
            resolvedAt: new Date().toISOString(),
          },
        },
      }).catch((err) => console.warn('AuditLog creation warning:', err.message));
    }

    sendSuccess(res, { resolved: true }, 'Event marked as resolved');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/kafka/failed-events/:id/ignore
 * Mark poison pill as ignored
 */
export async function ignoreKafkaFailedEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const adminUserId = authReq.user?.userId;
    const { id } = req.params;

    await kafkaReplayService.ignoreEvent(id);

    // Audit administrative action
    if (adminUserId) {
      await prisma.auditLog.create({
        data: {
          action: AuditAction.EXCEPTION_RESOLVED,
          userId: adminUserId,
          details: {
            action: 'KAFKA_FAILED_EVENT_IGNORED',
            failedEventId: id,
            ignoredAt: new Date().toISOString(),
          },
        },
      }).catch((err) => console.warn('AuditLog creation warning:', err.message));
    }

    sendSuccess(res, { ignored: true }, 'Event marked as ignored');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/integrations/stats
 * Overview of third-party courier adapters, webhook deliveries, and reconciliation
 */
export async function getIntegrationsStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const snapshot = await courierObservabilityService.getSnapshot();
    sendSuccess(res, snapshot, 'Courier integration statistics retrieved');
  } catch (error) {
    next(error);
  }
}
