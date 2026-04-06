/**
 * monitor.ts
 *
 * Runs as a separate process to monitor router activity.
 * Every CHECK_INTERVAL_MS (default 60s), compares the number of distinct
 * routers that reported in the current window vs the previous window.
 * If the drop exceeds DROP_THRESHOLD (default 10%), sends a Discord
 * webhook alert.
 *
 * Usage:
 *   ts-node src/monitor.ts
 *   pm2 start build/src/monitor.js --name bulkload-monitor
 *
 * Required env vars:
 *   DISCORD_WEBHOOK_URL  — Discord webhook endpoint
 *   PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE, PGPOOL_MAX,
 *   PGPOOL_IDLE_MS, PGPOOL_CONN_MS  — Postgres connection
 *
 * Optional env vars:
 *   MONITOR_CHECK_INTERVAL_MS — check interval in ms (default: 60000)
 *   MONITOR_WINDOW_MINUTES    — time window size in minutes (default: 5)
 *   MONITOR_DROP_THRESHOLD    — drop fraction to trigger alert (default: 0.10)
 */

import * as dotenv from "dotenv";
dotenv.config();

import { sequelize, shutdownDB } from "./db";
import { QueryTypes } from "sequelize";

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
if (!DISCORD_WEBHOOK_URL) {
  console.error("[Monitor] DISCORD_WEBHOOK_URL not set. Exiting.");
  process.exit(1);
}

const CHECK_INTERVAL_MS = parseInt(process.env.MONITOR_CHECK_INTERVAL_MS || "60000", 10);
const WINDOW_MINUTES = parseInt(process.env.MONITOR_WINDOW_MINUTES || "5", 10);
const DROP_THRESHOLD = parseFloat(process.env.MONITOR_DROP_THRESHOLD || "0.10");

let alertCooldown = false;

/**
 * Count distinct routers that sent WAN metrics within a time window.
 */
async function countActiveRouters(fromMinutesAgo: number, toMinutesAgo: number): Promise<number> {
  const [result]: any[] = await sequelize.query(
    `SELECT COUNT(DISTINCT router_mac) AS cnt
     FROM monitoramento.wan_metrics
     WHERE timestamp >= NOW() - make_interval(mins => $1)
       AND timestamp <  NOW() - make_interval(mins => $2)`,
    {
      type: QueryTypes.SELECT,
      bind: [fromMinutesAgo, toMinutesAgo],
    }
  );
  return parseInt(result?.cnt || "0", 10);
}

/**
 * Send an alert message to Discord via webhook.
 */
async function sendDiscordAlert(message: string): Promise<void> {
  try {
    const response = await fetch(DISCORD_WEBHOOK_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
    });
    if (!response.ok) {
      console.error(`[Monitor] Discord webhook failed: ${response.status} ${response.statusText}`);
    }
  } catch (err: any) {
    console.error(`[Monitor] Discord webhook error: ${err.message}`);
  }
}

/**
 * Main check: compare current window with previous window.
 */
async function check(): Promise<void> {
  try {
    const currentCount = await countActiveRouters(WINDOW_MINUTES, 0);
    const previousCount = await countActiveRouters(WINDOW_MINUTES * 2, WINDOW_MINUTES);

    console.log(
      `[Monitor] Routers ativos — janela atual: ${currentCount}, janela anterior: ${previousCount}`
    );

    if (previousCount === 0) {
      return;
    }

    const dropFraction = (previousCount - currentCount) / previousCount;

    if (dropFraction >= DROP_THRESHOLD && !alertCooldown) {
      const dropPercent = (dropFraction * 100).toFixed(1);
      const msg =
        `⚠️ **Alerta de Queda de Roteadores**\n` +
        `Queda de **${dropPercent}%** detectada!\n` +
        `Janela anterior (${WINDOW_MINUTES}min): **${previousCount}** routers\n` +
        `Janela atual (${WINDOW_MINUTES}min): **${currentCount}** routers\n` +
        `Horário: ${new Date().toISOString()}`;

      console.warn(`[Monitor] DROP DETECTED: ${dropPercent}% (${previousCount} -> ${currentCount})`);
      await sendDiscordAlert(msg);

      // Cooldown: don't spam alerts for 5 minutes
      alertCooldown = true;
      setTimeout(() => {
        alertCooldown = false;
      }, WINDOW_MINUTES * 60 * 1000);
    } else if (dropFraction < DROP_THRESHOLD && alertCooldown) {
      // Recovery: notify that things are back to normal
      const msg =
        `✅ **Roteadores Recuperados**\n` +
        `Janela atual: **${currentCount}** routers ativos\n` +
        `Horário: ${new Date().toISOString()}`;
      await sendDiscordAlert(msg);
      alertCooldown = false;
    }
  } catch (err: any) {
    console.error(`[Monitor] Check failed: ${err.message}`);
  }
}

// ── Start ──────────────────────────────────────────────────────────────────
console.log(
  `[Monitor] Iniciando — intervalo: ${CHECK_INTERVAL_MS}ms, janela: ${WINDOW_MINUTES}min, threshold: ${(DROP_THRESHOLD * 100).toFixed(0)}%`
);

const intervalId = setInterval(check, CHECK_INTERVAL_MS);
check(); // run immediately on start

// Graceful shutdown
async function shutdown() {
  console.log("[Monitor] Shutting down...");
  clearInterval(intervalId);
  await shutdownDB();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
