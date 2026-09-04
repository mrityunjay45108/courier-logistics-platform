import { app } from './app';
import { config } from './config';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';
import {
  kafkaClientManager,
  kafkaProducerService,
  kafkaOutboxService,
  ecommerceOrderConsumer,
  courierShipmentConsumer,
} from './infrastructure/kafka';

const server = app.listen(config.port, () => {
  console.log(`🚀 Courier & Logistics API running on port ${config.port} [${config.env}]`);
  console.log(`📡 Health check available at: http://localhost:${config.port}/health`);
  console.log(`🌐 Ready check available at: http://localhost:${config.port}/ready`);
});

// Initialize Kafka background services if configured
if (config.kafka.brokers.length > 0 && kafkaClientManager.isEnabled()) {
  console.log('🚀 Initializing Kafka integration with Aiven cluster...');
  kafkaClientManager
    .validateTopics()
    .then(async (result) => {
      if (result.success) {
        console.log('✅ Kafka topic validation passed. Launching consumers...');
        await Promise.allSettled([
          ecommerceOrderConsumer.start(),
          courierShipmentConsumer.start(),
        ]);
      } else {
        console.warn(
          `⚠️ Kafka topics validation incomplete (missing: ${result.missingTopics.join(', ')}). Consumers postponed.`
        );
      }
    })
    .catch((err) => {
      console.warn('⚠️ Kafka cluster initialization notice:', err.message);
    })
    .finally(() => {
      // Start Outbox periodic dispatcher (polling PENDING events)
      kafkaOutboxService.startWorker(5000);
    });
} else {
  console.log('ℹ️ Kafka integration running in offline/outbox-only mode.');
}

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  // Stop Outbox worker immediately
  kafkaOutboxService.stopWorker();

  // Stop Kafka consumers & disconnect producer
  await Promise.allSettled([
    ecommerceOrderConsumer.stop(),
    courierShipmentConsumer.stop(),
    kafkaProducerService.disconnect(),
  ]);

  server.close(async () => {
    console.log('🔒 Closed active HTTP connections.');
    try {
      await Promise.all([
        prisma.$disconnect(),
        redis.disconnect(),
      ]);
      console.log('💾 Disconnected from PostgreSQL database and Redis.');
      process.exit(0);
    } catch (err) {
      console.error('Error during database/redis disconnect:', err);
      process.exit(1);
    }
  });

  // Force exit after 10 seconds if lingering connections exist
  setTimeout(() => {
    console.error('⚠️ Forcing server shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

