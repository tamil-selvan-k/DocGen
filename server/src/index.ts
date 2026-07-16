import app from './app';
import { config } from './config/env';
import { logger } from './utils/logger';
import { connectDb, disconnectDb } from './utils/prisma';
import { disconnectRedis } from './utils/redis';
import { closeDocQueue } from './queue';
import { startWorker, stopWorker } from './queue/worker';

let server: any;

async function bootstrap() {
  try {
    // 1. Connect to PostgreSQL via Prisma
    await connectDb();

    // 2. Start the BullMQ documentation worker
    startWorker();

    // 3. Start the HTTP server
    server = app.listen(config.PORT, () => {
      logger.info(`✅ AutoDocs AI server running on port ${config.PORT} [${config.NODE_ENV}]`);
      logger.info(`📖 API available at http://localhost:${config.PORT}/api/v1`);
      logger.info(`🔍 Health check at http://localhost:${config.PORT}/api/v1/health`);
    });

    server.on('error', (err: Error) => {
      logger.error('HTTP server error', err);
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to bootstrap application', error);
    process.exit(1);
  }
}

async function shutdown(signal: string) {
  logger.info(`🛑 Shutdown signal received: ${signal}. Commencing graceful shutdown...`);

  // Stop accepting new HTTP connections
  if (server) {
    server.close(() => logger.info('HTTP server closed'));
  }

  // Drain the BullMQ worker gracefully
  await stopWorker();

  // Close the queue connection
  await closeDocQueue();

  // Close DB and cache connections
  await disconnectDb();
  await disconnectRedis();

  logger.info('✅ Graceful shutdown completed.');
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Catch unhandled rejections
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

bootstrap();