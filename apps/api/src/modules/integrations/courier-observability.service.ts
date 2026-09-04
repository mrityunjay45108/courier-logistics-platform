import { prisma } from '../../lib/prisma';
import { OutboundWebhookStatus } from '@prisma/client';

export type CourierFailureCategory =
  | 'API_TIMEOUT'
  | 'CLIENT_ERROR_4XX'
  | 'SERVER_ERROR_5XX'
  | 'RATE_LIMIT_429'
  | 'SHIPMENT_CREATION_FAILED'
  | 'TRACKING_FAILED'
  | 'LABEL_GENERATION_FAILED'
  | 'CANCELLATION_FAILED'
  | 'WEBHOOK_DISPATCH_FAILED'
  | 'RECONCILIATION_MISMATCH';

export interface CourierMetricsSnapshot {
  counts: Record<CourierFailureCategory, number>;
  totalErrors: number;
  totalRequests: number;
  errorRate: number;
  lastFailureAt: string | null;
  lastFailureReason: string | null;
  outboundWebhooks: {
    pendingCount: number;
    failedCount: number;
    deliveredCount: number;
  };
}

class CourierObservabilityService {
  private counts: Record<CourierFailureCategory, number> = {
    API_TIMEOUT: 0,
    CLIENT_ERROR_4XX: 0,
    SERVER_ERROR_5XX: 0,
    RATE_LIMIT_429: 0,
    SHIPMENT_CREATION_FAILED: 0,
    TRACKING_FAILED: 0,
    LABEL_GENERATION_FAILED: 0,
    CANCELLATION_FAILED: 0,
    WEBHOOK_DISPATCH_FAILED: 0,
    RECONCILIATION_MISMATCH: 0,
  };

  private totalRequests = 0;
  private lastFailureAt: string | null = null;
  private lastFailureReason: string | null = null;

  recordRequest(): void {
    this.totalRequests++;
  }

  recordFailure(category: CourierFailureCategory, reason?: string): void {
    this.totalRequests++;
    this.counts[category]++;
    this.lastFailureAt = new Date().toISOString();
    if (reason) this.lastFailureReason = reason;
  }

  async getSnapshot(): Promise<CourierMetricsSnapshot> {
    const totalErrors = Object.values(this.counts).reduce((sum, n) => sum + n, 0);
    const errorRate = this.totalRequests > 0 ? Number((totalErrors / this.totalRequests).toFixed(4)) : 0;

    const [pendingWebhooks, failedWebhooks, deliveredWebhooks] = await Promise.all([
      prisma.outboundWebhookEvent.count({ where: { status: OutboundWebhookStatus.PENDING } }),
      prisma.outboundWebhookEvent.count({ where: { status: OutboundWebhookStatus.FAILED } }),
      prisma.outboundWebhookEvent.count({ where: { status: OutboundWebhookStatus.DELIVERED } }),
    ]);

    return {
      counts: { ...this.counts },
      totalErrors,
      totalRequests: this.totalRequests,
      errorRate,
      lastFailureAt: this.lastFailureAt,
      lastFailureReason: this.lastFailureReason,
      outboundWebhooks: {
        pendingCount: pendingWebhooks,
        failedCount: failedWebhooks,
        deliveredCount: deliveredWebhooks,
      },
    };
  }

  async checkHealth(): Promise<{ status: 'HEALTHY' | 'DEGRADED'; errorRate: number; failedWebhooks: number }> {
    const snapshot = await this.getSnapshot();
    const threshold = parseFloat(process.env.COURIER_ERROR_RATE_THRESHOLD || '0.05');
    const isDegraded = snapshot.errorRate > threshold || snapshot.outboundWebhooks.failedCount > 20;

    return {
      status: isDegraded ? 'DEGRADED' : 'HEALTHY',
      errorRate: snapshot.errorRate,
      failedWebhooks: snapshot.outboundWebhooks.failedCount,
    };
  }
}

export const courierObservabilityService = new CourierObservabilityService();
