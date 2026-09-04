import { Consumer, EachMessagePayload } from 'kafkajs';
import { kafkaClientManager } from '../kafka.client';
import { KafkaTopic } from '../kafka.constants';
import { KafkaEventEnvelope } from '../kafka.types';
import { prisma } from '../../../lib/prisma';
import { KafkaFailureStatus, Prisma } from '@prisma/client';

/**
 * Abstract Base Kafka Consumer with Inbox Idempotency and Database-backed DLQ
 */
export abstract class BaseKafkaConsumer {
  protected consumer: Consumer | null = null;
  protected isRunning: boolean = false;

  constructor(
    public readonly consumerGroup: string,
    public readonly topics: KafkaTopic[]
  ) {}

  protected abstract handleEvent(
    envelope: KafkaEventEnvelope,
    context: EachMessagePayload,
    tx: Prisma.TransactionClient
  ): Promise<void>;

  /**
   * Start consumer and subscribe to assigned topics
   */
  async start(): Promise<void> {
    const kafka = kafkaClientManager.getKafka();
    if (!kafka) {
      console.warn(`⚠️ Kafka client unavailable. Consumer '${this.consumerGroup}' not started.`);
      return;
    }

    try {
      this.consumer = kafka.consumer({
        groupId: this.consumerGroup,
        allowAutoTopicCreation: false, // STRICT: Prevent automatic topic creation
        retry: {
          retries: 5,
        },
      });

      await this.consumer.connect();
      console.log(`✅ Kafka Consumer connected: [Group: ${this.consumerGroup}]`);

      for (const topic of this.topics) {
        await this.consumer.subscribe({ topic, fromBeginning: false });
        console.log(`📥 Subscribed group '${this.consumerGroup}' to topic '${topic}'`);
      }

      this.isRunning = true;

      await this.consumer.run({
        autoCommit: true,
        eachMessage: async (payload: EachMessagePayload) => {
          await this.processMessage(payload);
        },
      });
    } catch (err: any) {
      console.error(`❌ Error starting Kafka consumer '${this.consumerGroup}':`, err.message);
      this.isRunning = false;
    }
  }

  /**
   * Process individual message with strict idempotency and DB-DLQ fallback.
   * Business database changes + KafkaProcessedEvent insertion occur in the SAME PostgreSQL transaction.
   */
  public async processMessage(context: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = context;
    const rawValue = message.value?.toString('utf8');

    if (!rawValue) {
      return;
    }

    let envelope: KafkaEventEnvelope;
    try {
      envelope = JSON.parse(rawValue);
    } catch (parseErr: any) {
      console.error(`❌ Poison message on topic '${topic}': Unparseable JSON. Recording to DB DLQ.`);
      await this.recordFailedEvent(topic, partition, message.offset, 'POISON_PILL', `INVALID_JSON: ${parseErr.message}`, { raw: rawValue });
      return;
    }

    // 1. Envelope Structure Validation
    if (!envelope.eventId || !envelope.eventType || !envelope.aggregateId) {
      console.warn(`⚠️ Malformed event envelope on '${topic}'. Recording to DB DLQ.`);
      await this.recordFailedEvent(topic, partition, message.offset, envelope.eventId || 'UNKNOWN', 'MALFORMED_ENVELOPE', envelope);
      return;
    }

    // 2 & 3. Atomic PostgreSQL Transaction: Check Inbox, Execute Business Changes, Insert KafkaProcessedEvent
    const start = Date.now();
    try {
      const alreadyProcessed = await prisma.$transaction(async (tx) => {
        // Idempotency check inside transaction
        const existing = await tx.kafkaProcessedEvent.findUnique({
          where: {
            consumerGroup_eventId: {
              consumerGroup: this.consumerGroup,
              eventId: envelope.eventId,
            },
          },
        });

        if (existing) {
          return true; // Already processed
        }

        // Execute domain business logic using the transaction client
        await this.handleEvent(envelope, context, tx);

        // Atomically record processed event in the SAME transaction
        await tx.kafkaProcessedEvent.create({
          data: {
            eventId: envelope.eventId,
            consumerGroup: this.consumerGroup,
            topic,
            eventType: envelope.eventType,
          },
        });

        return false;
      }, { maxWait: 10000, timeout: 25000 });

      if (alreadyProcessed) {
        console.log(
          JSON.stringify({
            level: 'info',
            message: 'Skipping duplicate Kafka event (Idempotent)',
            consumerGroup: this.consumerGroup,
            eventId: envelope.eventId,
            eventType: envelope.eventType,
            topic,
            offset: message.offset,
          })
        );
        return;
      }

      const processingTimeMs = Date.now() - start;
      console.log(
        JSON.stringify({
          level: 'info',
          message: 'Kafka event processed successfully',
          consumerGroup: this.consumerGroup,
          eventId: envelope.eventId,
          eventType: envelope.eventType,
          topic,
          partition,
          offset: message.offset,
          processingTimeMs,
        })
      );
    } catch (error: any) {
      if (error?.code === 'P2002') {
        // Race condition: another thread/worker committed this [consumerGroup, eventId]
        console.log(
          JSON.stringify({
            level: 'info',
            message: 'Skipping duplicate Kafka event (Concurrent P2002 unique constraint)',
            consumerGroup: this.consumerGroup,
            eventId: envelope.eventId,
            eventType: envelope.eventType,
            topic,
            offset: message.offset,
          })
        );
        return;
      }

      console.error(
        `❌ Error processing Kafka event '${envelope.eventId}' in '${this.consumerGroup}':`,
        error.message
      );

      // Record to Database-backed DLQ (PostgreSQL) since Kafka is constrained to 5 topics
      await this.recordFailedEvent(
        topic,
        partition,
        message.offset,
        envelope.eventId,
        error.message || 'Processing failure',
        envelope,
        error.stack
      );
    }
  }

  /**
   * Persist unhandled failures to PostgreSQL DLQ
   */
  private async recordFailedEvent(
    topic: string,
    partition: number,
    offset: string,
    eventId: string,
    errorReason: string,
    payload: any,
    stackTrace?: string
  ): Promise<void> {
    try {
      await prisma.kafkaFailedEvent.create({
        data: {
          eventId,
          topic,
          partition,
          offset,
          consumerGroup: this.consumerGroup,
          payload: payload as Prisma.InputJsonValue,
          errorReason,
          stackTrace,
          status: KafkaFailureStatus.UNRESOLVED,
        },
      });
      console.log(`💾 Recorded failed Kafka event '${eventId}' to PostgreSQL DLQ.`);
    } catch (err: any) {
      console.error('❌ Failed to record Kafka DLQ event:', err.message);
    }
  }

  /**
   * Stop consumer gracefully
   */
  async stop(): Promise<void> {
    if (this.consumer && this.isRunning) {
      try {
        await this.consumer.stop();
        await this.consumer.disconnect();
        console.log(`🔒 Kafka Consumer disconnected: [Group: ${this.consumerGroup}]`);
      } catch (err: any) {
        console.warn(`⚠️ Error disconnecting consumer '${this.consumerGroup}':`, err.message);
      } finally {
        this.isRunning = false;
        this.consumer = null;
      }
    }
  }
}
