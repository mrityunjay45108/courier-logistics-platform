import { prisma } from '../../lib/prisma';
import { kafkaClientManager } from './kafka.client';
import { KafkaOutboxStatus, KafkaFailureStatus } from '@prisma/client';

export interface OutboxStats {
  pendingCount: number;
  publishedCount: number;
  failedCount: number;
  totalRetryAttempts: number;
  oldestPendingAgeSeconds: number | null;
  lastSuccessfulPublication: string | null;
  eventTypeDistribution: { eventType: string; count: number }[];
}

export interface FailedEventsStats {
  unresolvedCount: number;
  resolvedCount: number;
  ignoredCount: number;
  totalReplayAttempts: number;
  byTopic: { topic: string; count: number }[];
  byConsumerGroup: { consumerGroup: string; count: number }[];
}

export interface RuntimeMetrics {
  producer: {
    successCount: number;
    failureCount: number;
    lastPublishedAt: string | null;
    lastError: string | null;
  };
  consumer: {
    successCount: number;
    failureCount: number;
    averageLatencyMs: number;
    lastProcessedAt: string | null;
    lastError: string | null;
  };
}

class KafkaObservabilityService {
  private producerSuccessCount = 0;
  private producerFailureCount = 0;
  private lastPublishedAt: string | null = null;
  private lastProducerError: string | null = null;

  private consumerSuccessCount = 0;
  private consumerFailureCount = 0;
  private lastProcessedAt: string | null = null;
  private lastConsumerError: string | null = null;
  private latencies: number[] = [];

  // --------------------------------------------------------------------------
  // Runtime Telemetry Recording
  // --------------------------------------------------------------------------

  recordProducerSuccess(_topic: string, _durationMs: number): void {
    this.producerSuccessCount++;
    this.lastPublishedAt = new Date().toISOString();
  }

  recordProducerFailure(_topic: string, error: string): void {
    this.producerFailureCount++;
    this.lastProducerError = error;
  }

  recordConsumerSuccess(_consumerGroup: string, _topic: string, latencyMs: number): void {
    this.consumerSuccessCount++;
    this.lastProcessedAt = new Date().toISOString();

    // Maintain sliding window of 100 latency samples
    this.latencies.push(latencyMs);
    if (this.latencies.length > 100) {
      this.latencies.shift();
    }
  }

  recordConsumerFailure(_consumerGroup: string, _topic: string, error: string): void {
    this.consumerFailureCount++;
    this.lastConsumerError = error;
  }

  getRuntimeMetrics(): RuntimeMetrics {
    const avgLatency =
      this.latencies.length > 0
        ? Math.round(this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length)
        : 0;

    return {
      producer: {
        successCount: this.producerSuccessCount,
        failureCount: this.producerFailureCount,
        lastPublishedAt: this.lastPublishedAt,
        lastError: this.lastProducerError,
      },
      consumer: {
        successCount: this.consumerSuccessCount,
        failureCount: this.consumerFailureCount,
        averageLatencyMs: avgLatency,
        lastProcessedAt: this.lastProcessedAt,
        lastError: this.lastConsumerError,
      },
    };
  }

  // --------------------------------------------------------------------------
  // Database-Backed Outbox Telemetry
  // --------------------------------------------------------------------------

  async getOutboxStats(): Promise<OutboxStats> {
    const [pendingCount, publishedCount, failedCount, retryAggregate, oldestPending, latestPublished, typeGroups] =
      await Promise.all([
        prisma.kafkaOutboxEvent.count({ where: { status: KafkaOutboxStatus.PENDING } }),
        prisma.kafkaOutboxEvent.count({ where: { status: KafkaOutboxStatus.PUBLISHED } }),
        prisma.kafkaOutboxEvent.count({ where: { status: KafkaOutboxStatus.FAILED } }),
        prisma.kafkaOutboxEvent.aggregate({ _sum: { attempts: true } }),
        prisma.kafkaOutboxEvent.findFirst({
          where: { status: KafkaOutboxStatus.PENDING },
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true },
        }),
        prisma.kafkaOutboxEvent.findFirst({
          where: { status: KafkaOutboxStatus.PUBLISHED },
          orderBy: { publishedAt: 'desc' },
          select: { publishedAt: true },
        }),
        prisma.kafkaOutboxEvent.groupBy({
          by: ['eventType'],
          _count: { eventType: true },
          orderBy: { _count: { eventType: 'desc' } },
          take: 10,
        }),
      ]);

