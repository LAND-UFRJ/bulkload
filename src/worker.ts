/**
 * worker.ts
 *
 * Runs as a separate process (or alongside the server) to consume
 * ingestion and ping jobs from BullMQ queues backed by Redis.
 *
 * Usage:
 *   ts-node src/worker.ts
 *   (or via pm2: pm2 start build/src/worker.js --name bulkload-worker)
 */

import * as dotenv from "dotenv";
dotenv.config();

import { Worker } from 'bullmq';
import { ingest } from "./ingest";
import { ingestPing } from "./pingIngest";
import { shutdownDB, createQuestDBSender } from "./db";

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

async function bootstrap() {
  const qdbSender = await createQuestDBSender();

  // ── Bulkdata ingestion worker ──────────────────────────────────────────────
  const ingestionWorker = new Worker('ingestion-queue', async (job) => {
  //  console.log(`[Worker] Processando ingestion job ${job.id}...`);
    await ingest(job.data, qdbSender);
  }, {
    connection: redisConnection,
    concurrency: 1,
  });

  //ingestionWorker.on('completed', (job) =>
  //  console.log(`[Worker] Ingestion job ${job.id} finalizado!`)
  //);
  ingestionWorker.on('failed', (job, err) =>
    console.error(`[Worker] Ingestion job ${job?.id} falhou:`, err.message)
  );

  // ── Ping ingestion worker ──────────────────────────────────────────────────
  const pingQdbSender = await createQuestDBSender();
  const pingWorker = new Worker('ping-queue', async (job) => {
  //  console.log(`[Worker] Processando ping job ${job.id}...`);
    await ingestPing(job.data, pingQdbSender);
  }, {
    connection: redisConnection,
    concurrency: 1,
  });

  pingWorker.on('completed', (job) =>
    console.log(`[Worker] Ping job ${job.id} finalizado!`)
  );
  pingWorker.on('failed', (job, err) =>
    console.error(`[Worker] Ping job ${job?.id} falhou:`, err.message)
  );

  console.log('[Worker] Aguardando jobs nas filas ingestion-queue e ping-queue...');

  // Graceful shutdown
  async function shutdown() {
    console.log('[Worker] Shutting down...');
    await ingestionWorker.close();
    await pingWorker.close();
    await shutdownDB(qdbSender);
    await shutdownDB(pingQdbSender);
    process.exit(0);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch((err) => {
  console.error('[Worker] Falha ao inicializar:', err);
  process.exit(1);
});
