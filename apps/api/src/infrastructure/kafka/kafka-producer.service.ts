import { Producer, Partitioners } from 'kafkajs';
import { kafkaClientManager } from './kafka.client';
import { PERMITTED_KAFKA_TOPICS, KafkaTopic } from './kafka.constants';
import { KafkaEventEnvelope, KafkaPublishResult } from './kafka.types';

/**
 * Production Kafka Event Producer
 * Handles topic restriction, partitioning, and structured logging
 */
export class KafkaProducerService {
  private producer: Producer | null = null;
  private isConnected: boolean = false;
  private connectingPromise: Promise<void> | null = null;

  private async getProducer(): Promise<Producer | null> {
    if (this.isConnected && this.producer) {
      return this.producer;
    }

    const kafka = kafkaClientManager.getKafka();
    if (!kafka) {
      return null;
    }

    if (!this.connectingPromise) {
      this.connectingPromise = (async () => {
        try {
          this.producer = kafka.producer({
            createPartitioner: Partitioners.DefaultPartitioner,
            allowAutoTopicCreation: false, // STRICT: Prevent automatic topic creation
            maxInFlightRequests: 5,
            idempotent: true,
          });

          await this.producer.connect();
          this.isConnected = true;
          console.log('✅ Kafka Producer connected successfully (Idempotent)');
        } catch (error: any) {
          this.isConnected = false;
          console.warn('⚠️ Kafka Producer connection notice:', error.message);
        } finally {
          this.connectingPromise = null;
        }
      })();
    }

    await this.connectingPromise;
    return this.producer;
  }

  /**
   * Publish an event to one of the 5 strictly permitted topics
   */
  async publish<T>(
    topic: KafkaTopic,
    envelope: KafkaEventEnvelope<T>,
    partitionKey: string
  ): Promise<KafkaPublishResult | null> {
    // 1. Strict Topic Limit Check
    if (!PERMITTED_KAFKA_TOPICS.includes(topic)) {
      throw new Error(
        `Security violation: Attempted to publish to unauthorized topic '${topic}'. Only permitted topics: ${PERMITTED_KAFKA_TOPICS.join(', ')}`
      );
    }

    const producer = await this.getProducer();
    if (!producer) {
      console.warn(`⚠️ Kafka Producer unavailable. Event '${envelope.eventId}' will rely on Outbox recovery.`);
      return null;
    }

    const start = Date.now();
    try {
      const record = {
        key: partitionKey,
        value: JSON.stringify(envelope),
        headers: {
          'x-event-id': envelope.eventId,
          'x-event-type': envelope.eventType,
          'x-correlation-id': envelope.correlationId || '',
          'x-producer': envelope.producer,
        },
      };

      const result = await producer.send({
        topic,
        messages: [record],
        timeout: 10000,
      });

      const meta = result[0];
      const processingTimeMs = Date.now() - start;

      // Structured logging without secrets
      console.log(
        JSON.stringify({
          level: 'info',
          message: 'Kafka event published',
          eventId: envelope.eventId,
          eventType: envelope.eventType,
          aggregateId: envelope.aggregateId,
          topic,
          partition: meta.partition,
          offset: meta.offset,
          partitionKey,
          correlationId: envelope.correlationId,
          processingTimeMs,
        })
      );

      return {
        topic,
        partition: meta.partition,
        offset: meta.offset || '0',
        eventId: envelope.eventId,
        partitionKey,
      };
    } catch (err: any) {
      console.error(`❌ Failed to publish Kafka event '${envelope.eventId}' to '${topic}':`, err.message);
      throw err;
    }
  }

  /**
   * Disconnect producer on application shutdown
   */
  async disconnect(): Promise<void> {
    if (this.producer && this.isConnected) {
      try {
        await this.producer.disconnect();
        console.log('🔒 Kafka Producer disconnected.');
      } catch (err: any) {
        console.warn('⚠️ Error disconnecting Kafka producer:', err.message);
      } finally {
        this.isConnected = false;
        this.producer = null;
      }
    }
  }
}

export const kafkaProducerService = new KafkaProducerService();
