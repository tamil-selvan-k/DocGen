import { Queue } from 'bullmq';
import { config } from '../config/env';
import { logger } from '../utils/logger';

export interface DocJobData {
  jobId: string;
  repositoryId: string;
  commitSha: string;
  installationId: string;
  owner: string;
  repo: string;
  defaultBranch: string;
}

export const DOC_QUEUE_NAME = 'documentation-jobs';

// BullMQ requires its own ioredis instance — pass URL config to avoid bundled ioredis version conflicts
const bullMQConnection = {
  url: config.REDIS_URL,
  maxRetriesPerRequest: null as null,
  enableReadyCheck: false,
};

let docQueue: Queue<DocJobData> | null = null;

export const getDocQueue = (): Queue<DocJobData> => {
  if (!docQueue) {
    docQueue = new Queue<DocJobData>(DOC_QUEUE_NAME, {
      connection: bullMQConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 200 },
      },
    });

    (docQueue as Queue<DocJobData>).on('error', (err: Error) => {
      logger.error('BullMQ Queue error', err);
    });

    logger.info(`BullMQ queue '${DOC_QUEUE_NAME}' initialized`);
  }

  return docQueue!;
};

export const addDocJob = async (data: DocJobData): Promise<void> => {
  const queue = getDocQueue();
  await queue.add('generate-docs', data, { jobId: data.jobId });
  logger.info(`Job enqueued: ${data.jobId} → ${data.owner}/${data.repo}@${data.commitSha.slice(0, 7)}`);
};

export const closeDocQueue = async (): Promise<void> => {
  if (docQueue) {
    await docQueue.close();
    docQueue = null;
    logger.info('BullMQ queue closed');
  }
};
