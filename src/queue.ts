import { Queue } from 'bullmq';

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

export const ingestionQueue = new Queue('ingestion-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 3000 },
    removeOnFail: { count: 3000 },
  },
});

export const pingQueue = new Queue('ping-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 1000 },
  },
});
