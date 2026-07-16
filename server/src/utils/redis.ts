import Redis from 'ioredis';
import { logger } from './logger';
import { config } from '../config/env';

// We reuse/configure a Redis client instance.
// Note: BullMQ requires maxRetriesPerRequest to be null on the connection.
export const redisConnection = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redisConnection.on('connect', () => {
  logger.info('Redis connection established successfully');
});

redisConnection.on('error', (error) => {
  logger.error('Redis connection encountered an error', error);
});

/**
 * Returns the current active Redis connection instance.
 */
export const getRedisConnection = (): Redis => {
  return redisConnection;
};

/**
 * Gracefully closes the Redis connection.
 */
export const disconnectRedis = async (): Promise<void> => {
  try {
    await redisConnection.quit();
    logger.info('Redis connection closed successfully');
  } catch (error) {
    logger.error('Error during Redis disconnection', error);
  }
};

export default redisConnection;
