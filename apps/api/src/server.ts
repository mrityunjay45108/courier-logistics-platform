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

// Production HTTP Connection Timeouts (compatible with reverse proxies & ALBs)
server.headersTimeout = 65000;
server.keepAliveTimeout = 61000;
server.requestTimeout = 30000;

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

let isShuttingDown = false;

// Graceful shutdown handling
export const gracefulShutdown = async (signal: string, exitProcess = true): Promise<void> => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n🛑 Received ${signal}. Starting orderly graceful shutdown...`);

  // Force exit after 10 seconds if lingering connections or queries exist
  const forceTimeout = setTimeout(() => {
    console.error('⚠️ Forcing server shutdown after timeout.');
    if (exitProcess) process.exit(1);
  }, 10000);
  forceTimeout.unref();

  try {
    // 1. Stop Outbox background worker
    kafkaOutboxService.stopWorker();

    // 2. Stop Kafka consumers and flush/disconnect producer cleanly
    await Promise.allSettled([
      ecommerceOrderConsumer.stop(),
      courierShipmentConsumer.stop(),
      kafkaProducerService.disconnect(),
    ]);

    // 3. Stop accepting new HTTP requests and wait for in-flight requests
    await new Promise<void>((resolve) => {
      server.close(() => {
        console.log('🔒 Closed active HTTP server connections.');
        resolve();
      });
    });

    // 4. Disconnect from persistence tiers (PostgreSQL and Redis)
    await Promise.allSettled([
      prisma.$disconnect(),
      redis.disconnect(),
    ]);
    console.log('💾 Cleanly disconnected from PostgreSQL and Redis.');

    clearTimeout(forceTimeout);
    if (exitProcess) process.exit(0);
  } catch (err) {
    console.error('Error during graceful shutdown:', err);
    if (exitProcess) process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('⚠️ Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

export { server };

