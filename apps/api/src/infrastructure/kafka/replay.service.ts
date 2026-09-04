import { prisma } from '../../lib/prisma';
import { KafkaFailureStatus, Prisma } from '@prisma/client';
import { KafkaTopic } from './kafka.constants';
import { KafkaEventEnvelope } from './kafka.types';
import { kafkaProducerService } from './kafka-producer.service';

/**
 * Replay and Recovery Service for PostgreSQL-backed DLQ Events
 */
export class KafkaReplayService {
  /**
   * List failed events from database DLQ
   */
  async listFailedEvents(params?: {
    status?: KafkaFailureStatus;
    topic?: string;
    consumerGroup?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params?.page || 1);
    const limit = Math.min(100, Math.max(1, params?.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.KafkaFailedEventWhereInput = {};
    if (params?.status) where.status = params.status;
    if (params?.topic) where.topic = params.topic;
    if (params?.consumerGroup) where.consumerGroup = params.consumerGroup;

    const [items, total] = await Promise.all([
      prisma.kafkaFailedEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.kafkaFailedEvent.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Replay a single failed event by republishing to Kafka or re-running business action
   */
  async replayEvent(failedEventId: string): Promise<boolean> {
    const record = await prisma.kafkaFailedEvent.findUnique({
      where: { id: failedEventId },
    });

    if (!record) {
      throw new Error(`Failed event with id '${failedEventId}' not found.`);
    }

    try {
      const envelope = record.payload as unknown as KafkaEventEnvelope;
      const partitionKey = envelope.aggregateId || record.eventId;

      // Republish to Kafka topic
      await kafkaProducerService.publish(
        record.topic as KafkaTopic,
        envelope,
        partitionKey
      );

      // Mark as resolved in PostgreSQL DLQ
      await prisma.kafkaFailedEvent.update({
        where: { id: failedEventId },
        data: {
          status: KafkaFailureStatus.RESOLVED,
          attempts: record.attempts + 1,
        },
      });

      console.log(`♻️ Successfully replayed failed event '${record.eventId}' on topic '${record.topic}'.`);
      return true;
    } catch (err: any) {
      await prisma.kafkaFailedEvent.update({
        where: { id: failedEventId },
        data: {
          attempts: record.attempts + 1,
          errorReason: `Replay failed: ${err.message}`,
        },
      });
      return false;
    }
  }

  /**
   * Ignore a poison pill event to remove from active failure queues
   */
  async ignoreEvent(failedEventId: string): Promise<void> {
    await prisma.kafkaFailedEvent.update({
      where: { id: failedEventId },
      data: { status: KafkaFailureStatus.IGNORED },
    });
  }
}

export const kafkaReplayService = new KafkaReplayService();