    const oldestPendingAgeSeconds = oldestPending
      ? Math.max(0, Math.floor((Date.now() - oldestPending.createdAt.getTime()) / 1000))
      : null;

    return {
      pendingCount,
      publishedCount,
      failedCount,
      totalRetryAttempts: retryAggregate._sum.attempts || 0,
      oldestPendingAgeSeconds,
      lastSuccessfulPublication: latestPublished?.publishedAt ? latestPublished.publishedAt.toISOString() : null,
      eventTypeDistribution: typeGroups.map((g) => ({
        eventType: g.eventType,
        count: g._count.eventType,
      })),
    };
  }

  // --------------------------------------------------------------------------
  // Database-Backed Failed Events (DLQ) Telemetry
  // --------------------------------------------------------------------------

  async getFailedEventsStats(): Promise<FailedEventsStats> {
    const [unresolvedCount, resolvedCount, ignoredCount, attemptsAggregate, topicGroups, groupGroups] =
      await Promise.all([
        prisma.kafkaFailedEvent.count({ where: { status: KafkaFailureStatus.UNRESOLVED } }),
        prisma.kafkaFailedEvent.count({ where: { status: KafkaFailureStatus.RESOLVED } }),
        prisma.kafkaFailedEvent.count({ where: { status: KafkaFailureStatus.IGNORED } }),
        prisma.kafkaFailedEvent.aggregate({ _sum: { attempts: true } }),
        prisma.kafkaFailedEvent.groupBy({
          by: ['topic'],
          _count: { topic: true },
        }),
        prisma.kafkaFailedEvent.groupBy({
          by: ['consumerGroup'],
          _count: { consumerGroup: true },
        }),
      ]);

    return {
      unresolvedCount,
      resolvedCount,
      ignoredCount,
      totalReplayAttempts: attemptsAggregate._sum.attempts || 0,
      byTopic: topicGroups.map((t) => ({ topic: t.topic, count: t._count.topic })),
      byConsumerGroup: groupGroups.map((g) => ({ consumerGroup: g.consumerGroup, count: g._count.consumerGroup })),
    };
  }

  // --------------------------------------------------------------------------
  // Processed Inbox Telemetry
  // --------------------------------------------------------------------------

  async getInboxStats(): Promise<{ totalProcessed: number; byGroup: { consumerGroup: string; count: number }[] }> {
    const [totalProcessed, groupCounts] = await Promise.all([
      prisma.kafkaProcessedEvent.count(),
      prisma.kafkaProcessedEvent.groupBy({
        by: ['consumerGroup'],
        _count: { consumerGroup: true },
      }),
    ]);

    return {
      totalProcessed,
      byGroup: groupCounts.map((g) => ({
        consumerGroup: g.consumerGroup,
        count: g._count.consumerGroup,
      })),
    };
  }

  // --------------------------------------------------------------------------
  // Consolidated Observability Snapshot
  // --------------------------------------------------------------------------

  async getSnapshot() {
    const [outbox, failed, inbox] = await Promise.all([
      this.getOutboxStats(),
      this.getFailedEventsStats(),
      this.getInboxStats(),
    ]);

    return {
      cluster: {
        configured: kafkaClientManager.isEnabled(),
      },
      runtime: this.getRuntimeMetrics(),
      outbox,
      failedEvents: failed,
      inbox,
    };
  }
}

export const kafkaObservabilityService = new KafkaObservabilityService();
