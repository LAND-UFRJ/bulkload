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

// 1. Declaramos o sender que será exportado para os outros arquivos
export let qdbSender: Sender;

// 2. Criamos a função de inicialização para resolver a Promise do QuestDB
export async function initQuestDB() {
  console.log("[QuestDB] Estabelecendo conexão nativa via ILP...");
  
  // O await agora está seguro dentro de uma função async
  qdbSender = await Sender.fromConfig(`http::addr=${QDB_INGESTION_URL}`);
  
  console.log("[QuestDB] Sender instanciado com sucesso!");
}

export async function shutdownDB() {
  console.log("[QuestDB] Encerrando conexão nativa de ingestão...");
  await qdbSender.close();
}

