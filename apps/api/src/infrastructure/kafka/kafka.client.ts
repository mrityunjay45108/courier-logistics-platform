import { Kafka, logLevel, SASLOptions, Admin } from 'kafkajs';
import { config } from '../../config';
import { PERMITTED_KAFKA_TOPICS, KAFKA_TOPICS } from './kafka.constants';

/**
 * Production KafkaJS Client Configuration
 * Connecting to Aiven Apache Kafka with SASL/SSL credentials
 */
class KafkaClientManager {
  private kafka: Kafka | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.init();
  }

  private init() {
    const kafkaConfig = config.kafka;

    // Check if brokers and credentials are provided
    if (!kafkaConfig.brokers || kafkaConfig.brokers.length === 0 || !kafkaConfig.username) {
      console.warn('⚠️ Kafka credentials not fully configured in environment. Kafka features running in fallback mode.');
      return;
    }

    try {
      const sasl: SASLOptions | undefined =
        kafkaConfig.username && kafkaConfig.password
          ? {
              mechanism: (kafkaConfig.saslMechanism || 'scram-sha-256') as any,
              username: kafkaConfig.username,
              password: kafkaConfig.password,
            }
          : undefined;

      this.kafka = new Kafka({
        clientId: kafkaConfig.clientId,
        brokers: kafkaConfig.brokers,
        ssl: kafkaConfig.ssl ? { rejectUnauthorized: false } : false,
        sasl,
        connectionTimeout: kafkaConfig.connectionTimeout,
        requestTimeout: kafkaConfig.requestTimeout,
        logLevel: logLevel.ERROR, // Prevent sensitive broker logs
      });

      this.isConfigured = true;
      console.log(`✅ Kafka client initialized for cluster: ${kafkaConfig.brokers.join(', ')}`);
    } catch (err: any) {
      console.error('❌ Failed to initialize KafkaJS client:', err.message);
      this.kafka = null;
      this.isConfigured = false;
    }
  }

  /**
   * Get underlying KafkaJS instance
   */
  getKafka(): Kafka | null {
    return this.kafka;
  }

  /**
   * Check if Kafka is enabled and configured
   */
  isEnabled(): boolean {
    return this.isConfigured && this.kafka !== null;
  }

  /**
   * Validate that cluster is accessible and required topics exist
   * STRICT: NEVER creates any topic!
   */
  async validateTopics(): Promise<{ success: boolean; existingTopics: string[]; missingTopics: string[] }> {
    if (!this.kafka) {
      return { success: false, existingTopics: [], missingTopics: [...PERMITTED_KAFKA_TOPICS] };
    }

    let admin: Admin | null = null;
    try {
      admin = this.kafka.admin();
      await admin.connect();

      const existingTopics = await admin.listTopics();
      console.log(`📡 Connected to Kafka cluster. Discovered ${existingTopics.length} existing topics.`);

      const requiredTopics = [KAFKA_TOPICS.COURIER_SHIPMENT_EVENTS];
      const missingTopics = requiredTopics.filter((t) => !existingTopics.includes(t));

      if (missingTopics.length > 0) {
        console.error(`❌ CRITICAL: Required Kafka topic(s) missing from cluster: ${missingTopics.join(', ')}`);
        console.error('❌ As per cluster limit (5/5 topics), topics cannot be auto-created. Please ensure topics are provisioned.');
      } else {
        console.log(`✅ Required Kafka topic verified: ${KAFKA_TOPICS.COURIER_SHIPMENT_EVENTS}`);
      }

      await admin.disconnect();
      return {
        success: missingTopics.length === 0,
        existingTopics,
        missingTopics,
      };
    } catch (error: any) {
      console.warn('⚠️ Kafka cluster validation notice (running in resilient fallback mode):', error.message);
      if (admin) {
        await admin.disconnect().catch(() => {});
      }
      return {
        success: false,
        existingTopics: [],
        missingTopics: [],
      };
    }
  }
}

export const kafkaClientManager = new KafkaClientManager();
