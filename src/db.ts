import { Sender } from "@questdb/nodejs-client";
import Redis from "ioredis";
import * as dotenv from "dotenv";

dotenv.config();

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Environment variable not set: ${name}`);
  }
  return value;
}

const QDB_HOST = requiredEnv("QDB_HOST");
const QDB_PORT = process.env.QDB_PORT || "9000";
export const QDB_INGESTION_URL = `${QDB_HOST}:${QDB_PORT}`;

export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  db: 1, // Mantendo o isolamento lógico das filas do BullMQ
});

export async function createQuestDBSender(): Promise<Sender> {
  // Retorna a instância síncrona resolvida do Sender por Worker [cite: 354, 355]
  return await Sender.fromConfig(`http::addr=${QDB_INGESTION_URL}`);
}

export async function shutdownDB(sender: Sender) {
  console.log("[QuestDB] Encerrando conexão nativa de ingestão...");
  await sender.close();
}

