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

import { Worker } from "bullmq";
import { ingest } from "./ingest";
import { ingestPing } from "./pingIngest";
import { shutdownDB } from "./db";

const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
};

// ── Bulkdata ingestion worker ──────────────────────────────────────────────
const ingestionWorker = new Worker("ingestion-queue", async (job) => {
//  console.log(`[Worker] Processando ingestion job ${job.id}...`);
  await ingest(job.data);
}, {
  connection: redisConnection,
  concurrency: 3, // process up to 3 jobs simultaneously
});

//ingestionWorker.on('completed', (job) =>
//  console.log(`[Worker] Ingestion job ${job.id} finalizado!`)
//);
ingestionWorker.on("failed", (job, err) =>
  console.error(`[Worker] Ingestion job ${job?.id} falhou:`, err.message)
);

// ── Ping ingestion worker ──────────────────────────────────────────────────
const pingWorker = new Worker("ping-queue", async (job) => {
//  console.log(`[Worker] Processando ping job ${job.id}...`);
  await ingestPing(job.data);
}, {
  connection: redisConnection,
  concurrency: 3,
});

pingWorker.on("completed", (job) =>
  console.log(`[Worker] Ping job ${job.id} finalizado!`)
);
pingWorker.on("failed", (job, err) =>
  console.error(`[Worker] Ping job ${job?.id} falhou:`, err.message)
);

console.log("[Worker] Aguardando jobs nas filas ingestion-queue e ping-queue...");

// Graceful shutdown
async function shutdown() {
  console.log("[Worker] Shutting down...");
  await ingestionWorker.close();
  await pingWorker.close();
  await shutdownDB();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
