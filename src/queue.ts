import { Queue } from 'bullmq';

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

export const ingestionQueue = new Queue('ingestion-queue', {
  connection: redisConnection,
});

export const pingQueue = new Queue('ping-queue', {
  connection: redisConnection,
});
