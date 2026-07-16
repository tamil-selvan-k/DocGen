import { PrismaClient } from '@prisma/client';
import { logger } from './logger';
import { config } from '../config/env';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      config.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'info' },
            { emit: 'stdout', level: 'warn' },
            { emit: 'stdout', level: 'error' }
          ]
        : [
            { emit: 'stdout', level: 'error' },
            { emit: 'stdout', level: 'warn' }
          ],
  });

// Bind query logger in development
if (config.NODE_ENV === 'development') {
  (prisma as any).$on?.('query', (e: any) => {
    logger.debug(`Prisma Query: ${e.query} - Params: ${e.params} - Duration: ${e.duration}ms`);
  });
}

if (config.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export const connectDb = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info('Database connection established successfully via Prisma');
  } catch (error) {
    logger.error('Failed to connect to the database via Prisma', error);
    throw error;
  }
};

export const disconnectDb = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info('Database connection closed successfully via Prisma');
  } catch (error) {
    logger.error('Error during Prisma database disconnection', error);
  }
};

export default prisma;
