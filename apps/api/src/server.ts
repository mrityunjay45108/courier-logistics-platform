import { app } from './app';
import { config } from './config';
import { prisma } from './lib/prisma';

const server = app.listen(config.port, () => {
  console.log(`🚀 Courier & Logistics API running on port ${config.port} [${config.env}]`);
  console.log(`📡 Health check available at: http://localhost:${config.port}/health`);
  console.log(`🌐 Ready check available at: http://localhost:${config.port}/ready`);
});

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    console.log('🔒 Closed active HTTP connections.');
    try {
      await prisma.$disconnect();
      console.log('💾 Disconnected from PostgreSQL database.');
      process.exit(0);
    } catch (err) {
      console.error('Error during database disconnect:', err);
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
